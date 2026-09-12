import { createHash } from 'node:crypto';
import { constants as fsConstants, type BigIntStats } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { delimiter, isAbsolute, join, resolve, sep } from 'node:path';
import type { Limits, RepositoryConfig, Snapshot, SnapshotFile, TaskRequest } from './types.js';
import { WorkerError } from './types.js';

const execFileAsync = promisify(execFile);
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const DEFAULT_EXCLUDES = [
  '.git', '.codex', '.env', '.local', '.ch4os-tools', '.ssh', '.aws',
  'secrets', 'keys', 'node_modules', 'dist',
  '.local-agents', '.local-agents-data', '.runtime', 'runtime-data',
];
let hostGitCandidates: Promise<string[]> | undefined;

export interface ListedSnapshotFile {
  path: string;
  sha256: string;
  bytes: number;
  lines: number;
}

export interface ListFilesResult { files: ListedSnapshotFile[]; truncated: boolean }
export interface ReadLinesResult {
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  truncated: boolean;
}
export interface SearchMatch { path: string; line: number; text: string }
export interface SearchSnapshotResult { matches: SearchMatch[]; truncated: boolean }

interface FileIdentity {
  dev: bigint;
  ino: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
  mode: number;
  nlink: bigint;
}

interface GitIdentity { head: string | null; dirty: boolean; stateSha256: string }

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw signal.reason ?? new WorkerError('cancelled', 'Snapshot capture was cancelled');
}

function invalidPath(message: string): never {
  throw new WorkerError('invalid_path', message);
}

/** Normalize an untrusted repository-relative path without consulting the filesystem. */
export function normalizeSnapshotPath(input: string): string {
  if (typeof input !== 'string' || input.length === 0 || input.includes('\0')) invalidPath('Paths must be non-empty text');
  if (isAbsolute(input) || input.startsWith('/') || input.startsWith('\\') || /^[A-Za-z]:/.test(input)) {
    invalidPath('Absolute, UNC, and drive-relative paths are forbidden');
  }
  const slash = input.replaceAll('\\', '/');
  if (slash.includes(':')) invalidPath('NTFS alternate data stream paths are forbidden');
  const parts = slash.split('/');
  if (parts.some(part => part.length === 0 && parts.length > 1)) invalidPath('Empty path segments are forbidden');
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') invalidPath('Parent path traversal is forbidden');
    if (/[\x00-\x1f<>"|?*]/.test(part) || /[ .]$/.test(part)) invalidPath('Ambiguous Windows path segments are forbidden');
    if (RESERVED_WINDOWS_NAMES.test(part)) invalidPath('Reserved Windows device names are forbidden');
    normalized.push(part);
  }
  return normalized.join('/');
}

function pathKey(path: string): string { return path.toLocaleLowerCase('en-US'); }
function absoluteWithin(path: string, parent: string): boolean {
  const candidate = pathKey(resolve(path));
  const root = pathKey(resolve(parent));
  return candidate === root || candidate.startsWith(`${root}${pathKey(sep)}`);
}
function isWithin(path: string, parent: string): boolean {
  if (parent === '') return true;
  const p = pathKey(path);
  const root = pathKey(parent);
  return p === root || p.startsWith(`${root}/`);
}
function scopesIntersect(left: string, right: string): boolean {
  return isWithin(left, right) || isWithin(right, left);
}

function identityOf(stat: BigIntStats): FileIdentity {
  return {
    dev: stat.dev, ino: stat.ino, size: stat.size,
    mtimeNs: stat.mtimeNs, ctimeNs: stat.ctimeNs,
    mode: Number(stat.mode), nlink: stat.nlink,
  };
}

function sameIdentity(a: FileIdentity, b: FileIdentity): boolean {
  return a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeNs === b.mtimeNs
    && a.ctimeNs === b.ctimeNs && a.mode === b.mode && a.nlink === b.nlink;
}

function assertRegularUnlinked(stat: BigIntStats, path: string): void {
  if (stat.isSymbolicLink() || !stat.isFile()) throw new WorkerError('unsafe_file', `${path}: only regular files are allowed`);
  if (stat.nlink !== 1n) throw new WorkerError('unsafe_file', `${path}: hard-linked files are not allowed`);
}

function gitEnvironment(): NodeJS.ProcessEnv {
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  return {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    WINDIR: process.env.WINDIR,
    PATHEXT: process.env.PATHEXT,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: nullDevice,
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
    GIT_EXTERNAL_DIFF: '',
  };
}

async function resolveHostGitCandidates(): Promise<string[]> {
  if (hostGitCandidates) return hostGitCandidates;
  hostGitCandidates = (async () => {
    const names = process.platform === 'win32' ? ['git.exe'] : ['git'];
    const directories: string[] = [];
    if (process.platform === 'win32') {
      for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) {
        if (base && isAbsolute(base)) directories.push(join(base, 'Git', 'cmd'), join(base, 'Git', 'bin'));
      }
    } else directories.push('/usr/bin', '/usr/local/bin', '/opt/homebrew/bin');
    for (const entry of (process.env.PATH ?? '').split(delimiter)) {
      const trimmed = entry.trim().replace(/^"|"$/g, '');
      if (trimmed && isAbsolute(trimmed)) directories.push(resolve(trimmed));
    }
    const resolved: string[] = [];
    const seen = new Set<string>();
    for (const directory of directories) {
      for (const name of names) {
        const candidate = resolve(directory, name);
        const key = pathKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          const stat = await lstat(candidate, { bigint: true });
          if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n) continue;
          const canonical = await realpath(candidate);
          if (pathKey(canonical) !== key) continue;
          resolved.push(canonical);
        } catch { /* Candidate is absent or unsafe. */ }
      }
    }
    return resolved;
  })();
  return hostGitCandidates;
}

