#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { link, lstat, mkdir, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROMPT_VERSION,
  SERVICE_VERSION,
  WorkerError,
  WorkerService,
  createProviders,
  implementationFingerprint,
  loadConfig,
  qualificationFingerprint,
} from '../dist/index.js';

const REPOSITORY_ID = 'workflow-fixtures';
const FIXTURE_PREFIX = 'tools/local-agents/fixtures/workflows/snapshots';
const MAX_ARGUMENT_BYTES = 4_096;
const MAX_CASE_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'interrupted']);

function usage() {
  return [
    'Usage: node examples/run-workflow-trial.mjs --config <host.json> --profile-id <id>',
    '       --output <ignored-results.json> --suite <summary|comparison>',
    '       --remote-data-consent <true|false>',
    '',
    'Runs two representative cases and one ambiguity/adversarial case twice, serially.',
    'It uses qualification mode but never modifies qualification state or chooses a replacement.',
  ].join('\n');
}

function parseOptions(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return undefined;
  const known = new Set(['--config', '--profile-id', '--output', '--suite', '--remote-data-consent']);
  const values = new Map();
  if (argv.length % 2 !== 0) {
    throw new WorkerError('invalid_arguments', 'Every workflow trial option requires one value.');
  }
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!known.has(name) || !value || value.startsWith('--') || values.has(name)) {
      throw new WorkerError('invalid_arguments', 'Workflow trial arguments are missing, duplicated, or unsupported.');
    }
    if (Buffer.byteLength(value, 'utf8') > MAX_ARGUMENT_BYTES) {
      throw new WorkerError('input_limit', 'A workflow trial argument exceeds its byte allowance.');
    }
    values.set(name, value);
  }
  for (const required of known) {
    if (!values.has(required)) throw new WorkerError('invalid_arguments', `Supply ${required}.`);
  }
  const suite = values.get('--suite');
  if (!['summary', 'comparison'].includes(suite)) {
    throw new WorkerError('invalid_arguments', '--suite must be summary or comparison.');
  }
  const consent = values.get('--remote-data-consent');
  if (!['true', 'false'].includes(consent)) {
    throw new WorkerError('invalid_arguments', '--remote-data-consent must be explicitly true or false.');
  }
  return {
    config: values.get('--config'),
    profileId: values.get('--profile-id'),
    output: values.get('--output'),
    suite,
    remoteDataConsent: consent === 'true',
  };
}

function assertString(value, name, pattern, maximum = 8_000) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum || (pattern && !pattern.test(value))) {
    throw new WorkerError('invalid_fixture', `Workflow case ${name} is invalid.`);
  }
}

