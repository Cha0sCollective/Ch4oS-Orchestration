import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { OpenRouterProvider } from '../openrouter.js';
import { SearchService, type WebSearchConfig } from '../web-search.js';
import { WorkerError, type OpenRouterConfig, type OpenRouterModel } from '../types.js';

const modelName = 'nvidia/nemotron-3-nano-30b-a3b:free';
const endpointModel = 'nvidia/nemotron-3-nano-30b-a3b-2026-08:free';
const requiredParameters = ['max_tokens', 'temperature', 'tools', 'tool_choice'];
const providerConfig: OpenRouterConfig = {
  apiKeyEnv: 'OPENROUTER_SEARCH_API_KEY', maxCostUsd: 0, allowedRepositories: [],
  allowSuppliedSources: false, dataCollection: 'deny',
};

interface FakeOptions {
  key?: Record<string, unknown>;
  completion?: (id: string) => Record<string, unknown> | string;
  receipt?: (id: string) => Record<string, unknown>;
  receiptNotFoundCount?: number;
  completionDelay?: () => Promise<void>;
  receiptWait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}

function fake(options: FakeOptions = {}, requests: { path: string; body?: Record<string, unknown> }[] = []): typeof fetch {
  let generation = 0;
  let receiptRequests = 0;
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const path = new URL(typeof input === 'string' || input instanceof URL ? input : input.url).pathname;
    const queryId = new URL(typeof input === 'string' || input instanceof URL ? input : input.url).searchParams.get('id');
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : undefined;
    requests.push({ path, ...(body ? { body } : {}) });
    if (path.startsWith('/api/v1/model/')) return Response.json({ data: {
      id: modelName, context_length: 32_768, pricing: { prompt: '0', completion: '0', request: '0' },
      supported_parameters: requiredParameters,
    } });
    if (path.startsWith('/api/v1/models/')) return Response.json({ data: { id: modelName, endpoints: [{
      name: `Nvidia | ${endpointModel}`, tag: 'nvidia', provider_name: 'Nvidia', model_id: modelName,
      context_length: 32_768, max_prompt_tokens: null, max_completion_tokens: 4_096, status: 0,
      quantization: 'unknown', supports_implicit_caching: false,
      supports_tool_choice: { none: true, auto: true, required: true, function: true },
      pricing: { prompt: '0', completion: '0' }, supported_parameters: requiredParameters,
    }] } });
    if (path === '/api/v1/key') return Response.json({ data: options.key ?? {
      is_management_key: false, is_provisioning_key: false, limit: 5, limit_remaining: 5,
      limit_reset: null, expires_at: null,
    } });
    if (path === '/api/v1/chat/completions') {
      await options.completionDelay?.();
      const id = `gen-search-${++generation}`;
      const custom = options.completion?.(id);
      if (typeof custom === 'string') return new Response(custom, { status: 200, headers: { 'Content-Type': 'application/json' } });
      const url = 'https://example.com/a';
      const answer = `Current answer [source](${url}).`;
      return Response.json(custom ?? {
        id, model: endpointModel, choices: [{ finish_reason: 'stop', message: { content: answer, annotations: [{
          type: 'url_citation', url_citation: { url, title: 'Example', content: 'untrusted excerpt',
            start_index: answer.indexOf(url), end_index: answer.indexOf(url) + url.length },
        }] } }], usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30, cost: 0.007 },
      });
    }
    if (path === '/api/v1/generation' && receiptRequests++ < (options.receiptNotFoundCount ?? 0)) {
      return Response.json({ error: { message: 'Generation not found' } }, { status: 404 });
    }
    if (path === '/api/v1/generation') return Response.json({ data: options.receipt?.(queryId!) ?? {
      id: queryId, model: endpointModel, provider_name: 'Nvidia', web_search_engine: 'exa', is_byok: false,
      total_cost: 0.007, usage: 0.007, upstream_inference_cost: 0,
      native_tokens_prompt: 20, native_tokens_completion: 10, num_search_results: 1,
    } });
    return Response.json({ error: { message: 'unexpected test request' } }, { status: 404 });
  }) as typeof fetch;
}