async function trustedGitExecutable(repositoryRoot: string): Promise<string> {
  const candidate = (await resolveHostGitCandidates()).find(path => !absoluteWithin(path, repositoryRoot));
  if (!candidate) throw new WorkerError('git_unavailable', 'No trusted host Git executable is available outside the repository');
  return candidate;
}

async function runGit(gitExecutable: string, root: string, args: string[], signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const options = {
    cwd: root,
    env: gitEnvironment(),
    encoding: 'utf8' as BufferEncoding,
    timeout: 15_000,
    signal,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  };
  const { stdout } = await execFileAsync(gitExecutable, [
    '--no-optional-locks', '-c', `core.hooksPath=${nullDevice}`, '-c', 'core.fsmonitor=false',
    '-c', 'credential.helper=', '-c', 'diff.external=', ...args,
  ], options);
  throwIfAborted(signal);
  return stdout;
}

async function gitIdentity(gitExecutable: string, root: string, signal?: AbortSignal): Promise<GitIdentity> {
  try {
    const top = (await runGit(gitExecutable, root, ['rev-parse', '--show-toplevel'], signal)).trim();
    if (resolve(top).toLocaleLowerCase('en-US') !== resolve(root).toLocaleLowerCase('en-US')) {
      throw new WorkerError('invalid_repository', 'Configured root must be the Git worktree root');
    }
    const head = (await runGit(gitExecutable, root, ['rev-parse', '--verify', 'HEAD'], signal)).trim().toLowerCase();
    if (!/^[a-f0-9]{40,64}$/.test(head)) throw new WorkerError('invalid_repository', 'Git returned an invalid HEAD');
    const status = await runGit(gitExecutable, root, ['status', '--porcelain=v1', '-z', '--untracked-files=normal', '--no-renames'], signal);
    return { head, dirty: status.length > 0, stateSha256: createHash('sha256').update(status).digest('hex') };
  } catch (error) {
    throwIfAborted(signal);
    if (error instanceof WorkerError) throw error;
    const candidate = error as { code?: string | number; stderr?: string };
    if (candidate.code === 128 || candidate.stderr?.includes('not a git repository')) {
      return { head: null, dirty: false, stateSha256: createHash('sha256').update('').digest('hex') };
    }
    throw new WorkerError('git_unavailable', 'Could not establish repository Git identity');
  }
}

function addOmission(omissions: Set<string>, path: string, reason: string): void {
  omissions.add(`${path || '.'}: ${reason}`);
}

function boundedPush<T>(items: T[], candidate: T, limitBytes: number, result: (values: T[], truncated: boolean) => unknown): boolean {
  const trial = [...items, candidate];
  if (Buffer.byteLength(JSON.stringify(result(trial, true)), 'utf8') > limitBytes) return false;
  items.push(candidate);
  return true;
}

function assertByteLimit(limitBytes: number): void {
  if (!Number.isSafeInteger(limitBytes) || limitBytes < 0) throw new WorkerError('invalid_limit', 'Byte limit must be a non-negative safe integer');
}

