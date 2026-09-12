import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hostConfigSchema } from '../config.js';
import { qualificationFingerprint, WorkerService } from '../service.js';
import {
  DEFAULT_LIMITS, WorkerError,
  type CommandReceipt, type CommandRunner, type GenerateRequest, type HostConfig,
  type Job, type Limits, type ModelProvider, type ProviderStats, type RegisteredModel, type TaskRequest,
} from '../types.js';

const DIGEST = 'a'.repeat(64);
const CATALOG_FINGERPRINT = 'e'.repeat(64);

class ScriptedProvider implements ModelProvider {
  readonly id = 'ollama';
  readonly locality = 'local';
  calls = 0;
  verifiedLimits: Limits[] = [];
  constructor(private readonly script: (request: GenerateRequest, call: number) => Promise<string>) {}
  async verify(_model: RegisteredModel, limits: Limits): Promise<{ available: boolean }> {
    this.verifiedLimits.push(structuredClone(limits));
    return { available: true };
  }
  async generate(request: GenerateRequest): Promise<{ content: string; stats: { promptTokens: number; outputTokens: number } }> {
    this.calls += 1;
    return { content: await this.script(request, this.calls), stats: { promptTokens: 10, outputTokens: 4 } };
  }
}

class RemoteScriptedProvider implements ModelProvider {
  readonly id = 'openrouter';
  readonly locality = 'remote';
  calls = 0;
  verifyCalls = 0;
  verifiedLimits: Limits[] = [];
  constructor(
    private readonly script: (request: GenerateRequest, call: number) => Promise<string>,
    private readonly stats: ProviderStats = {
      promptTokens: 10, outputTokens: 4, costUsd: 0,
      generationId: 'generation-1', endpointId: 'endpoint-1', providerName: 'Test Provider',
    },
  ) {}
  async verify(_model: RegisteredModel, limits: Limits): Promise<{ available: boolean }> {
    this.verifyCalls += 1;
    this.verifiedLimits.push(structuredClone(limits));
    return { available: true };
  }
  async generate(request: GenerateRequest): Promise<{ content: string; stats: ProviderStats }> {
    this.calls += 1;
    return { content: await this.script(request, this.calls), stats: { ...this.stats } };
  }
}

async function fixture(provider: ModelProvider, queueLimit = 4, runner?: CommandRunner, taskTimeoutMs = 5_000): Promise<{
  service: WorkerService; config: HostConfig; request: TaskRequest; root: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'local-agents-service-'));
  const repository = path.join(root, 'repository');
  await mkdir(repository);
  await writeFile(path.join(repository, 'sample.txt'), 'alpha\nbeta\ngamma\n', 'utf8');
  const config: HostConfig = {
    version: 1,
    inferencePolicy: 'local-only',
    dataDir: path.join(root, 'data'),
    leaseDir: path.join(root, 'lease'),
    ollamaUrl: 'http://127.0.0.1:11434',
    allowQualification: true,
    queueLimit,
    repositories: [{ id: 'repo', root: repository, allowPaths: ['sample.txt'], excludes: [] }],
    models: [{
      id: 'model', provider: 'ollama', model: 'test', digest: DIGEST, quantization: 'Q4', think: false,
      temperature: 0,
      contextProof: {
        ollamaVersion: 'test', digest: DIGEST, contextTokens: 8192, outputTokens: 2048,
        singleOverflowRejected: true, historyOverflowRejected: true, verifiedAt: new Date().toISOString(),
      },
    }],
    profiles: [{ id: 'profile', modelId: 'model', taskClasses: ['exploration'], instruction: 'Inspect carefully.' }],
    limits: { ...DEFAULT_LIMITS, inputBytes: 65_536, taskTimeoutMs },
    ...(runner ? {
      runner: {
        codexExecutable: process.execPath, permissionProfile: 'readonly', configFile: path.join(root, 'runner.json'),
        recipes: [{ id: 'unit', executable: process.execPath, args: [], requiredPaths: [], timeoutMs: 1_000 }],
      },
    } : {}),
  };
  if (config.runner) {
    config.runner.qualification = {
      fingerprint: 'c'.repeat(64), evidence: 'test', verifiedAt: new Date().toISOString(),
    };
  }
  const profile = config.profiles[0]!;
  profile.qualification = {
    fingerprint: await qualificationFingerprint(config, profile, config.models[0]!),
    taskClasses: ['exploration'], evidence: ['test'],
  };
  const service = await WorkerService.create(config, provider, runner);
  const request: TaskRequest = {
    requestKey: 'request-1', repositoryId: 'repo', paths: ['sample.txt'], profileId: 'profile',
    taskClass: 'exploration', instruction: 'Find beta.', mode: 'work', enabledCheckIds: [],
  };
  return { service, config, request, root };
}

