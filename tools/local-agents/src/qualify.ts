#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { cpus, totalmem } from 'node:os';
import { link, lstat, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { loadConfig, implementationFingerprint } from './config.js';
import { createProviders } from './providers.js';
import { WorkerService } from './service.js';
import { normalizeSnapshotPath } from './snapshot.js';
import {
  SERVICE_VERSION, PROMPT_VERSION, TASK_CLASSES, WorkerError,
  type HostConfig, type Job, type Profile, type TaskClass,
} from './types.js';

const MAX_ARGUMENT_BYTES = 4_096;
const MAX_CASE_FILE_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const DEFAULT_FIXTURE_PREFIX = 'tools/local-agents/fixtures/qualification';
const FIXTURE_FILES = ['engine.js', 'notes.md', 'failure.txt'] as const;

const caseSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  taskClass: z.enum(TASK_CLASSES),
  instruction: z.string().min(1).max(8_000),
  expected: z.string().min(1).max(4_000),
}).strict();

interface QualificationCase {
  id: string;
  taskClass: TaskClass;
  instruction: string;
  expected: string;
}

interface Options {
  config: string;
  output: string;
  caseId?: string;
  repositoryId?: string;
  fixturePrefix: string;
  profileId?: string;
  remoteDataConsent: boolean;
}

interface TrialRecord {
  jobId: string;
  durationMs: number;
  caseId: string;
  repetition: 1 | 2;
  taskClass: TaskClass;
  profileId: string;
  state: Job['state'];
  errorCode?: string;
  answer?: NonNullable<Job['result']>['answer'];
  statistics?: NonNullable<Job['result']>['statistics'];
  model?: {
    id: string;
    identity: string;
    provider: string;
    digest?: string;
    qualificationFingerprint: string;
  };
  snapshot?: {
    id: string;
    files: { path: string; sha256: string }[];
  };
}

function usage(): string {
  return [
    'Usage: node dist/qualify.js --config <host.json> --output <results.json>',
    '       [--repository-id <id>] [--fixture-prefix <relative/path>] [--case <case-id>]',
    '       [--profile-id <id>] [--remote-data-consent true]',
    '',
    'Runs each selected synthetic case twice, serially. It never qualifies a profile automatically.',
  ].join('\n');
}

function parseOptions(argv: string[]): Options | undefined {
  if (argv.includes('--help') || argv.includes('-h')) return undefined;
  const known = new Set(['--config', '--output', '--case', '--repository-id', '--fixture-prefix', '--profile-id', '--remote-data-consent']);
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name || !known.has(name) || !value || value.startsWith('--') || values.has(name)) {
      throw new WorkerError('invalid_arguments', 'Qualification arguments are missing, duplicated, or unsupported.');
    }
    if (Buffer.byteLength(value, 'utf8') > MAX_ARGUMENT_BYTES) {
      throw new WorkerError('input_limit', 'A qualification argument exceeds its byte allowance.');
    }
    values.set(name, value);
  }
  if (!values.get('--config') || !values.get('--output')) {
    throw new WorkerError('invalid_arguments', 'Supply both --config and --output.');
  }
  if (values.has('--remote-data-consent') && values.get('--remote-data-consent') !== 'true')
    throw new WorkerError('invalid_arguments', 'Remote data consent must be explicitly true or omitted');
  return {
    config: values.get('--config')!, output: values.get('--output')!,
    caseId: values.get('--case'), repositoryId: values.get('--repository-id'),
    fixturePrefix: values.get('--fixture-prefix') ?? DEFAULT_FIXTURE_PREFIX,
    profileId: values.get('--profile-id'), remoteDataConsent: values.get('--remote-data-consent') === 'true',
  };
}

function selectRepository(config: HostConfig, repositoryId?: string): HostConfig['repositories'][number] {
  if (repositoryId) {
    const selected = config.repositories.find((repository) => repository.id === repositoryId);
    if (!selected) throw new WorkerError('invalid_config', 'The selected qualification repository is not registered.');
    return selected;
  }
  if (config.repositories.length !== 1) {
    throw new WorkerError('invalid_arguments', 'Select --repository-id when more than one repository is configured.');
  }
  return config.repositories[0]!;
}

function selectProfile(config: HostConfig, taskClass: TaskClass, profileId?: string): Profile {
  const profiles = config.profiles.filter((profile) => profile.taskClasses.includes(taskClass) && (!profileId || profile.id === profileId));
  if (profiles.length !== 1) {
    throw new WorkerError('invalid_config', `Qualification requires exactly one profile for task class ${taskClass}.`);
  }
  return profiles[0]!;
}