function snapshotId(repositoryId: string, git: GitIdentity, effectiveScope: string[], files: SnapshotFile[], omissions: string[]): string {
  const hash = createHash('sha256');
  hash.update('snapshot-v2\0').update(repositoryId).update('\0').update(git.head ?? '').update('\0')
    .update(git.dirty ? '1' : '0').update('\0').update(git.stateSha256);
  for (const scope of effectiveScope) hash.update('\0scope\0').update(scope);
  for (const file of files) {
    hash.update('\0file\0').update(file.path).update('\0').update(file.sha256).update('\0').update(String(Buffer.byteLength(file.text, 'utf8')));
  }
  for (const omission of omissions) hash.update('\0omission\0').update(omission);
  return hash.digest('hex');
}

function effectiveScope(allowed: string[], requested: string[]): string[] {
  const candidates = new Set<string>();
  for (const allow of allowed) {
    for (const request of requested) {
      if (isWithin(request, allow)) candidates.add(pathKey(request));
      else if (isWithin(allow, request)) candidates.add(pathKey(allow));
    }
  }
  const scopes = [...candidates].sort((a, b) => a.length - b.length || a.localeCompare(b, 'en-US'));
  return scopes.filter((scope, index) => !scopes.slice(0, index).some(parent => isWithin(scope, parent)));
}