async function configureRemote(
  config: HostConfig,
  expiresAt = new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
  contextTokens = 8192,
): Promise<RegisteredModel> {
  const model: RegisteredModel = {
    id: 'remote-model', provider: 'openrouter', model: 'test/model:free', endpointId: 'endpoint-1',
    providerSlug: 'test-provider', providerName: 'Test Provider', catalogFingerprint: CATALOG_FINGERPRINT,
    outputMode: 'json-schema', temperature: 0, contextTokens,
  };
  config.inferencePolicy = 'approved-free-providers';
  config.openrouter = {
    apiKeyEnv: 'TEST_OPENROUTER_KEY', maxCostUsd: 0, allowedRepositories: ['repo'],
    allowSuppliedSources: false, dataCollection: 'deny',
  };
  config.models = [model];
  config.profiles[0]!.modelId = model.id;
  config.profiles[0]!.qualification = {
    fingerprint: await qualificationFingerprint(config, config.profiles[0]!, model),
    taskClasses: ['exploration'], evidence: ['test'], expiresAt,
  };
  return model;
}

async function waitForTerminal(service: WorkerService, id: string): Promise<Job> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const job = await service.getTask(id);
    if (['completed', 'failed', 'cancelled', 'timed_out', 'interrupted'].includes(job.state)) return job;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('job did not finish');
}