async function readCases(packageRoot: string): Promise<QualificationCase[]> {
  const filename = path.join(packageRoot, 'fixtures', 'qualification', 'cases.json');
  const bytes = await readFile(filename);
  if (bytes.length > MAX_CASE_FILE_BYTES) throw new WorkerError('input_limit', 'Qualification cases exceed their byte allowance.');
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new WorkerError('invalid_fixture', 'Qualification cases are not valid bounded UTF-8 JSON.'); }
  const cases = z.array(caseSchema).length(18).parse(parsed) as QualificationCase[];
  if (new Set(cases.map((item) => item.id)).size !== cases.length) {
    throw new WorkerError('invalid_fixture', 'Qualification case ids must be unique.');
  }
  return cases;
}

async function verifyFixtureScope(
  packageRoot: string,
  repositoryRoot: string,
  fixturePrefix: string,
): Promise<string[]> {
  const prefix = normalizeSnapshotPath(fixturePrefix);
  if (!prefix) throw new WorkerError('invalid_arguments', 'The fixture prefix must be a non-empty repository-relative path.');
  const packageFixture = path.join(packageRoot, 'fixtures', 'qualification');
  const paths: string[] = [];
  for (const filename of FIXTURE_FILES) {
    const relative = `${prefix}/${filename}`;
    const configuredFile = path.resolve(repositoryRoot, ...relative.split('/'));
    const packagedFile = path.resolve(packageFixture, filename);
    const [configuredStat, packagedStat, configuredBytes, packagedBytes] = await Promise.all([
      lstat(configuredFile), lstat(packagedFile), readFile(configuredFile), readFile(packagedFile),
    ]).catch(() => { throw new WorkerError('invalid_fixture', 'The three qualification fixture files must be available locally.'); });
    if (!configuredStat.isFile() || configuredStat.isSymbolicLink() || !packagedStat.isFile() || packagedStat.isSymbolicLink()) {
      throw new WorkerError('invalid_fixture', 'Qualification fixtures must be regular local files without link traversal.');
    }
    if (!configuredBytes.equals(packagedBytes)) {
      throw new WorkerError('invalid_fixture', 'Configured qualification fixtures differ from the packaged synthetic fixtures.');
    }
    paths.push(relative);
  }
  return paths;
}

async function waitForTerminal(service: WorkerService, initial: Job): Promise<Job> {
  let job = initial;
  while (job.state === 'queued' || job.state === 'running') {
    await new Promise((resolve) => setTimeout(resolve, 200));
    job = await service.getTask(job.id);
  }
  return job;
}

function trialFromJob(caseItem: QualificationCase, repetition: 1 | 2, profile: Profile, job: Job): TrialRecord {
  const result = job.result;
  return {
    jobId: job.id,
    durationMs: Math.max(0, Date.parse(job.updatedAt) - Date.parse(job.createdAt)),
    caseId: caseItem.id,
    repetition,
    taskClass: caseItem.taskClass,
    profileId: profile.id,
    state: job.state,
    ...(job.error ? { errorCode: job.error.code } : {}),
    ...(result ? {
      answer: result.answer,
      statistics: result.statistics,
      model: {
        id: result.modelId,
        digest: result.modelDigest,
        identity: result.modelIdentity,
        provider: result.modelProvider,
        qualificationFingerprint: result.qualificationFingerprint,
      },
      snapshot: {
        id: result.snapshot.id,
        files: result.snapshot.files.map((file) => ({ path: file.path, sha256: file.sha256 })),
      },
    } : {}),
  };
}