function validateCases(parsed) {
  if (!Array.isArray(parsed) || parsed.length !== 6) {
    throw new WorkerError('invalid_fixture', 'Workflow fixtures must contain exactly six cases.');
  }
  const ids = new Set();
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new WorkerError('invalid_fixture', 'Each workflow case must be an object.');
    }
    const allowed = new Set(['id', 'suite', 'kind', 'instruction', 'paths', 'initialReads', 'requiredItems', 'rubric']);
    if (Object.keys(item).some((key) => !allowed.has(key))) {
      throw new WorkerError('invalid_fixture', 'A workflow case contains an unsupported field.');
    }
    assertString(item.id, 'id', /^[a-z0-9][a-z0-9-]{0,63}$/);
    if (ids.has(item.id)) throw new WorkerError('invalid_fixture', 'Workflow case ids must be unique.');
    ids.add(item.id);
    if (!['summary', 'comparison'].includes(item.suite)
      || !['representative', 'ambiguity-adversarial'].includes(item.kind)) {
      throw new WorkerError('invalid_fixture', `Workflow case ${item.id} has an invalid suite or kind.`);
    }
    assertString(item.instruction, `${item.id} instruction`);
    if (!Array.isArray(item.paths) || item.paths.length < 1 || item.paths.length > 4
      || item.paths.some((value) => typeof value !== 'string' || !value.startsWith(`${FIXTURE_PREFIX}/`))) {
      throw new WorkerError('invalid_fixture', `Workflow case ${item.id} has invalid snapshot paths.`);
    }
    if (!Array.isArray(item.initialReads) || item.initialReads.length < 1 || item.initialReads.length > 8) {
      throw new WorkerError('invalid_fixture', `Workflow case ${item.id} has invalid initial reads.`);
    }
    for (const read of item.initialReads) {
      if (!read || !item.paths.includes(read.path) || !Number.isSafeInteger(read.startLine)
        || !Number.isSafeInteger(read.endLine) || read.startLine < 1 || read.endLine < read.startLine) {
        throw new WorkerError('invalid_fixture', `Workflow case ${item.id} has an initial read outside its snapshot.`);
      }
    }
    if (!Array.isArray(item.requiredItems) || item.requiredItems.length < 1 || item.requiredItems.length > 16) {
      throw new WorkerError('invalid_fixture', `Workflow case ${item.id} has invalid required items.`);
    }
    const requiredIds = new Set();
    for (const required of item.requiredItems) {
      assertString(required?.id, `${item.id} required id`, /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/);
      assertString(required?.question, `${item.id} required question`, undefined, 1_000);
      if (requiredIds.has(required.id)) throw new WorkerError('invalid_fixture', `Workflow case ${item.id} repeats a required id.`);
      requiredIds.add(required.id);
    }
    if (!Array.isArray(item.rubric) || item.rubric.length < 1 || item.rubric.length > 12) {
      throw new WorkerError('invalid_fixture', `Workflow case ${item.id} has an invalid review rubric.`);
    }
    item.rubric.forEach((entry) => assertString(entry, `${item.id} rubric`, undefined, 1_000));
  }
  for (const suite of ['summary', 'comparison']) {
    const selected = parsed.filter((item) => item.suite === suite);
    if (selected.length !== 3 || selected.filter((item) => item.kind === 'representative').length !== 2
      || selected.filter((item) => item.kind === 'ambiguity-adversarial').length !== 1) {
      throw new WorkerError('invalid_fixture', `Workflow suite ${suite} must contain two representative and one ambiguity/adversarial case.`);
    }
  }
  return parsed;
}

async function readCases(packageRoot) {
  const filename = path.join(packageRoot, 'fixtures', 'workflows', 'cases.json');
  const bytes = await readFile(filename);
  if (bytes.length > MAX_CASE_BYTES) throw new WorkerError('input_limit', 'Workflow case definitions exceed their byte allowance.');
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new WorkerError('invalid_fixture', 'Workflow cases are not valid bounded UTF-8 JSON.');
  }
  return { cases: validateCases(parsed), sha256: createHash('sha256').update(bytes).digest('hex') };
}

function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function verifyFixtureScope(packageRoot, repository, cases) {
  const repositoryRoot = await realpath(repository.root).catch(() => {
    throw new WorkerError('invalid_config', 'The workflow fixture repository root is unavailable.');
  });
  const allPaths = [...new Set(cases.flatMap((item) => item.paths))].sort();
  for (const relativePath of allPaths) {
    const suffix = relativePath.slice('tools/local-agents/'.length);
    const configuredPath = path.resolve(repositoryRoot, ...relativePath.split('/'));
    const packagedPath = path.resolve(packageRoot, ...suffix.split('/'));
    if (!contained(repositoryRoot, configuredPath) || !contained(packageRoot, packagedPath)) {
      throw new WorkerError('invalid_fixture', 'A workflow fixture path escapes its registered root.');
    }
    const [configuredStat, packagedStat, configuredBytes, packagedBytes] = await Promise.all([
      lstat(configuredPath), lstat(packagedPath), readFile(configuredPath), readFile(packagedPath),
    ]).catch(() => {
      throw new WorkerError('invalid_fixture', 'A workflow fixture file is unavailable.');
    });
    if (!configuredStat.isFile() || configuredStat.isSymbolicLink()
      || !packagedStat.isFile() || packagedStat.isSymbolicLink() || !configuredBytes.equals(packagedBytes)) {
      throw new WorkerError('invalid_fixture', 'Registered workflow fixtures differ from the packaged fixed snapshots.');
    }
  }
  return { repositoryRoot, allPaths };
}

