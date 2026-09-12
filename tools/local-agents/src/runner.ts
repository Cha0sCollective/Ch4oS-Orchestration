import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { spawn, execFile, type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { promisify } from 'node:util';
import type { CommandReceipt, CommandRunner, HostConfig, Limits, RunnerConfig, Snapshot } from './types.js';
import { WorkerError } from './types.js';
import { normalizeSnapshotPath } from './snapshot.js';

const execFileAsync = promisify(execFile);
const MAX_CONFIG_BYTES = 262_144;
const CANONICAL_WORKSPACE = 'C:/__ch4os_snapshot__';
const CANONICAL_SCRATCH = 'C:/__ch4os_scratch__';

export interface RunnerDependencies {
  spawnProcess?: (executable: string, args: readonly string[], options: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams;
  killProcessTree?: (child: ChildProcessWithoutNullStreams) => Promise<void>;
  now?: () => number;
}

interface QualificationInspection {
  fingerprint: string;
  configTemplate: string;
  resolvedExecutables: Map<string, string>;
}

function digest(bytes: string | Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function normalizeDigest(value: string): string { return value.replace(/^sha256:/, '').toLowerCase(); }
function tomlStringContent(path: string): string { return path.replaceAll('\\', '\\\\').replaceAll('"', '\\"'); }
function pathKey(path: string): string { return path.toLocaleLowerCase('en-US'); }

function boundUtf8(text: string, limitBytes: number): string {
  if (Buffer.byteLength(text, 'utf8') <= limitBytes) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(text.slice(0, middle), 'utf8') <= limitBytes) low = middle;
    else high = middle - 1;
  }
  while (low > 0 && /[\uD800-\uDBFF]/.test(text[low - 1]!)) low--;
  return text.slice(0, low);
}

async function freezeWorkspace(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = join(directory, entry.name);
    await freezeWorkspace(child);
    await chmod(child, 0o500);
  }
  await chmod(directory, 0o500);
}

async function safeRegularFile(path: string, label: string, maxBytes?: number): Promise<Buffer> {
  const before = await lstat(path, { bigint: true }).catch(() => { throw new WorkerError('runner_unavailable', `${label} is unavailable`); });
  if (!before.isFile() || before.isSymbolicLink()) throw new WorkerError('runner_unavailable', `${label} must be a regular file`);
  if (maxBytes !== undefined && before.size > BigInt(maxBytes)) throw new WorkerError('runner_unavailable', `${label} exceeds its size limit`);
  const bytes = await readFile(path);
  const after = await lstat(path, { bigint: true });
  if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
    throw new WorkerError('runner_unavailable', `${label} changed while it was inspected`);
  }
  return bytes;
}

async function hashRegularFile(path: string, label: string): Promise<string> {
  const before = await lstat(path, { bigint: true }).catch(() => { throw new WorkerError('runner_unavailable', `${label} is unavailable`); });
  if (!before.isFile() || before.isSymbolicLink()) throw new WorkerError('runner_unavailable', `${label} must be a regular file`);
  const hash = createHash('sha256');
  try {
    for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  } catch { throw new WorkerError('runner_unavailable', `${label} could not be read`); }
  const after = await lstat(path, { bigint: true });
  if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
    throw new WorkerError('runner_unavailable', `${label} changed while it was hashed`);
  }
  return hash.digest('hex');
}