test('runs an evidence-backed structured inspection to completion', async () => {
  const provider = new ScriptedProvider(async (generateRequest, call) => {
    if (call === 1) return JSON.stringify({ action: 'read', path: 'sample.txt', startLine: 2, endLine: 2 });
    const observationEnvelope = JSON.parse(generateRequest.messages.at(-1)!.content) as { observation: string };
    const observation = JSON.parse(observationEnvelope.observation) as { startLine: number; endLine: number; text: string };
    assert.equal(observation.startLine, 2);
    assert.equal(observation.endLine, 2);
    assert.equal(observation.text, 'L2: beta');
    return JSON.stringify({
      action: 'finish', answer: {
        outcome: 'answered', summary: 'Found beta.',
        findings: [{ text: 'The second line is beta.', evidence: [{ path: 'sample.txt', startLine: 2, endLine: 2 }] }],
        limitations: [], proposals: [],
      },
    });
  });
  const { service, request, root } = await fixture(provider);
  try {
    const started = await service.startTask(request);
    const job = await waitForTerminal(service, started.id);
    assert.equal(job.state, 'completed');
    assert.equal(job.result?.answer.outcome, 'answered');
    assert.equal(job.result?.snapshot.files[0] && 'text' in job.result.snapshot.files[0], false);
    assert.equal(job.result?.statistics.length, 2);
    const feedbackEvidence = 'z'.repeat(1_000);
    await service.recordFeedback({
      jobId: job.id, verdict: 'accepted', evidence: [feedbackEvidence], correctionCount: 0, verificationMs: 12,
    });
    let metrics = '';
    for (let attempt = 0; attempt < 100 && !metrics.includes('"inputBytes"'); attempt += 1) {
      metrics = await readFile(path.join(root, 'data', 'metrics.jsonl'), 'utf8');
      if (!metrics.includes('"inputBytes"')) await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.match(metrics, /"modelId":"model"/);
    assert.match(metrics, /"profileId":"profile"/);
    assert.match(metrics, /"taskClass":"exploration"/);
    assert.match(metrics, /"inputBytes":\d+/);
    const feedbackMetric = metrics.split('\n').filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((metric) => metric.event === 'feedback');
    assert.equal(feedbackMetric?.snapshotId, job.result?.snapshot.id);
    assert.equal(feedbackMetric?.profileId, 'profile');
    assert.match(String(feedbackMetric?.runtimeFingerprint), /^[a-f0-9]{64}$/);
    assert.doesNotMatch(metrics, /Find beta|alpha|gamma|z{100}/);
  } finally { await service.close(); }
});

test('exposes supplied documents as immutable virtual files with cited provenance', async () => {
  const sourceText = 'External evidence lives here.';
  let virtualPath = '';
  const provider = new ScriptedProvider(async (request, call) => {
    if (call === 1) {
      assert.doesNotMatch(request.messages[1]!.content, new RegExp(sourceText));
      const prompt = JSON.parse(request.messages[1]!.content) as {
        providedSources: { path: string; url: string; retrievedAt: string; sha256: string }[];
      };
      assert.equal(prompt.providedSources.length, 1);
      virtualPath = prompt.providedSources[0]!.path;
      return JSON.stringify({ action: 'read', path: virtualPath, startLine: 1, endLine: 4 });
    }
    return JSON.stringify({
      action: 'finish', answer: {
        outcome: 'answered', summary: 'The provided source contains external evidence.',
        findings: [{ text: 'External evidence is present.', evidence: [{ path: virtualPath, startLine: 4, endLine: 4 }] }],
        limitations: [], proposals: [],
      },
    });
  });
  const { service, request, config } = await fixture(provider);
  const source = { url: 'https://example.test/evidence', retrievedAt: '2026-09-12T12:00:00.000Z', text: sourceText };
  try {
    const job = await waitForTerminal(service, (await service.startTask({ ...request, sources: [source] })).id);
    assert.equal(job.state, 'completed');
    assert.equal(job.result?.answer.outcome, 'answered');
    assert.equal(job.result?.sourceReferences?.[0]?.path, '__provided_sources__/source-1.txt');
    assert.equal(job.result?.sourceReferences?.[0]?.url, source.url);
    const virtual = job.result?.snapshot.files.find((file) => file.path === '__provided_sources__/source-1.txt');
    assert.equal(virtual?.sha256, job.result?.sourceReferences?.[0]?.sha256);

    await mkdir(path.join(config.repositories[0]!.root, '__provided_sources__'));
    const callsBeforeCollision = provider.calls;
    const collision = await waitForTerminal(service, (await service.startTask({
      ...request, requestKey: 'source-collision', sources: [source],
    })).id);
    assert.equal(collision.state, 'failed');
    assert.equal(collision.error?.code, 'source_namespace_collision');
    assert.equal(provider.calls, callsBeforeCollision);
  } finally { await service.close(); }
});

test('rejects proposals that target supplied document virtual files', async () => {
  let virtualPath = '';
  let virtualSha = '';
  const provider = new ScriptedProvider(async (request, call) => {
    if (call === 1) {
      const prompt = JSON.parse(request.messages[1]!.content) as {
        providedSources: { path: string; sha256: string }[];
      };
      virtualPath = prompt.providedSources[0]!.path;
      virtualSha = prompt.providedSources[0]!.sha256;
      return JSON.stringify({ action: 'read', path: virtualPath, startLine: 1, endLine: 4 });
    }
    return JSON.stringify({
      action: 'finish', answer: {
        outcome: 'answered', summary: 'Proposed editing supplied material.', findings: [], limitations: [],
        proposals: [{
          path: virtualPath, originalSha256: virtualSha,
          unifiedDiff: `--- a/${virtualPath}\n+++ b/${virtualPath}\n@@ -4,1 +4,1 @@\n-old\n+new`,
        }],
      },
    });
  });
  const { service, request } = await fixture(provider);
  try {
    const job = await waitForTerminal(service, (await service.startTask({
      ...request,
      sources: [{ url: 'https://example.test/source', retrievedAt: '2026-09-12T12:00:00.000Z', text: 'old' }],
    })).id);
    assert.equal(job.state, 'completed');
    assert.equal(job.result?.answer.outcome, 'needs_codex');
    assert.match(job.result?.answer.limitations[0] ?? '', /cannot target provided source/i);
  } finally { await service.close(); }
});

test('deduplicates requests, bounds the queue, and waits for generation to stop on cancellation', async () => {
  let generationStopped = false;
  const provider = new ScriptedProvider((request) => new Promise<string>((_resolve, reject) => {
    request.signal.addEventListener('abort', () => {
      generationStopped = true;
      reject(request.signal.reason);
    }, { once: true });
  }));
  const { service, request } = await fixture(provider, 1);
  try {
    const first = await service.startTask(request);
    const duplicate = await service.startTask({ ...request });
    assert.equal(duplicate.id, first.id);
    const second = await service.startTask({ ...request, requestKey: 'request-2' });
    await assert.rejects(
      service.startTask({ ...request, requestKey: 'request-3' }),
      (error: unknown) => error instanceof WorkerError && error.code === 'queue_full',
    );
    while (provider.calls === 0) await new Promise((resolve) => setTimeout(resolve, 5));
    const cancelled = await service.cancelTask(first.id);
    assert.equal(cancelled.state, 'cancelled');
    assert.equal(generationStopped, true);
    assert.equal((await service.cancelTask(second.id)).state, 'cancelled');
    await assert.rejects(
      service.startTask({ ...request, instruction: 'different' }),
      (error: unknown) => error instanceof WorkerError && error.code === 'request_key_conflict',
    );
  } finally { await service.close(); }
});

test('records provider failures as terminal jobs without leaking provider messages', async () => {
  const provider = new ScriptedProvider(async () => { throw new Error('secret provider diagnostic'); });
  const { service, request } = await fixture(provider);
  try {
    const job = await waitForTerminal(service, (await service.startTask(request)).id);
    assert.equal(job.state, 'failed');
    assert.equal(job.error?.code, 'internal_error');
    assert.doesNotMatch(job.error?.message ?? '', /secret/);
  } finally { await service.close(); }
});

test('marks deadlines only after the provider stops', async () => {
  let providerStopped = false;
  const provider = new ScriptedProvider((request) => new Promise<string>((_resolve, reject) => {
    request.signal.addEventListener('abort', () => {
      providerStopped = true;
      reject(request.signal.reason);
    }, { once: true });
  }));
  const { service, request } = await fixture(provider, 4, undefined, 1_000);
  try {
    const job = await waitForTerminal(service, (await service.startTask(request)).id);
    assert.equal(job.state, 'timed_out');
    assert.equal(providerStopped, true);
  } finally { await service.close(); }
});

test('rejects oversized complete prompts before provider generation', async () => {
  const provider = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const { service, request } = await fixture(provider);
  try {
    const job = await waitForTerminal(service, (await service.startTask({
      ...request, instruction: 'x'.repeat(900), mode: 'qualification', limits: { inputBytes: 1024 },
    })).id);
    assert.equal(job.state, 'failed');
    assert.equal(job.error?.code, 'context_budget');
    assert.equal(provider.calls, 0);
  } finally { await service.close(); }
});

test('rejects remote providers before startup', async () => {
  const provider = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const { service, config } = await fixture(provider);
  await service.close();
  const remote = { ...provider, id: 'ollama', locality: 'remote' as const } as unknown as ModelProvider;
  await assert.rejects(
    WorkerService.create({ ...config, leaseDir: path.join(config.leaseDir, 'remote') }, remote),
    (error: unknown) => error instanceof WorkerError && error.code === 'unsupported_provider',
  );
});

test('routes an explicitly approved remote request to the exact provider and records its identity', async () => {
  const local = new ScriptedProvider(async () => { throw new Error('local fallback must not run'); });
  const initial = await fixture(local);
  await initial.service.close();
  await configureRemote(initial.config);
  const remote = new RemoteScriptedProvider(async () => JSON.stringify({
    action: 'finish', answer: {
      outcome: 'answered', summary: 'Remote inspection completed.', findings: [], limitations: [], proposals: [],
    },
  }));
  const service = await WorkerService.create(initial.config, [local, remote]);
  try {
    await assert.rejects(
      service.startTask(initial.request),
      (error: unknown) => error instanceof WorkerError && error.code === 'remote_consent_required',
    );
    assert.equal(remote.calls, 0);
    assert.equal(remote.verifyCalls, 0);

    const job = await waitForTerminal(service, (await service.startTask({
      ...initial.request, requestKey: 'remote-approved', remoteDataConsent: true,
    })).id);
    assert.equal(job.state, 'completed');
    assert.equal(local.calls, 0);
    assert.equal(remote.calls, 1);
    assert.equal(job.result?.modelProvider, 'openrouter');
    assert.equal(job.result?.modelIdentity, CATALOG_FINGERPRINT);
    assert.equal(job.result?.modelDigest, undefined);
    assert.deepEqual(job.result?.routing, {
      locality: 'remote', model: 'test/model:free', endpointId: 'endpoint-1', providerSlug: 'test-provider',
      providerName: 'Test Provider', outputMode: 'json-schema', dataCollection: 'deny',
    });
    assert.equal(job.result?.statistics[0]?.costUsd, 0);
    assert.equal(job.result?.statistics[0]?.generationId, 'generation-1');
    let metrics = '';
    for (let attempt = 0; attempt < 100 && !metrics.includes('"generationIds"'); attempt += 1) {
      metrics = await readFile(path.join(initial.root, 'data', 'metrics.jsonl'), 'utf8');
      if (!metrics.includes('"generationIds"')) await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const finished = metrics.split('\n').filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>)
      .find((metric) => metric.event === 'job_finished');
    assert.equal(finished?.modelProvider, 'openrouter');
    assert.equal(finished?.modelIdentity, CATALOG_FINGERPRINT);
    assert.equal(finished?.costUsd, 0);
    assert.deepEqual(finished?.generationIds, ['generation-1']);
    assert.deepEqual(finished?.routing, job.result?.routing);
  } finally { await service.close(); }
});

test('denies unapproved remote source forwarding before provider or snapshot work', async () => {
  const local = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const initial = await fixture(local);
  await initial.service.close();
  await configureRemote(initial.config);
  const remote = new RemoteScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const service = await WorkerService.create(initial.config, remote);
  try {
    await assert.rejects(
      service.startTask({
        ...initial.request, requestKey: 'remote-source', remoteDataConsent: true,
        sources: [{ url: 'https://example.test/source', retrievedAt: new Date().toISOString(), text: 'private source' }],
      }),
      (error: unknown) => error instanceof WorkerError && error.code === 'remote_sources_denied',
    );
    assert.equal(remote.calls, 0);
    assert.equal(remote.verifyCalls, 0);
  } finally { await service.close(); }
});

test('fails closed when remote generation lacks zero-cost or approved-route proof', async () => {
  for (const [label, stats, code] of [
    ['missing cost', { endpointId: 'endpoint-1', providerName: 'Test Provider' }, 'cost_policy_violation'],
    ['wrong endpoint', { costUsd: 0, endpointId: 'different', providerName: 'Test Provider' }, 'routing_identity_mismatch'],
  ] as const) {
    const local = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
    const initial = await fixture(local);
    await initial.service.close();
    await configureRemote(initial.config);
    const remote = new RemoteScriptedProvider(async () => JSON.stringify({ action: 'finish', answer: {
      outcome: 'answered', summary: label, findings: [], limitations: [], proposals: [],
    } }), stats);
    const service = await WorkerService.create(initial.config, remote);
    try {
      const job = await waitForTerminal(service, (await service.startTask({
        ...initial.request, requestKey: `remote-${label.replace(' ', '-')}`, remoteDataConsent: true,
      })).id);
      assert.equal(job.state, 'failed');
      assert.equal(job.error?.code, code);
    } finally { await service.close(); }
  }
});

test('requires a fresh remote qualification with no more than 24 hours of validity', async () => {
  for (const [label, expiresAt] of [
    ['expired', new Date(Date.now() - 1_000).toISOString()],
    ['too-far', new Date(Date.now() + 25 * 60 * 60 * 1_000).toISOString()],
  ] as const) {
    const local = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
    const initial = await fixture(local);
    await initial.service.close();
    await configureRemote(initial.config, expiresAt);
    const remote = new RemoteScriptedProvider(async () => JSON.stringify({ action: 'list' }));
    const service = await WorkerService.create(initial.config, remote);
    try {
      await assert.rejects(
        service.startTask({ ...initial.request, requestKey: `expiry-${label}`, remoteDataConsent: true }),
        (error: unknown) => error instanceof WorkerError && error.code === 'profile_not_qualified',
      );
      const capabilities = await service.capabilities();
      assert.deepEqual(capabilities.profiles[0]?.qualifiedTaskClasses, []);
      assert.match(capabilities.profiles[0]?.reason ?? '', /qualification is expired, missing, or exceeds/);
      assert.equal(remote.calls, 0);
    } finally { await service.close(); }
  }
});

test('requires the exact profile qualification fingerprint for work', async () => {
  const provider = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const { service, request, config } = await fixture(provider);
  await service.close();
  config.profiles[0]!.qualification!.fingerprint = 'b'.repeat(64);
  const mismatched = await WorkerService.create(config, provider);
  try {
    await assert.rejects(
      mismatched.startTask(request),
      (error: unknown) => error instanceof WorkerError && error.code === 'profile_not_qualified',
    );
  } finally { await mismatched.close(); }
});

test('capabilities do not advertise stale profile qualification', async () => {
  const provider = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const { service, config } = await fixture(provider);
  try {
    config.profiles[0]!.qualification!.fingerprint = 'b'.repeat(64);
    const capabilities = await service.capabilities();
    assert.equal(capabilities.models[0]?.available, true);
    assert.deepEqual(capabilities.profiles[0]?.qualifiedTaskClasses, []);
    assert.match(capabilities.profiles[0]?.reason ?? '', /stale or missing/);
  } finally { await service.close(); }
});

test('profile limits keep an 8K local model available under larger host ceilings', async () => {
  const provider = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const initial = await fixture(provider);
  await initial.service.close();
  initial.config.limits.contextTokens = 262_144;
  initial.config.limits.inputBytes = 131_072;
  const profile = initial.config.profiles[0]!;
  profile.limits = { contextTokens: 8_192, inputBytes: 16_384 };
  const firstFingerprint = await qualificationFingerprint(initial.config, profile, initial.config.models[0]!);
  profile.qualification!.fingerprint = firstFingerprint;
  const service = await WorkerService.create(initial.config, provider);
  try {
    const capabilities = await service.capabilities();
    assert.equal(capabilities.models[0]?.available, true);
    assert.equal(capabilities.profiles[0]?.modelId, 'model');
    assert.equal(capabilities.profiles[0]?.limits.contextTokens, 8_192);
    assert.equal(capabilities.profiles[0]?.limits.inputBytes, 16_384);
    assert.equal(provider.verifiedLimits.at(-1)?.contextTokens, 8_192);
    assert.equal(provider.verifiedLimits.at(-1)?.inputBytes, 16_384);
    await assert.rejects(
      service.startTask({
        ...initial.request, requestKey: 'expand-profile', mode: 'qualification', limits: { contextTokens: 16_384 },
      }),
      (error: unknown) => error instanceof WorkerError && error.code === 'invalid_request',
    );
    profile.limits.inputBytes = 16_000;
    assert.notEqual(
      await qualificationFingerprint(initial.config, profile, initial.config.models[0]!),
      firstFingerprint,
    );
  } finally { await service.close(); }
});

test('a remote profile can use the larger host context and input budget', async () => {
  const local = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const initial = await fixture(local);
  await initial.service.close();
  initial.config.limits.contextTokens = 262_144;
  initial.config.limits.inputBytes = 131_072;
  const model = await configureRemote(initial.config, new Date(Date.now() + 60 * 60 * 1_000).toISOString(), 262_144);
  assert.equal(hostConfigSchema.safeParse(initial.config).success, true);
  initial.config.profiles[0]!.qualification!.fingerprint = await qualificationFingerprint(
    initial.config, initial.config.profiles[0]!, model,
  );
  const remote = new RemoteScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const service = await WorkerService.create(initial.config, remote);
  try {
    const capabilities = await service.capabilities();
    assert.equal(capabilities.models[0]?.available, true);
    assert.equal(capabilities.profiles[0]?.limits.contextTokens, 262_144);
    assert.equal(capabilities.profiles[0]?.limits.inputBytes, 131_072);
    assert.equal(remote.verifiedLimits.at(-1)?.contextTokens, 262_144);
    assert.equal(remote.verifiedLimits.at(-1)?.inputBytes, 131_072);
  } finally { await service.close(); }
});

test('profile limits above host ceilings fail in both the schema and service core', async () => {
  const provider = new ScriptedProvider(async () => JSON.stringify({ action: 'list' }));
  const initial = await fixture(provider);
  await initial.service.close();
  initial.config.profiles[0]!.limits = { inputBytes: initial.config.limits.inputBytes + 1 };
  assert.equal(hostConfigSchema.safeParse(initial.config).success, false);
  await assert.rejects(
    WorkerService.create(initial.config, provider),
    (error: unknown) => error instanceof WorkerError && error.code === 'invalid_config',
  );
});

test('allows idle clients while serializing active inference across services', async () => {
  const blocking = new ScriptedProvider((request) => new Promise<string>((_resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(request.signal.reason), { once: true });
  }));
  const firstFixture = await fixture(blocking);
  const secondProvider = new ScriptedProvider(async () => JSON.stringify({
    action: 'finish', answer: { outcome: 'answered', summary: 'second', findings: [], limitations: [], proposals: [] },
  }));
  const second = await WorkerService.create(firstFixture.config, secondProvider);
  try {
    await second.capabilities();
    const firstJob = await firstFixture.service.startTask(firstFixture.request);
    while (blocking.calls === 0) await new Promise((resolve) => setTimeout(resolve, 5));
    const secondJob = await second.startTask({ ...firstFixture.request, requestKey: 'other-service' });
    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(secondProvider.calls, 0);
    await firstFixture.service.cancelTask(firstJob.id);
    const completed = await waitForTerminal(second, secondJob.id);
    assert.equal(completed.state, 'completed');
    assert.equal(secondProvider.calls, 1);
  } finally {
    await Promise.all([firstFixture.service.close(), second.close()]);
  }
});