async function writeExclusiveJson(filename: string, value: unknown): Promise<void> {
  const absolute = path.resolve(filename);
  const parent = path.dirname(absolute);
  const parentStat = await lstat(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || path.resolve(await realpath(parent)) !== path.resolve(parent)) {
    throw new WorkerError('invalid_output', 'The output parent must be an existing local directory without link traversal.');
  }
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(content, 'utf8') > MAX_OUTPUT_BYTES) {
    throw new WorkerError('output_limit', 'Qualification results exceed the output byte allowance.');
  }
  const temporary = path.join(parent, `.${path.basename(absolute)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporary, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  try {
    await link(temporary, absolute);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new WorkerError('output_exists', 'The qualification output file already exists.');
    }
    throw error;
  }
  await unlink(temporary);
}

async function validateOutputTarget(filename: string): Promise<void> {
  const absolute = path.resolve(filename);
  const parent = path.dirname(absolute);
  const parentStat = await lstat(parent).catch(() => { throw new WorkerError('invalid_output', 'The output parent directory does not exist.'); });
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || path.resolve(await realpath(parent)) !== path.resolve(parent)) {
    throw new WorkerError('invalid_output', 'The output parent must be an existing local directory without link traversal.');
  }
  try {
    await lstat(absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  throw new WorkerError('output_exists', 'The qualification output file already exists.');
}

function safeDiagnostic(error: unknown): { code: string; message: string } {
  if (error instanceof WorkerError) return { code: error.code, message: error.message };
  return { code: 'internal_error', message: 'The qualification driver failed without a safe diagnostic.' };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (!options) { process.stdout.write(`${usage()}\n`); return; }
  const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const cases = await readCases(packageRoot);
  let selectedCases = options.caseId ? cases.filter((item) => item.id === options.caseId) : cases;
  if (selectedCases.length === 0) throw new WorkerError('invalid_arguments', 'The selected qualification case does not exist.');
  const config = await loadConfig(options.config);
  if (options.profileId) {
    const profile = config.profiles.find(candidate => candidate.id === options.profileId);
    if (!profile) throw new WorkerError('invalid_arguments', 'The selected profile is not registered');
    selectedCases = selectedCases.filter(item => profile.taskClasses.includes(item.taskClass));
    if (!selectedCases.length) throw new WorkerError('invalid_arguments', 'The selected profile does not support these cases');
  }
  if (!config.allowQualification) throw new WorkerError('qualification_disabled', 'Host qualification must be explicitly enabled.');
  const repository = selectRepository(config, options.repositoryId);
  const fixturePaths = await verifyFixtureScope(packageRoot, repository.root, options.fixturePrefix);
  const output = path.resolve(options.output);
  const fixtureRoot = path.resolve(repository.root, ...normalizeSnapshotPath(options.fixturePrefix).split('/'));
  if (output === fixtureRoot || output.startsWith(`${fixtureRoot}${path.sep}`)) {
    throw new WorkerError('invalid_output', 'Qualification output must be outside the synthetic fixture directory.');
  }
  await validateOutputTarget(output);

  let service: WorkerService | undefined;
  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => closing ??= service?.close() ?? Promise.resolve();
  const interrupt = (exitCode: number) => { void close().finally(() => { process.exitCode = exitCode; }); };
  process.once('SIGINT', () => interrupt(130));
  process.once('SIGTERM', () => interrupt(143));
  try {
    service = await WorkerService.create(config, createProviders(config));
    const trials: TrialRecord[] = [];
    const total = selectedCases.length * 2;
    let current = 0;
    for (const caseItem of selectedCases) {
      const profile = selectProfile(config, caseItem.taskClass, options.profileId);
      for (const repetition of [1, 2] as const) {
        current += 1;
        const started = await service.startTask({
          requestKey: `qual-${caseItem.id}-${repetition}-${randomUUID()}`,
          repositoryId: repository.id,
          paths: fixturePaths,
          profileId: profile.id,
          taskClass: caseItem.taskClass,
          instruction: caseItem.instruction,
          mode: 'qualification',
          enabledCheckIds: [],
          remoteDataConsent: options.remoteDataConsent,
        });
        const job = await waitForTerminal(service, started);
        trials.push(trialFromJob(caseItem, repetition, profile, job));
        process.stderr.write(`[${current}/${total}] ${caseItem.id} #${repetition}: ${job.state}${job.result ? `/${job.result.answer.outcome}` : ''}\n`);
      }
    }
    await writeExclusiveJson(output, {
      version: 1,
      generatedAt: new Date().toISOString(),
      serviceVersion: SERVICE_VERSION,
      promptVersion: PROMPT_VERSION,
      implementationFingerprint: await implementationFingerprint(),
      inferencePolicy: config.inferencePolicy,
      openrouterPolicy: config.openrouter ? {
        maxCostUsd: config.openrouter.maxCostUsd,
        dataCollection: config.openrouter.dataCollection,
        allowSuppliedSources: config.openrouter.allowSuppliedSources,
        allowedRepositories: [...config.openrouter.allowedRepositories].sort(),
      } : null,
      repositoryId: repository.id,
      fixturePaths,
      repetitions: 2,
      remoteDataConsent: options.remoteDataConsent,
      limits: config.limits,
      models: config.models,
      profiles: config.profiles.map(({qualification: _qualification, ...profile}) => profile),
      runtime: { node: process.version, platform: process.platform, arch: process.arch,
        cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem() },
      suite: { cases: selectedCases, sha256: createHash('sha256').update(JSON.stringify(cases)).digest('hex') },
      trials,
    });
    process.stderr.write(`Wrote ${trials.length} synthetic qualification trials to ${output}\n`);
  } finally {
    await close();
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ error: safeDiagnostic(error) })}\n`);
  process.exitCode = 1;
});