/** Capture an immutable, bounded, UTF-8-only view of the authorized repository scope. */
export async function captureSnapshot(repository: RepositoryConfig, request: TaskRequest, limits: Limits, signal?: AbortSignal): Promise<Snapshot> {
  throwIfAborted(signal);
  if (repository.id !== request.repositoryId) throw new WorkerError('repository_mismatch', 'Request repository does not match configured repository');
  if (!Number.isSafeInteger(limits.maxFiles) || limits.maxFiles < 1 || !Number.isSafeInteger(limits.maxFileBytes)
      || limits.maxFileBytes < 1 || !Number.isSafeInteger(limits.snapshotBytes) || limits.snapshotBytes < 1) {
    throw new WorkerError('invalid_limit', 'Snapshot limits must be positive safe integers');
  }

  const root = resolve(repository.root);
  const rootStat = await lstat(root, { bigint: true }).catch(() => { throw new WorkerError('invalid_repository', 'Repository root is unavailable'); });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new WorkerError('invalid_repository', 'Repository root must be a real directory');
  const canonicalRoot = await realpath(root);
  if (resolve(canonicalRoot).toLocaleLowerCase('en-US') !== root.toLocaleLowerCase('en-US')) {
    throw new WorkerError('invalid_repository', 'Repository root cannot traverse a link or alias');
  }

  const allowed = repository.allowPaths.map(normalizeSnapshotPath);
  const requested = request.paths.map(normalizeSnapshotPath);
  for (const path of requested) {
    if (!allowed.some(scope => scopesIntersect(path, scope))) {
      throw new WorkerError('scope_denied', `Requested path is outside the configured allowlist: ${path}`);
    }
  }
  const userExcludes = repository.excludes.map(normalizeSnapshotPath);
  const defaultExcludes = DEFAULT_EXCLUDES.map(normalizeSnapshotPath);
  const omissions = new Set<string>();
  const files: SnapshotFile[] = [];
  const seenCase = new Map<string, string>();
  let totalBytes = 0;
  const gitExecutable = await trustedGitExecutable(root);
  const gitBefore = await gitIdentity(gitExecutable, root, signal);
  if (request.expectedHead !== undefined && gitBefore.head !== request.expectedHead.toLowerCase()) {
    throw new WorkerError('head_mismatch', 'Repository HEAD does not match expectedHead');
  }

  const selected = (path: string): boolean => allowed.some(scope => isWithin(path, scope)) && requested.some(scope => isWithin(path, scope));
  const mayContainSelected = (path: string): boolean => allowed.some(scope => scopesIntersect(path, scope)) && requested.some(scope => scopesIntersect(path, scope));
  const excludedBy = (path: string): { kind: 'default' | 'configured'; scope: string } | undefined => {
    for (const scope of defaultExcludes) {
      const excluded = path.split('/').some(part => pathKey(part) === pathKey(scope)
        || (scope === '.env' && pathKey(part).startsWith('.env.')));
      if (isWithin(path, scope) || excluded) return { kind: 'default', scope };
    }
    for (const scope of userExcludes) if (isWithin(path, scope)) return { kind: 'configured', scope };
    return undefined;
  };

  async function visit(directory: string, relativeDirectory: string): Promise<void> {
    throwIfAborted(signal);
    const before = identityOf(await lstat(directory, { bigint: true }));
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en-US'));
    throwIfAborted(signal);
    for (const entry of entries) {
      throwIfAborted(signal);
      const path = normalizeSnapshotPath(relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name);
      if (!mayContainSelected(path) && !selected(path)) continue;
      const collision = seenCase.get(pathKey(path));
      if (collision !== undefined && collision !== path) throw new WorkerError('case_collision', `Case-colliding paths are forbidden: ${collision} and ${path}`);
      seenCase.set(pathKey(path), path);
      const exclusion = excludedBy(path);
      if (exclusion) { addOmission(omissions, path, `excluded (${exclusion.kind}: ${exclusion.scope})`); continue; }
      const absolute = join(root, ...path.split('/'));
      const stat = await lstat(absolute, { bigint: true });
      if (stat.isSymbolicLink() || entry.isSymbolicLink()) { addOmission(omissions, path, 'unsafe filesystem link'); continue; }
      if (stat.isDirectory()) { await visit(absolute, path); continue; }
      if (!selected(path)) continue;
      if (!stat.isFile()) { addOmission(omissions, path, 'not a regular file'); continue; }
      if (stat.nlink !== 1n) { addOmission(omissions, path, 'hard-linked file'); continue; }
      if (stat.size > BigInt(limits.maxFileBytes)) { addOmission(omissions, path, `file exceeds ${limits.maxFileBytes} bytes`); continue; }
      if (files.length >= limits.maxFiles) { addOmission(omissions, path, `snapshot file count exceeds ${limits.maxFiles}`); continue; }
      if (totalBytes + Number(stat.size) > limits.snapshotBytes) { addOmission(omissions, path, `snapshot exceeds ${limits.snapshotBytes} bytes`); continue; }

      const handle = await open(absolute, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
      let bytes: Buffer;
      try {
        throwIfAborted(signal);
        const opened = await handle.stat({ bigint: true });
        assertRegularUnlinked(opened, path);
        if (!sameIdentity(identityOf(stat), identityOf(opened))) throw new WorkerError('snapshot_changed', `${path}: changed before it could be read`);
        bytes = Buffer.alloc(Number(opened.size));
        let offset = 0;
        while (offset < bytes.length) {
          throwIfAborted(signal);
          const { bytesRead } = await handle.read(bytes, offset, Math.min(65_536, bytes.length - offset), offset);
          if (bytesRead === 0) throw new WorkerError('snapshot_changed', `${path}: ended before its recorded size`);
          offset += bytesRead;
        }
        throwIfAborted(signal);
        const afterRead = await handle.stat({ bigint: true });
        if (!sameIdentity(identityOf(opened), identityOf(afterRead))) throw new WorkerError('snapshot_changed', `${path}: changed while it was read`);
      } finally { await handle.close(); }
      const after = await lstat(absolute, { bigint: true });
      if (!sameIdentity(identityOf(stat), identityOf(after))) throw new WorkerError('snapshot_changed', `${path}: changed while snapshotting`);
      if (bytes.includes(0)) { addOmission(omissions, path, 'binary file'); continue; }
      let text: string;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { addOmission(omissions, path, 'invalid UTF-8 or binary file'); continue; }
      files.push({ path, sha256: createHash('sha256').update(bytes).digest('hex'), text });
      totalBytes += bytes.length;
    }
    const after = identityOf(await lstat(directory, { bigint: true }));
    if (!sameIdentity(before, after)) throw new WorkerError('snapshot_changed', `${relativeDirectory || '.'}: directory changed while snapshotting`);
    throwIfAborted(signal);
  }

  await visit(root, '');
  files.sort((a, b) => a.path.localeCompare(b.path, 'en-US'));
  const gitAfter = await gitIdentity(gitExecutable, root, signal);
  if (gitAfter.head !== gitBefore.head || gitAfter.dirty !== gitBefore.dirty || gitAfter.stateSha256 !== gitBefore.stateSha256) {
    throw new WorkerError('snapshot_changed', 'Repository Git identity changed while snapshotting');
  }
  const sortedOmissions = [...omissions].sort();
  const id = snapshotId(repository.id, gitAfter, effectiveScope(allowed, requested), files, sortedOmissions);
  if (request.expectedSnapshotId !== undefined && id !== request.expectedSnapshotId.replace(/^sha256:/, '')) {
    throw new WorkerError('snapshot_mismatch', 'Captured snapshot does not match expectedSnapshotId');
  }
  throwIfAborted(signal);
  return { id, repositoryId: repository.id, head: gitAfter.head, dirty: gitAfter.dirty, files, omissions: sortedOmissions };
}

export function listFiles(snapshot: Snapshot, limitBytes: number): ListFilesResult {
  assertByteLimit(limitBytes);
  const files: ListedSnapshotFile[] = [];
  let truncated = false;
  for (const file of snapshot.files) {
    const item = { path: file.path, sha256: file.sha256, bytes: Buffer.byteLength(file.text, 'utf8'), lines: file.text.length === 0 ? 0 : file.text.split(/\r\n|\r|\n/).length };
    if (!boundedPush(files, item, limitBytes, (values, cut) => ({ files: values, truncated: cut }))) { truncated = true; break; }
  }
  if (!truncated && Buffer.byteLength(JSON.stringify({ files, truncated: false }), 'utf8') > limitBytes) truncated = true;
  return { files, truncated };
}

export function readLines(snapshot: Snapshot, path: string, startLine = 1, endLine = Number.MAX_SAFE_INTEGER, limitBytes = 8192): ReadLinesResult {
  assertByteLimit(limitBytes);
  const normalized = normalizeSnapshotPath(path);
  if (!Number.isSafeInteger(startLine) || startLine < 1 || !Number.isSafeInteger(endLine) || endLine < startLine) {
    throw new WorkerError('invalid_range', 'Line range must be positive and ordered');
  }
  const file = snapshot.files.find(candidate => candidate.path === normalized);
  if (!file) throw new WorkerError('path_not_in_snapshot', 'Path is not available in this snapshot');
  const lines = file.text.split(/\r\n|\r|\n/);
  const actualEnd = Math.min(endLine, lines.length);
  const chosen: string[] = [];
  let truncated = false;
  const empty: ReadLinesResult = { path: normalized, startLine, endLine: startLine - 1, text: '', truncated: true };
  if (Buffer.byteLength(JSON.stringify(empty), 'utf8') > limitBytes) throw new WorkerError('invalid_limit', 'Byte limit is too small for read metadata');
  for (let index = startLine - 1; index < actualEnd; index++) {
    const candidate = [...chosen, lines[index]!].join('\n');
    const candidateResult: ReadLinesResult = { path: normalized, startLine, endLine: index + 1, text: candidate, truncated: false };
    if (Buffer.byteLength(JSON.stringify(candidateResult), 'utf8') > limitBytes) { truncated = true; break; }
    chosen.push(lines[index]!);
  }
  const text = chosen.join('\n');
  const consumed = chosen.length;
  const returnedEnd = consumed === 0 ? startLine - 1 : startLine + consumed - 1;
  if (returnedEnd < actualEnd) truncated = true;
  return { path: normalized, startLine, endLine: returnedEnd, text, truncated };
}

export function searchSnapshot(snapshot: Snapshot, query: string, limitBytes: number): SearchSnapshotResult {
  assertByteLimit(limitBytes);
  if (typeof query !== 'string' || query.length === 0 || Buffer.byteLength(query, 'utf8') > 1024) {
    throw new WorkerError('invalid_query', 'Search query must be between 1 and 1024 UTF-8 bytes');
  }
  const needle = query.toLocaleLowerCase('en-US');
  const matches: SearchMatch[] = [];
  let truncated = false;
  outer: for (const file of snapshot.files) {
    const lines = file.text.split(/\r\n|\r|\n/);
    for (let index = 0; index < lines.length; index++) {
      if (!lines[index]!.toLocaleLowerCase('en-US').includes(needle)) continue;
      const item = { path: file.path, line: index + 1, text: lines[index]! };
      if (!boundedPush(matches, item, limitBytes, (values, cut) => ({ matches: values, truncated: cut }))) { truncated = true; break outer; }
    }
  }
  if (!truncated && Buffer.byteLength(JSON.stringify({ matches, truncated: false }), 'utf8') > limitBytes) truncated = true;
  return { matches, truncated };
}