test('excludes arbitrary nested runtime directories and rejects runtime roots that contain a repository', async () => {
  const bootstrap = new ScriptedProvider(async () => JSON.stringify({
    action: 'finish', answer: { outcome: 'answered', summary: 'done', findings: [], limitations: [], proposals: [] },
  }));
  const initial = await fixture(bootstrap);
  await initial.service.close();
  const repository = initial.config.repositories[0]!;
  repository.allowPaths = ['.'];
  initial.config.dataDir = path.join(repository.root, 'unexpected-worker-state');
  initial.config.leaseDir = path.join(repository.root, 'unexpected-worker-locks');
  const provider = new ScriptedProvider(async (request) => {
    const prompt = JSON.parse(request.messages[1]!.content) as { inventory: { files: { path: string }[] } };
    assert.deepEqual(prompt.inventory.files.map((file) => file.path), ['sample.txt']);
    return JSON.stringify({
      action: 'finish', answer: { outcome: 'answered', summary: 'done', findings: [], limitations: [], proposals: [] },
    });
  });
  const nested = await WorkerService.create(initial.config, provider);
  try {
    const completed = await waitForTerminal(nested, (await nested.startTask({ ...initial.request, paths: ['.'] })).id);
    assert.equal(completed.state, 'completed');
    assert.deepEqual(completed.result?.snapshot.files.map((file) => file.path), ['sample.txt']);
  } finally { await nested.close(); }

  initial.config.dataDir = repository.root;
  initial.config.leaseDir = path.join(initial.root, 'outside-lease');
  await assert.rejects(
    WorkerService.create(initial.config, provider),
    (error: unknown) => error instanceof WorkerError && error.code === 'invalid_config',
  );
});