function sectionBody(template: string, section: string): string | undefined {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|\\n)\\s*\\[${escaped}\\]\\s*(?:\\r?\\n|$)([\\s\\S]*?)(?=\\r?\\n\\s*\\[|$)`, 'i').exec(template);
  return match?.[1];
}

function parseStringAssignment(line: string): { key: string; value: string } | undefined {
  const stripped = line.replace(/\s+#.*$/, '').trim();
  if (!stripped) return undefined;
  const match = /^"([^"\\]+)"\s*=\s*"([^"\\]+)"\s*$/.exec(stripped);
  if (!match) throw new WorkerError('runner_unavailable', 'Permission template contains an unsupported filesystem assignment');
  return { key: match[1]!, value: match[2]! };
}

function validatePermissionTemplate(config: RunnerConfig, template: string): void {
  const filesystemName = `permissions.${config.permissionProfile}.filesystem`;
  const networkName = `permissions.${config.permissionProfile}.network`;
  const allowedSections = new Set([filesystemName.toLowerCase(), networkName.toLowerCase(), 'windows']);
  const seenSections = new Set<string>();
  const topLevel = template.replace(/^\s*\[[^\]\r\n]+\][\s\S]*$/m, '');
  if (topLevel.split(/\r?\n/).some(line => line.replace(/\s+#.*$/, '').trim().length > 0)) {
    throw new WorkerError('runner_unavailable', 'Permission template cannot contain top-level settings');
  }
  for (const match of template.matchAll(/^\s*\[([^\]\r\n]+)\]\s*(?:#.*)?$/gm)) {
    const name = match[1]!.trim().toLowerCase();
    if (!allowedSections.has(name) || seenSections.has(name)) {
      throw new WorkerError('runner_unavailable', 'Permission template contains an unreviewed or duplicate section');
    }
    seenSections.add(name);
  }
  const filesystem = sectionBody(template, filesystemName);
  const network = sectionBody(template, networkName);
  if (filesystem === undefined || network === undefined) {
    throw new WorkerError('runner_unavailable', 'Permission template is missing the configured filesystem or network section');
  }
  const expected = new Map<string, string>([
    [':root', 'deny'], [':minimal', 'read'], ['{{workspace}}', 'read'], ['{{scratch}}', 'write'],
    ...config.recipes.map(recipe => [`{{runtime:${recipe.id}}}`, 'read'] as const),
  ]);
  const seen = new Set<string>();
  for (const line of filesystem.split(/\r?\n/)) {
    const assignment = parseStringAssignment(line);
    if (!assignment) continue;
    const access = expected.get(assignment.key);
    if (access === undefined || assignment.value !== access || seen.has(assignment.key)) {
      throw new WorkerError('runner_unavailable', 'Permission template grants an unreviewed or duplicate filesystem path');
    }
    seen.add(assignment.key);
  }
  if (seen.size !== expected.size) throw new WorkerError('runner_unavailable', 'Permission template does not contain every required scoped path');
  const networkLines = network.split(/\r?\n/).map(line => line.replace(/\s+#.*$/, '').trim()).filter(Boolean);
  if (networkLines.length !== 1 || !/^enabled\s*=\s*false$/i.test(networkLines[0]!)) {
    throw new WorkerError('runner_unavailable', 'Runner permission profile must disable network access');
  }
  const windows = sectionBody(template, 'windows');
  if (windows !== undefined) {
    const windowsLines = windows.split(/\r?\n/).map(line => line.replace(/\s+#.*$/, '').trim()).filter(Boolean);
    if (windowsLines.length !== 1 || !/^sandbox\s*=\s*(?:'elevated'|"elevated")$/i.test(windowsLines[0]!)) {
      throw new WorkerError('runner_unavailable', 'The optional Windows section may only select the elevated sandbox backend');
    }
  }
  const tokens = template.match(/\{\{[^{}]+\}\}/g) ?? [];
  if (tokens.some(token => !expected.has(token))) throw new WorkerError('runner_unavailable', 'Permission template contains an unknown placeholder');
}

function renderPermissionTemplate(config: RunnerConfig, template: string, workspace: string, scratch: string, executables: Map<string, string>): string {
  const grants = new Map<string, string>([[':root', 'deny'], [':minimal', 'read'], [workspace, 'read'], [scratch, 'write']]);
  const canonicalKeys = new Set([...grants.keys()].map(pathKey));
  for (const recipe of config.recipes) {
    const executable = executables.get(recipe.id);
    if (!executable) throw new WorkerError('runner_unavailable', 'Qualified recipe executable is missing');
    if (!canonicalKeys.has(pathKey(executable))) { grants.set(executable, 'read'); canonicalKeys.add(pathKey(executable)); }
  }
  return [
    ...(sectionBody(template, 'windows') === undefined ? [] : ['[windows]', 'sandbox = "elevated"', '']),
    `[permissions.${config.permissionProfile}.filesystem]`,
    ...[...grants].map(([key, access]) => `"${tomlStringContent(key)}" = "${access}"`),
    '', `[permissions.${config.permissionProfile}.network]`, 'enabled = false', '',
  ].join('\n');
}
async function executableVersion(executable: string): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(executable, ['--version'], {
      encoding: 'utf8', timeout: 10_000, windowsHide: true, maxBuffer: 64 * 1024,
      env: { PATH: process.env.PATH, PATHEXT: process.env.PATHEXT, SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR },
    });
    const version = `${stdout}${stderr}`.trim();
    if (!version) throw new Error('empty version');
    return version;
  } catch { throw new WorkerError('runner_unavailable', 'Could not identify the configured Codex executable'); }
}

async function inspectQualification(config: RunnerConfig): Promise<QualificationInspection> {
  if (!isAbsolute(config.codexExecutable) || !isAbsolute(config.configFile)) {
    throw new WorkerError('runner_unavailable', 'Runner executable and config file must be absolute paths');
  }
  const configBytes = await safeRegularFile(config.configFile, 'Runner permission template', MAX_CONFIG_BYTES);
  const configTemplate = new TextDecoder('utf-8', { fatal: true }).decode(configBytes);
  validatePermissionTemplate(config, configTemplate);
  const canonicalCodex = await realpath(config.codexExecutable);
  if (pathKey(canonicalCodex) !== pathKey(resolve(config.codexExecutable))) throw new WorkerError('runner_unavailable', 'Codex executable cannot traverse links');
  const codexSha256 = await hashRegularFile(config.codexExecutable, 'Codex executable');
  const version = await executableVersion(config.codexExecutable);
  const resolvedExecutables = new Map<string, string>();
  const recipes: Array<Record<string, unknown>> = [];
  const ids = new Set<string>();
  for (const recipe of [...config.recipes].sort((a, b) => a.id.localeCompare(b.id, 'en-US'))) {
    if (ids.has(recipe.id)) throw new WorkerError('runner_unavailable', 'Runner contains duplicate recipe ids');
    ids.add(recipe.id);
    if (!isAbsolute(recipe.executable)) throw new WorkerError('runner_unavailable', 'Recipe executables must be absolute paths');
    if (recipe.timeoutMs < 1 || !Number.isSafeInteger(recipe.timeoutMs)) throw new WorkerError('runner_unavailable', 'Recipe timeout is invalid');
    for (const path of recipe.requiredPaths) normalizeSnapshotPath(path);
    for (const arg of recipe.args) {
      const placeholders = arg.match(/\{[^{}]+\}/g) ?? [];
      if (placeholders.some(value => value !== '{workspace}' && value !== '{scratch}')) {
        throw new WorkerError('runner_unavailable', 'Recipe uses an unsupported argument placeholder');
      }
    }
    const executableSha256 = await hashRegularFile(recipe.executable, `Recipe executable ${recipe.id}`);
    const absolute = await realpath(recipe.executable);
    if (pathKey(absolute) !== pathKey(resolve(recipe.executable))) throw new WorkerError('runner_unavailable', 'Recipe executables cannot traverse links');
    resolvedExecutables.set(recipe.id, absolute);
    recipes.push({ id: recipe.id, executable: absolute, executableSha256, args: recipe.args,
      requiredPaths: recipe.requiredPaths.map(normalizeSnapshotPath).sort(), timeoutMs: recipe.timeoutMs });
  }
  const canonicalConfig = renderPermissionTemplate(config, configTemplate, CANONICAL_WORKSPACE, CANONICAL_SCRATCH, resolvedExecutables);
  const proof = {
    format: 'isolated-command-runner-v3', codexVersion: version, codexSha256,
    invocation: { permissionProfile: true, configLayer: true, disableDirectNetwork: true, rejectBaseConfig: true },
    permissionProfile: config.permissionProfile, resolvedPermissionConfigSha256: digest(canonicalConfig), recipes,
  };
  return { fingerprint: digest(JSON.stringify(proof)), configTemplate, resolvedExecutables };
}

/** Compute the exact fingerprint an external qualification must attest. */
export async function runnerQualificationFingerprint(config: RunnerConfig): Promise<string> {
  return (await inspectQualification(config)).fingerprint;
}

async function defaultKillProcessTree(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.pid === undefined) return;
  if (process.platform === 'win32') {
    try {
      const systemRoot = process.env.SystemRoot;
      if (!systemRoot || !isAbsolute(systemRoot)) throw new Error('SystemRoot unavailable');
      const taskkill = join(systemRoot, 'System32', 'taskkill.exe');
      if (pathKey(await realpath(taskkill)) !== pathKey(resolve(taskkill))) throw new Error('Linked taskkill is forbidden');
      await execFileAsync(taskkill, ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, timeout: 10_000 });
    }
    catch { child.kill('SIGKILL'); }
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); }
    catch { child.kill('SIGKILL'); }
  }
}

function makeReceipt(recipeId: string, snapshotId: string, executable: string, args: string[], started: number,
  now: () => number, status: CommandReceipt['status'], output = '', truncated = false, exitCode: number | null = null): CommandReceipt {
  return { id: randomUUID(), checkId: recipeId, snapshotId, executable, args, exitCode, status, output, truncated,
    durationMs: Math.max(0, now() - started) };
}

export class IsolatedCommandRunner implements CommandRunner {
  private readonly config?: RunnerConfig;
  private readonly dataDir: string;
  private readonly spawnProcess: NonNullable<RunnerDependencies['spawnProcess']>;
  private readonly killProcessTree: NonNullable<RunnerDependencies['killProcessTree']>;
  private readonly now: () => number;

  constructor(host: HostConfig, dependencies?: RunnerDependencies);
  constructor(config: RunnerConfig | undefined, dataDir: string, dependencies?: RunnerDependencies);
  constructor(hostOrConfig: HostConfig | RunnerConfig | undefined, dataDirOrDependencies?: string | RunnerDependencies, maybeDependencies: RunnerDependencies = {}) {
    if (hostOrConfig && 'version' in hostOrConfig) {
      this.config = hostOrConfig.runner;
      this.dataDir = hostOrConfig.dataDir;
      const dependencies = typeof dataDirOrDependencies === 'object' ? dataDirOrDependencies : {};
      this.spawnProcess = dependencies.spawnProcess ?? ((executable, args, options) => spawn(executable, args, options));
      this.killProcessTree = dependencies.killProcessTree ?? defaultKillProcessTree;
      this.now = dependencies.now ?? Date.now;
    } else {
      this.config = hostOrConfig;
      if (typeof dataDirOrDependencies !== 'string') throw new WorkerError('invalid_config', 'Runner data directory is required');
      this.dataDir = dataDirOrDependencies;
      this.spawnProcess = maybeDependencies.spawnProcess ?? ((executable, args, options) => spawn(executable, args, options));
      this.killProcessTree = maybeDependencies.killProcessTree ?? defaultKillProcessTree;
      this.now = maybeDependencies.now ?? Date.now;
    }
  }

  async health(): Promise<{ available: boolean; reason?: string; checkIds: string[] }> {
    const checkIds = this.config?.recipes.map(recipe => recipe.id) ?? [];
    if (!this.config) return { available: false, reason: 'Isolated command runner is not configured', checkIds };
    if (!this.config.qualification) return { available: false, reason: 'Runner has no reviewed qualification', checkIds };
    try {
      const inspected = await inspectQualification(this.config);
      if (inspected.fingerprint !== normalizeDigest(this.config.qualification.fingerprint)) {
        return { available: false, reason: 'Runner qualification does not match the installed executables, recipes, and permission config', checkIds };
      }
      const data = await lstat(this.dataDir);
      if (!data.isDirectory() || data.isSymbolicLink()) return { available: false, reason: 'Runner data directory is not a real directory', checkIds };
      if (pathKey(await realpath(this.dataDir)) !== pathKey(resolve(this.dataDir))) {
        return { available: false, reason: 'Runner data directory cannot traverse links', checkIds };
      }
      return { available: true, checkIds };
    } catch (error) {
      return { available: false, reason: error instanceof Error ? error.message : 'Runner qualification failed', checkIds };
    }
  }

  async run(recipeId: string, snapshot: Snapshot, limits: Limits, signal: AbortSignal): Promise<CommandReceipt> {
    const started = this.now();
    const unavailable = (reason: string) => makeReceipt(recipeId, snapshot.id, '', [], started, this.now, 'unavailable', reason);
    if (!this.config || !this.config.qualification) return unavailable('Runner is disabled or unqualified');
    if (!Number.isSafeInteger(limits.toolOutputBytes) || limits.toolOutputBytes < 0
        || !Number.isSafeInteger(limits.checkTimeoutMs) || limits.checkTimeoutMs < 1) return unavailable('Command limits are invalid');
    const recipe = this.config.recipes.find(candidate => candidate.id === recipeId);
    if (!recipe) return unavailable('Requested check is not registered');
    if (signal.aborted) return makeReceipt(recipeId, snapshot.id, recipe.executable, recipe.args, started, this.now, 'cancelled');

    let inspected: QualificationInspection;
    try {
      inspected = await inspectQualification(this.config);
      signal.throwIfAborted();
      if (inspected.fingerprint !== normalizeDigest(this.config.qualification.fingerprint)) return unavailable('Runner qualification fingerprint no longer matches');
    } catch (error) { return unavailable(error instanceof Error ? error.message : 'Runner qualification failed'); }

    const snapshotPaths = new Map<string, string>();
    try {
      for (const file of snapshot.files) {
        signal.throwIfAborted();
        const normalized = normalizeSnapshotPath(file.path);
        if (normalized.split('/').some(part => part.toLowerCase() === '.codex')) throw new WorkerError('invalid_snapshot', 'Command snapshots cannot contain Codex configuration');
        const key = pathKey(normalized);
        if (snapshotPaths.has(key)) throw new WorkerError('invalid_snapshot', 'Snapshot contains colliding paths');
        if (digest(Buffer.from(file.text, 'utf8')) !== normalizeDigest(file.sha256)) throw new WorkerError('invalid_snapshot', 'Snapshot file digest does not match its contents');
        snapshotPaths.set(key, normalized);
      }
      for (const required of recipe.requiredPaths.map(normalizeSnapshotPath)) {
        if (![...snapshotPaths.values()].some(path => path === required || path.startsWith(`${required}/`))) {
          return unavailable(`Required path is missing from snapshot: ${required}`);
        }
      }
    } catch (error) { return unavailable(error instanceof Error ? error.message : 'Snapshot validation failed'); }

    const base = await realpath(this.dataDir).catch(() => undefined);
    if (!base) return unavailable('Runner data directory is unavailable');
    let jobRoot: string | undefined;
    let profileFile: string | undefined;
    try {
      jobRoot = await mkdtemp(join(base, 'isolated-check-'));
      const workspace = join(jobRoot, 'workspace');
      const scratch = join(jobRoot, 'scratch');
      const processHome = join(jobRoot, 'home');
      const codexHome = join(base, 'codex-runner-home');
      await Promise.all([mkdir(workspace), mkdir(scratch), mkdir(processHome), mkdir(codexHome, { recursive: true, mode: 0o700 })]);
      const codexHomeStat = await lstat(codexHome);
      if (!codexHomeStat.isDirectory() || codexHomeStat.isSymbolicLink()
          || pathKey(await realpath(codexHome)) !== pathKey(resolve(codexHome))) {
        throw new WorkerError('runner_unavailable', 'Dedicated Codex runner home is not a real directory');
      }
      const rejectBaseConfig = async () => {
        for (const name of ['config.toml', 'requirements.toml']) {
          const existing = await lstat(join(codexHome, name)).catch(error => {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
            throw error;
          });
          if (existing) throw new WorkerError('runner_unavailable', 'Dedicated runner home contains an unreviewed base configuration');
        }
      };
      await rejectBaseConfig();
      for (const file of snapshot.files) {
        signal.throwIfAborted();
        const path = normalizeSnapshotPath(file.path);
        const destination = join(workspace, ...path.split('/'));
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, file.text, { encoding: 'utf8', flag: 'wx', mode: 0o400 });
        await chmod(destination, 0o400);
      }
      const generatedConfig = renderPermissionTemplate(this.config, inspected.configTemplate, workspace, scratch, inspected.resolvedExecutables);
      const configLayer = `isolated-${randomUUID()}`;
      profileFile = join(codexHome, `${configLayer}.config.toml`);
      await writeFile(profileFile, generatedConfig, { encoding: 'utf8', flag: 'wx', mode: 0o400 });
      await freezeWorkspace(workspace);
      const expandedArgs = recipe.args.map(arg => arg.replaceAll('{workspace}', workspace).replaceAll('{scratch}', scratch));
      const codexArgs = ['sandbox', '-p', configLayer, '-P', this.config.permissionProfile, '-C', workspace,
        '--sandbox-state-disable-network', '--', recipe.executable, ...expandedArgs];
      const processEnv: NodeJS.ProcessEnv = {
        CODEX_HOME: codexHome,
        HOME: processHome,
        USERPROFILE: processHome,
        TEMP: scratch,
        TMP: scratch,
        PATH: process.env.PATH,
        PATHEXT: process.env.PATHEXT,
        SystemRoot: process.env.SystemRoot,
        WINDIR: process.env.WINDIR,
      };
      await rejectBaseConfig();
      signal.throwIfAborted();
      const child = this.spawnProcess(this.config.codexExecutable, codexArgs, {
        cwd: workspace, env: processEnv, windowsHide: true, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'],
      });
      child.stdin.end();
      const output: Buffer[] = [];
      let outputBytes = 0;
      let truncated = false;
      const append = (chunk: Buffer | string): void => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const remaining = Math.max(0, limits.toolOutputBytes - outputBytes);
        if (bytes.length > remaining) truncated = true;
        if (remaining > 0) { output.push(bytes.subarray(0, remaining)); outputBytes += Math.min(bytes.length, remaining); }
      };
      child.stdout.on('data', append);
      child.stderr.on('data', append);
      let stop: 'timed_out' | 'cancelled' | undefined;
      let killing: Promise<void> | undefined;
      const kill = (reason: 'timed_out' | 'cancelled'): void => {
        if (stop) return;
        stop = reason;
        killing = this.killProcessTree(child).catch(() => { child.kill('SIGKILL'); });
      };
      const timeoutMs = Math.min(recipe.timeoutMs, limits.checkTimeoutMs);
      const timer = setTimeout(() => kill('timed_out'), timeoutMs);
      const abort = () => kill('cancelled');
      const completion = new Promise<{ code: number | null; error?: Error }>(resolveResult => {
        let settled = false;
        const finish = (value: { code: number | null; error?: Error }) => { if (!settled) { settled = true; resolveResult(value); } };
        child.once('error', error => finish({ code: null, error }));
        child.once('close', code => finish({ code }));
      });
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      const result = await completion;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      await killing;
      const decoded = boundUtf8(new TextDecoder('utf-8').decode(Buffer.concat(output)), limits.toolOutputBytes);
      if (result.error && !stop) return makeReceipt(recipeId, snapshot.id, recipe.executable, expandedArgs, started, this.now, 'unavailable', decoded || 'Could not start isolated check', truncated);
      const status: CommandReceipt['status'] = stop ?? (result.code === 0 ? 'passed' : 'failed');
      return makeReceipt(recipeId, snapshot.id, recipe.executable, expandedArgs, started, this.now, status, decoded, truncated, result.code);
    } catch (error) {
      return unavailable(error instanceof Error ? error.message : 'Could not prepare isolated check');
    } finally {
      let cleanupFailed = false;
      if (profileFile) await rm(profileFile, { force: true }).catch(() => { cleanupFailed = true; });
      if (jobRoot) {
        const root = resolve(jobRoot);
        const prefix = resolve(base) + sep;
        if (pathKey(root).startsWith(pathKey(prefix))) await rm(root, { recursive: true, force: true, maxRetries: 2 }).catch(() => { cleanupFailed = true; });
        else cleanupFailed = true;
      }
      if (cleanupFailed) throw new WorkerError('runner_cleanup_failed', 'Isolated command cleanup failed; no successful receipt can be accepted');
    }
  }
}