async function prepareOutput(repositoryRoot, filename) {
  const output = path.resolve(filename);
  const ignoredRoot = path.join(repositoryRoot, '.local');
  const existing = await lstat(ignoredRoot).catch((error) => {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
    throw new WorkerError('invalid_output', 'The ignored .local output root must be a real directory.');
  }
  await mkdir(ignoredRoot, { recursive: true });
  const resolvedIgnoredRoot = await realpath(ignoredRoot);
  if (!contained(resolvedIgnoredRoot, output) || output === resolvedIgnoredRoot) {
    throw new WorkerError('invalid_output', 'Workflow trial output must be a file under the registered checkout .local directory.');
  }
  const parent = path.dirname(output);
  await mkdir(parent, { recursive: true });
  const parentStat = await lstat(parent);
  const resolvedParent = await realpath(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || !contained(resolvedIgnoredRoot, resolvedParent)) {
    throw new WorkerError('invalid_output', 'Workflow trial output parent cannot traverse links outside .local.');
  }
  try {
    await lstat(output);
  } catch (error) {
    if (error?.code === 'ENOENT') return output;
    throw error;
  }
  throw new WorkerError('output_exists', 'Workflow trial output already exists.');
}

async function writeExclusiveJson(filename, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(content, 'utf8') > MAX_OUTPUT_BYTES) {
    throw new WorkerError('output_limit', 'Workflow trial results exceed the output byte allowance.');
  }
  const temporary = path.join(path.dirname(filename), `.${path.basename(filename)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporary, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  try {
    await link(temporary, filename);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    if (error?.code === 'EEXIST') throw new WorkerError('output_exists', 'Workflow trial output already exists.');
    throw error;
  }
  await unlink(temporary);
}

async function waitForTerminal(service, initial) {
  let job = initial;
  while (!TERMINAL_STATES.has(job.state)) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    job = await service.getTask(job.id);
  }
  return job;
}

function safeDiagnostic(error) {
  if (error instanceof WorkerError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      ...(error.stats ? { statistics: error.stats } : {}),
    };
  }
  return { code: 'internal_error', message: 'The workflow trial failed without a safe diagnostic.' };
}

function trialRecord(caseItem, repetition, startedAt, startedMs, job, error, candidateFingerprint) {
  const finishedAt = new Date().toISOString();
  const result = job?.result;
  const statistics = result?.statistics ?? job?.statistics ?? error?.statistics ?? [];
  return {
    caseId: caseItem.id,
    kind: caseItem.kind,
    repetition,
    timing: {
      startedAt,
      finishedAt,
      wallMs: Math.max(0, Math.round(performance.now() - startedMs)),
      ...(job ? { serviceCreatedAt: job.createdAt, serviceUpdatedAt: job.updatedAt } : {}),
    },
    state: job?.state ?? 'start_failed',
    fingerprint: result?.qualificationFingerprint ?? candidateFingerprint,
    answer: result?.answer ?? null,
    error: job?.error ?? error ?? null,
    details: result ? {
      modelId: result.modelId,
      modelIdentity: result.modelIdentity,
      modelProvider: result.modelProvider,
      ...(result.modelDigest ? { modelDigest: result.modelDigest } : {}),
      routing: result.routing,
      sourceReferences: result.sourceReferences ?? [],
      commands: result.commands,
    } : null,
    statistics,
    snapshot: result?.snapshot ?? null,
    ...(job ? {
      job: {
        id: job.id,
        requestKey: job.requestKey,
        progress: job.progress,
      },
    } : {}),
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!options) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const { cases, sha256: caseDefinitionsSha256 } = await readCases(packageRoot);
  const selectedCases = cases.filter((item) => item.suite === options.suite);
  const taskClass = options.suite === 'summary' ? 'summary' : 'research';
  const config = await loadConfig(options.config);
  if (!config.allowQualification) {
    throw new WorkerError('qualification_disabled', 'The selected host config must explicitly allow qualification runs.');
  }
  const repository = config.repositories.find((item) => item.id === REPOSITORY_ID);
  if (!repository) {
    throw new WorkerError('invalid_config', `Host config must register repository id ${REPOSITORY_ID}.`);
  }
  const profile = config.profiles.find((item) => item.id === options.profileId);
  const model = config.models.find((item) => item.id === profile?.modelId);
  if (!profile || !model) throw new WorkerError('invalid_config', 'The selected profile or its model is not registered.');
  if (!profile.taskClasses.includes(taskClass)) {
    throw new WorkerError('unsupported_task_class', `The selected profile must support the ${taskClass} task class for this suite.`);
  }
  if (model.provider === 'openrouter' && !options.remoteDataConsent) {
    throw new WorkerError('remote_consent_required', 'A remote workflow trial requires --remote-data-consent true.');
  }
  if (model.provider === 'openrouter' && !config.openrouter?.allowedRepositories.includes(REPOSITORY_ID)) {
    throw new WorkerError('remote_policy_denied', `Remote host policy must explicitly allow repository id ${REPOSITORY_ID}.`);
  }
  const { repositoryRoot, allPaths } = await verifyFixtureScope(packageRoot, repository, selectedCases);
  const output = await prepareOutput(repositoryRoot, options.output);
  const runtimeFingerprint = await implementationFingerprint();
  const candidateFingerprint = await qualificationFingerprint(config, profile, model, runtimeFingerprint);

  let service;
  let closing;
  const close = () => closing ??= service?.close() ?? Promise.resolve();
  const interrupt = (code) => { void close().finally(() => { process.exitCode = code; }); };
  process.once('SIGINT', () => interrupt(130));
  process.once('SIGTERM', () => interrupt(143));
  try {
    service = await WorkerService.create(config, createProviders(config));
    const trials = [];
    let ordinal = 0;
    for (const caseItem of selectedCases) {
      for (const repetition of [1, 2]) {
        ordinal += 1;
        const startedAt = new Date().toISOString();
        const startedMs = performance.now();
        let job;
        let error;
        try {
          const initial = await service.startTask({
            requestKey: `workflow-${randomUUID()}`,
            repositoryId: REPOSITORY_ID,
            paths: caseItem.paths,
            profileId: profile.id,
            taskClass,
            instruction: caseItem.instruction,
            mode: 'qualification',
            enabledCheckIds: [],
            remoteDataConsent: options.remoteDataConsent,
            requiredItems: caseItem.requiredItems,
            initialReads: caseItem.initialReads,
          });
          job = await waitForTerminal(service, initial);
        } catch (caught) {
          error = safeDiagnostic(caught);
        }
        trials.push(trialRecord(caseItem, repetition, startedAt, startedMs, job, error, candidateFingerprint));
        process.stderr.write(`[${ordinal}/6] ${caseItem.id} #${repetition}: ${job?.state ?? error?.code ?? 'failed'}\n`);
      }
    }
    await writeExclusiveJson(output, {
      version: 1,
      generatedAt: new Date().toISOString(),
      serviceVersion: SERVICE_VERSION,
      promptVersion: PROMPT_VERSION,
      implementationFingerprint: runtimeFingerprint,
      qualificationFingerprint: candidateFingerprint,
      suite: options.suite,
      repetitions: 2,
      remoteDataConsent: options.remoteDataConsent,
      repository: { id: REPOSITORY_ID, paths: allPaths },
      profile: { id: profile.id, modelId: model.id, modelProvider: model.provider, taskClass },
      caseDefinitionsSha256,
      cases: selectedCases.map(({ id, kind, requiredItems, rubric }) => ({ id, kind, requiredItems, rubric })),
      trials,
      automaticQualification: false,
      replacementSelection: null,
    });
    process.stderr.write(`Wrote ${trials.length} workflow trials to ${output}\n`);
    if (trials.some((trial) => trial.state !== 'completed')) process.exitCode = 1;
  } finally {
    await close();
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ error: safeDiagnostic(error) })}\n`);
  process.exitCode = 1;
});