test('turns fabricated evidence into an explicit needs_codex result', async () => {
  const provider = new ScriptedProvider(async () => JSON.stringify({
    action: 'finish', answer: {
      outcome: 'answered', summary: 'Invented.',
      findings: [{ text: 'Fabricated line.', evidence: [{ path: 'sample.txt', startLine: 2, endLine: 2 }] }],
      limitations: [], proposals: [],
    },
  }));
  const { service, request } = await fixture(provider);
  try {
    const job = await waitForTerminal(service, (await service.startTask(request)).id);
    assert.equal(job.state, 'completed');
    assert.equal(job.result?.answer.outcome, 'needs_codex');
    assert.match(job.result?.answer.limitations[0] ?? '', /not inspected/);
  } finally { await service.close(); }
});

test('rejects a citation to nonexistent line one in an empty file', async () => {
  const provider = new ScriptedProvider(async (_request, call) => call === 1
    ? JSON.stringify({ action: 'read', path: 'empty.txt', startLine: 1, endLine: 1 })
    : JSON.stringify({
      action: 'finish', answer: {
        outcome: 'answered', summary: 'The empty file contains evidence.',
        findings: [{ text: 'Evidence exists.', evidence: [{ path: 'empty.txt', startLine: 1, endLine: 1 }] }],
        limitations: [], proposals: [],
      },
    }));
  const { service, request, config } = await fixture(provider);
  await writeFile(path.join(config.repositories[0]!.root, 'empty.txt'), '', 'utf8');
  config.repositories[0]!.allowPaths.push('empty.txt');
  try {
    const job = await waitForTerminal(service, (await service.startTask({ ...request, paths: ['empty.txt'] })).id);
    assert.equal(job.state, 'completed');
    assert.equal(job.result?.answer.outcome, 'needs_codex');
    assert.match(job.result?.answer.limitations[0] ?? '', /invalid snapshot range: empty\.txt:1-1/);
  } finally { await service.close(); }
});

test('keeps authoritative failed check receipts separate from model claims', async () => {
  const receipt: CommandReceipt = {
    id: 'receipt', checkId: 'unit', snapshotId: '', executable: process.execPath, args: [],
    exitCode: 1, status: 'failed', output: 'one test failed', truncated: false, durationMs: 4,
  };
  const runner: CommandRunner = {
    async health() { return { available: true, checkIds: ['unit'] }; },
    async run(_id, snapshot) { return { ...receipt, snapshotId: snapshot.id }; },
  };
  const provider = new ScriptedProvider(async (_request, call) => call === 1
    ? JSON.stringify({ action: 'run_check', checkId: 'unit' })
    : JSON.stringify({ action: 'finish', answer: {
      outcome: 'answered', summary: 'All tests passed.', findings: [], limitations: [], proposals: [],
    } }));
  const { service, request } = await fixture(provider, 4, runner);
  try {
    const job = await waitForTerminal(service, (await service.startTask({
      ...request, enabledCheckIds: ['unit'],
    })).id);
    assert.equal(job.result?.answer.summary, 'All tests passed.');
    assert.equal(job.result?.commands[0]?.status, 'failed');
    assert.equal(job.result?.commands[0]?.output, 'one test failed');
  } finally { await service.close(); }
});