async function registered(fetcher: typeof fetch): Promise<OpenRouterModel> {
  const endpoint = (await new OpenRouterProvider(providerConfig, fetcher, () => 'search-secret')
    .discoverFreeEndpoints(modelName, AbortSignal.timeout(1_000)))[0]!;
  return {
    id: 'search-model', provider: 'openrouter', model: modelName, endpointId: endpoint.endpointId,
    providerSlug: endpoint.providerSlug, providerName: endpoint.providerName,
    catalogFingerprint: endpoint.catalogFingerprint, outputMode: endpoint.outputMode,
    temperature: 0.1, contextTokens: 8_192,
  };
}

async function fixture(options: FakeOptions = {}, lifetimeMaxUsd = 5) {
  const root = await mkdtemp(join(tmpdir(), 'local-agent-web-search-'));
  const requests: { path: string; body?: Record<string, unknown> }[] = [];
  const fetcher = fake(options, requests);
  const model = await registered(fetcher);
  const config: WebSearchConfig = {
    model, lifetimeMaxUsd, storeDir: root, keyEnv: 'OPENROUTER_SEARCH_API_KEY', timeoutMs: 5_000,
  };
  const service = new SearchService(config, { fetcher, resolveCredential: () => 'search-secret', now: () => new Date('2026-09-12T12:00:00Z'),
    ...(options.receiptWait ? { wait: options.receiptWait } : {}) });
  return { root, requests, fetcher, config, service, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('sends one fixed Exa plugin request on a pinned free endpoint and returns only annotated citations', async () => {
  const item = await fixture();
  try {
    const result = await item.service.search({ requestKey: 'search-1', query: 'What changed today?' });
    assert.equal(result.retrievedAt, '2026-09-12T12:00:00.000Z');
    assert.equal(result.statistics.actualCostUsd, 0.007);
    assert.equal(result.statistics.engine, 'exa');
    assert.deepEqual(result.citations, [{ url: 'https://example.com/a', title: 'Example' }]);
    const completions = item.requests.filter(request => request.path === '/api/v1/chat/completions');
    assert.equal(completions.length, 1);
    assert.deepEqual(completions[0]!.body!.plugins, [{ id: 'web', engine: 'exa', mode: 'fast', max_results: 5 }]);
    assert.equal(completions[0]!.body!.tools, undefined);
    assert.deepEqual(completions[0]!.body!.provider, {
      only: ['nvidia'], allow_fallbacks: false, require_parameters: true,
      max_price: { prompt: 0, completion: 0, request: 0, image: 0 }, data_collection: 'deny',
    });
    assert.equal(JSON.stringify(completions[0]!.body).includes('repo'), false);
  } finally { await item.cleanup(); }
});

test('atomic reservations survive concurrent requests and enforce the lifetime attempt cap', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let entered = 0;
  const item = await fixture({ completionDelay: async () => { entered += 1; if (entered === 2) release(); await gate; } }, 0.014);
  try {
    const secondService = new SearchService(item.config, { fetcher: item.fetcher, resolveCredential: () => 'search-secret',
      now: () => new Date('2026-09-12T12:00:00Z') });
    const [first, second] = await Promise.all([
      item.service.search({ requestKey: 'parallel-a', query: 'Query A' }),
      secondService.search({ requestKey: 'parallel-b', query: 'Query B' }),
    ]);
    assert.equal(first.statistics.reservedCostUsd, 0.007);
    assert.equal(second.statistics.reservedCostUsd, 0.007);
    await assert.rejects(item.service.search({ requestKey: 'parallel-c', query: 'Query C' }), error =>
      error instanceof WorkerError && error.code === 'budget_exhausted');
    const ledger = JSON.parse(await readFile(join(item.root, 'budget.json'), 'utf8')) as { reservations: unknown[] };
    assert.equal(ledger.reservations.length, 2);
    assert.equal(item.requests.filter(request => request.path === '/api/v1/chat/completions').length, 2);
  } finally { await item.cleanup(); }
});

test('completed request keys are durable across restart and never purchase a second search', async () => {
  const item = await fixture();
  try {
    const first = await item.service.search({ requestKey: 'durable', query: 'One query' });
    const restarted = new SearchService(item.config, { fetcher: item.fetcher, resolveCredential: () => 'search-secret' });
    const second = await restarted.search({ requestKey: 'durable', query: 'One query' });
    assert.deepEqual(second.answer, first.answer);
    assert.equal(item.requests.filter(request => request.path === '/api/v1/chat/completions').length, 1);
    await assert.rejects(restarted.search({ requestKey: 'durable', query: 'Different query' }), error =>
      error instanceof WorkerError && error.code === 'request_conflict');
  } finally { await item.cleanup(); }
});

test('completed request replay remains local when the model catalog is unavailable', async () => {
  const item = await fixture();
  try {
    const first = await item.service.search({ requestKey: 'offline-replay', query: 'One query' });
    let remoteCalls = 0;
    const unavailable = (async () => {
      remoteCalls += 1;
      throw new Error('catalog unavailable');
    }) as typeof fetch;
    const restarted = new SearchService(item.config, { fetcher: unavailable, resolveCredential: () => 'search-secret' });
    const replay = await restarted.search({ requestKey: 'offline-replay', query: 'One query' });
    assert.deepEqual(replay, first);
    assert.equal(remoteCalls, 0);
  } finally { await item.cleanup(); }
});

test('key preflight rejects management, resetting, oversized, exhausted, or expired keys without reserving', async () => {
  const invalid = [
    { is_management_key: false, is_provisioning_key: false, limit: null, limit_remaining: 5, limit_reset: null, expires_at: null },
    { is_management_key: true, is_provisioning_key: false, limit: 5, limit_remaining: 5, limit_reset: null, expires_at: null },
    { is_management_key: false, is_provisioning_key: false, limit: 5, limit_remaining: 5, limit_reset: 'monthly', expires_at: null },
    { is_management_key: false, is_provisioning_key: false, limit: 5.01, limit_remaining: 5, limit_reset: null, expires_at: null },
    { is_management_key: false, is_provisioning_key: false, limit: 5, limit_remaining: 0.006, limit_reset: null, expires_at: null },
    { is_management_key: false, is_provisioning_key: false, limit: 5, limit_remaining: 5, limit_reset: null, expires_at: '2026-01-01T00:00:00Z' },
  ];
  for (let index = 0; index < invalid.length; index += 1) {
    const item = await fixture({ key: invalid[index] });
    try {
      await assert.rejects(item.service.search({ requestKey: `bad-key-${index}`, query: 'Query' }), error =>
        error instanceof WorkerError && error.code === 'budget_guard');
      assert.equal(item.requests.filter(request => request.path === '/api/v1/chat/completions').length, 0);
      const capabilities = await item.service.capabilities();
      assert.equal(capabilities.reservedAttempts, 0);
    } finally { await item.cleanup(); }
  }
});

test('paid inference or cost above the reservation fails closed and keeps the reservation', async () => {
  for (const receipt of [
    (id: string) => ({ id, model: endpointModel, provider_name: 'Nvidia', web_search_engine: 'exa', is_byok: false,
      total_cost: 0.008, usage: 0.008, upstream_inference_cost: 0, native_tokens_prompt: 20, native_tokens_completion: 10, num_search_results: 1 }),
    (id: string) => ({ id, model: endpointModel, provider_name: 'Nvidia', web_search_engine: 'exa', is_byok: false,
      total_cost: 0.007, usage: 0.007, upstream_inference_cost: 0.0001, native_tokens_prompt: 20, native_tokens_completion: 10, num_search_results: 1 }),
  ]) {
    const item = await fixture({ receipt }, 0.007);
    try {
      await assert.rejects(item.service.search({ requestKey: 'charged', query: 'Query' }), /receipt did not prove/);
      await assert.rejects(item.service.search({ requestKey: 'next', query: 'Query two' }), error =>
        error instanceof WorkerError && error.code === 'budget_exhausted');
    } finally { await item.cleanup(); }
  }
});

test('receipt 404 retries are bounded read-only GETs and never repeat the completion POST', async () => {
  const delays: number[] = [];
  const item = await fixture({ receiptNotFoundCount: 2, receiptWait: async milliseconds => { delays.push(milliseconds); } });
  try {
    const result = await item.service.search({ requestKey: 'receipt-eventual', query: 'Query' });
    assert.equal(result.statistics.generationId, 'gen-search-1');
    assert.deepEqual(delays, [250, 500]);
    assert.equal(item.requests.filter(request => request.path === '/api/v1/chat/completions').length, 1);
    assert.equal(item.requests.filter(request => request.path === '/api/v1/generation').length, 3);
  } finally { await item.cleanup(); }
});

test('exhausted receipt lookup persists safe phase, generation, and usage diagnostics without the query', async () => {
  const item = await fixture({ receiptNotFoundCount: 100, receiptWait: async () => {} }, 0.007);
  try {
    await assert.rejects(item.service.search({ requestKey: 'receipt-missing', query: 'SECRET QUERY TEXT' }), error => {
      assert.ok(error instanceof WorkerError);
      assert.equal(error.details?.phase, 'receipt');
      assert.equal(error.details?.httpStatus, 404);
      assert.equal(error.details?.generationId, 'gen-search-1');
      assert.equal(error.stats?.costUsd, 0.007);
      return true;
    });
    assert.equal(item.requests.filter(request => request.path === '/api/v1/chat/completions').length, 1);
    assert.equal(item.requests.filter(request => request.path === '/api/v1/generation').length, 10);
    const diagnosticName = (await readdir(item.root)).find(name => name.startsWith('attempt-'))!;
    const diagnostic = await readFile(join(item.root, diagnosticName), 'utf8');
    assert.equal(diagnostic.includes('SECRET QUERY TEXT'), false);
    const stored = JSON.parse(diagnostic) as { error: { details: { phase: string; generationId: string }; statistics: { costUsd: number } } };
    assert.equal(stored.error.details.phase, 'receipt');
    assert.equal(stored.error.details.generationId, 'gen-search-1');
    assert.equal(stored.error.statistics.costUsd, 0.007);
  } finally { await item.cleanup(); }
});

test('deadline during receipt backoff remains timed_out with one paid POST', async () => {
  const item = await fixture({ receiptNotFoundCount: 100 });
  try {
    await assert.rejects(item.service.search({ requestKey: 'receipt-deadline', query: 'Query' },
      { signal: AbortSignal.timeout(150) }), error => {
      assert.ok(error instanceof WorkerError);
      assert.equal(error.code, 'timed_out');
      assert.equal(error.details?.phase, 'receipt');
      assert.equal(error.stats?.generationId, 'gen-search-1');
      return true;
    });
    assert.equal(item.requests.filter(request => request.path === '/api/v1/chat/completions').length, 1);
    assert.equal(item.requests.filter(request => request.path === '/api/v1/generation').length, 1);
  } finally { await item.cleanup(); }
});

test('oversized responses and cancellation are bounded after reservation without retry', async () => {
  const item = await fixture({ completion: () => `{"padding":"${'x'.repeat(600_000)}"}` }, 0.007);
  try {
    await assert.rejects(item.service.search({ requestKey: 'oversized', query: 'Query' }), error =>
      error instanceof WorkerError && error.code === 'provider_limit');
    assert.equal(item.requests.filter(request => request.path === '/api/v1/chat/completions').length, 1);
    let replayRemoteCalls = 0;
    const restarted = new SearchService(item.config, { fetcher: (async () => {
      replayRemoteCalls += 1;
      throw new Error('catalog unavailable');
    }) as typeof fetch, resolveCredential: () => 'search-secret' });
    await assert.rejects(restarted.search({ requestKey: 'oversized', query: 'Query' }), error =>
      error instanceof WorkerError && error.code === 'request_uncertain');
    assert.equal(replayRemoteCalls, 0);
  } finally { await item.cleanup(); }

  const cancelled = await fixture({}, 0.007);
  try {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(cancelled.service.search({ requestKey: 'cancelled', query: 'Query' }, { signal: controller.signal }), error =>
      error instanceof WorkerError && error.code === 'cancelled');
    assert.equal(cancelled.requests.filter(request => request.path === '/api/v1/chat/completions').length, 0);
  } finally { await cancelled.cleanup(); }
});

test('citation guards reject unsafe annotations and URLs absent from annotations', async () => {
  const cases = [
    () => {
      const answer = 'Unsafe source.';
      return { id: 'gen-search-unsafe', model: modelName, choices: [{ finish_reason: 'stop', message: { content: answer, annotations: [{
        type: 'url_citation', url_citation: { url: 'file:///secret', title: 'Unsafe', start_index: 0, end_index: 1 },
      }] } }], usage: { prompt_tokens: 20, completion_tokens: 10, cost: 0.007 } };
    },
    () => {
      const answer = 'Invented [link](https://invented.example/x).';
      return { id: 'gen-search-invented', model: modelName, choices: [{ finish_reason: 'stop', message: { content: answer, annotations: [] } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, cost: 0.007 } };
    },
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const item = await fixture({ completion: cases[index] });
    try {
      await assert.rejects(item.service.search({ requestKey: `citation-${index}`, query: 'Query' }), /citation|URL/);
      assert.equal(item.requests.filter(request => request.path === '/api/v1/generation').length, 0);
    } finally { await item.cleanup(); }
  }
});

test('capabilities are local, omit storage paths, and clearly report missing dedicated credentials', async () => {
  const item = await fixture();
  try {
    const service = new SearchService(item.config, { fetcher: item.fetcher, resolveCredential: () => undefined });
    const before = item.requests.length;
    const result = await service.capabilities();
    assert.equal(result.available, false);
    assert.equal(result.credentialAvailable, false);
    assert.match(result.reason!, /credential/);
    assert.equal(result.maxResults, 5);
    assert.equal(result.attemptLimit, 714);
    assert.equal(JSON.stringify(result).includes(item.root), false);
    assert.equal(item.requests.length, before);
  } finally { await item.cleanup(); }
});

test('data collection is explicit and constructor state cannot be widened by caller mutation', async () => {
  const item = await fixture();
  try {
    item.config.dataCollection = 'allow';
    const service = new SearchService(item.config, { fetcher: item.fetcher, resolveCredential: () => 'search-secret' });
    const replayConfig: WebSearchConfig = { ...item.config, model: { ...item.config.model }, dataCollection: 'deny' };
    item.config.dataCollection = 'deny';
    item.config.lifetimeMaxUsd = 0.007;
    item.config.model.providerSlug = 'mutated';
    const result = await service.search({ requestKey: 'cloned-config', query: 'Query' });
    assert.equal(result.statistics.providerName, 'Nvidia');
    assert.equal(result.statistics.dataCollection, 'allow');
    const request = item.requests.filter(value => value.path === '/api/v1/chat/completions').at(-1)!;
    assert.equal((request.body!.provider as Record<string, unknown>).data_collection, 'allow');
    const capabilities = await service.capabilities();
    assert.equal(capabilities.dataCollection, 'allow');
    assert.equal(capabilities.lifetimeMaxUsd, 5);
    assert.equal(capabilities.endpointId, 'nvidia');
    let replayRemoteCalls = 0;
    const replay = new SearchService(replayConfig, { fetcher: (async () => {
      replayRemoteCalls += 1;
      throw new Error('network must not be used for replay');
    }) as typeof fetch, resolveCredential: () => 'search-secret' });
    const replayed = await replay.search({ requestKey: 'cloned-config', query: 'Query' });
    assert.equal(replayed.statistics.dataCollection, 'allow');
    assert.equal(replayRemoteCalls, 0);
  } finally { await item.cleanup(); }
});

test('an existing budget lock is never stolen automatically', async () => {
  const item = await fixture();
  try {
    const lock = join(item.root, 'budget.lock');
    await writeFile(lock, 'operator-review-required');
    await assert.rejects(item.service.capabilities({ signal: AbortSignal.timeout(25) }), error =>
      error instanceof WorkerError && error.code === 'timed_out');
    await access(lock);
  } finally { await item.cleanup(); }
});
