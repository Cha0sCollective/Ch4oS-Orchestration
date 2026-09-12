import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenRouterProvider } from '../openrouter.js';
import { DEFAULT_LIMITS, WorkerError, type OpenRouterConfig, type OpenRouterModel } from '../types.js';

const modelName = 'nvidia/nemotron-3-ultra-550b-a55b:free';
const endpointModel = 'nvidia/nemotron-3-ultra-550b-a55b-20260604:free';
const requiredParameters = ['reasoning', 'include_reasoning', 'temperature', 'max_tokens', 'seed', 'top_p', 'tools', 'tool_choice', 'reasoning_effort'];
const config: OpenRouterConfig = {
  apiKeyEnv: 'OPENROUTER_TEST_KEY', maxCostUsd: 0, allowedRepositories: ['repo'],
  allowSuppliedSources: false, dataCollection: 'deny',
};

interface FakeOptions {
  modelPricing?: Record<string, string>;
  endpointPricing?: Record<string, string>;
  modelParameters?: string[];
  endpointParameters?: string[];
  supportsToolChoice?: Record<string, boolean>;
  finishReason?: string;
  metadataProvider?: string;
  metadataModel?: string;
  proof?: Record<string, unknown>;
  completion?: Record<string, unknown>;
  completionStatus?: number;
  generationNotFoundCount?: number;
}

function fake(options: FakeOptions = {}, requests: { url: string; init?: RequestInit; body?: Record<string, unknown> }[] = []): typeof fetch {
  let generationRequests = 0;
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init, ...(typeof init?.body === 'string' ? { body: JSON.parse(init.body) as Record<string, unknown> } : {}) });
    const pathname = new URL(url).pathname;
    assert.equal(init?.redirect, 'error');
    assert.equal((init?.headers as Record<string, string>).Authorization,
      pathname === '/api/v1/chat/completions' || pathname === '/api/v1/generation' ? 'Bearer test-secret' : undefined);
    if (pathname.startsWith('/api/v1/model/')) return Response.json({ data: {
      id: modelName, context_length: 1_000_000,
      pricing: options.modelPricing ?? { prompt: '0', completion: '0', request: '0', discount: 0 },
      supported_parameters: options.modelParameters ?? requiredParameters,
    } });
    if (pathname.startsWith('/api/v1/models/')) return Response.json({ data: {
      id: modelName,
      endpoints: [{
        name: `Nvidia | ${endpointModel}`,
        tag: 'nvidia', provider_name: 'Nvidia', model_id: modelName, context_length: 1_000_000,
        max_prompt_tokens: null, max_completion_tokens: 65_536, status: 0,
        quantization: 'unknown', supports_implicit_caching: false,
        supports_tool_choice: options.supportsToolChoice ?? { none: true, auto: true, required: true, function: true },
        pricing: options.endpointPricing ?? { prompt: '0', completion: '0', discount: 0 },
        supported_parameters: options.endpointParameters ?? requiredParameters,
      }],
    } });
    if (pathname === '/api/v1/chat/completions') return Response.json(options.completion ?? {
      id: 'gen-test', model: modelName,
      choices: [{ finish_reason: options.finishReason ?? 'tool_calls', message: { role: 'assistant', content: null,
        tool_calls: [{ type: 'function', function: { name: 'worker_action', arguments: '{"ok":true}' } }] } }],
      usage: { prompt_tokens: 1681, completion_tokens: 70, total_tokens: 1751, cost: 0 },
      openrouter_metadata: { requested: modelName, strategy: 'direct', attempt: 1, pipeline: [],
        endpoints: { available: [{ provider: options.metadataProvider ?? 'Nvidia',
          model: options.metadataModel ?? endpointModel, selected: true }] } },
    }, { status: options.completionStatus ?? 200 });
    if (pathname === '/api/v1/generation' && generationRequests++ < (options.generationNotFoundCount ?? 0)) {
      return Response.json({ error: { message: 'Generation not found' } }, { status: 404 });
    }
    if (pathname === '/api/v1/generation') return Response.json({ data: {
      id: 'gen-test', model: endpointModel, provider_name: 'Nvidia', is_byok: false,
      tokens_prompt: 1095, tokens_completion: 78, native_tokens_prompt: 1681, native_tokens_completion: 70,
      total_cost: 0, usage: 0,
      ...(options.proof ?? {}),
    } });
    return Response.json({ error: { message: 'unexpected test request' } }, { status: 404 });
  }) as typeof fetch;
}

async function registered(provider: OpenRouterProvider): Promise<OpenRouterModel> {
  const discovered = await provider.discoverFreeEndpoints(modelName, AbortSignal.timeout(1000));
  assert.equal(discovered.length, 1);
  const endpoint = discovered[0]!;
  return {
    id: 'remote-free', provider: 'openrouter', model: endpoint.model, endpointId: endpoint.endpointId,
    providerSlug: endpoint.providerSlug, providerName: endpoint.providerName,
    catalogFingerprint: endpoint.catalogFingerprint, outputMode: endpoint.outputMode, temperature: 0.1, contextTokens: 8192,
  };
}

test('failed completions preserve safe diagnostics and counters without echoed task data', async () => {
  for (const status of [200, 503]) {
    const provider = new OpenRouterProvider(config, fake({ completionStatus: status, completion: {
      id: 'gen-failure', error: { code: 503, message: 'SECRET_TASK_CONTENT' },
      usage: { prompt_tokens: 17, completion_tokens: 2, cost: 0 },
    } }), () => 'test-secret');
    const model = await registered(provider);
    await assert.rejects(provider.generate({ model, limits: DEFAULT_LIMITS, messages: [], schema: {}, signal: AbortSignal.timeout(1000) }), error => {
      assert.ok(error instanceof WorkerError);
      assert.equal(error.details?.httpStatus, status);
      assert.equal(error.details?.providerCode, '503');
      assert.equal(error.details?.generationId, 'gen-failure');
      assert.equal(error.stats?.promptTokens, 17);
      assert.equal(JSON.stringify(error).includes('SECRET_TASK_CONTENT'), false);
      return true;
    });
  }
});

test('discovery admits only exact zero-price endpoints with an explicit supported output mode', async () => {
  const provider = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const endpoint = (await provider.discoverFreeEndpoints(modelName))[0]!;
  assert.equal(endpoint.endpointId, 'nvidia');
  assert.equal(endpoint.providerSlug, 'nvidia');
  assert.equal(endpoint.endpointModel, endpointModel);
  assert.equal(endpoint.outputMode, 'tool-call');
  assert.match(endpoint.catalogFingerprint, /^[a-f0-9]{64}$/);

  assert.deepEqual(await new OpenRouterProvider(config, fake({ endpointPricing: { prompt: '0', completion: '0', future_billable: '0.01' } }), () => 'test-secret')
    .discoverFreeEndpoints(modelName), []);
  assert.deepEqual(await new OpenRouterProvider(config, fake({ endpointParameters: ['temperature', 'max_tokens', 'reasoning'] }), () => 'test-secret')
    .discoverFreeEndpoints(modelName), []);
  assert.deepEqual(await new OpenRouterProvider(config, fake({ supportsToolChoice: { function: false } }), () => 'test-secret')
    .discoverFreeEndpoints(modelName), []);
  const bothModes = [...requiredParameters, 'response_format', 'structured_outputs'];
  const dual = await new OpenRouterProvider(config, fake({ modelParameters: bothModes, endpointParameters: bothModes }), () => 'test-secret')
    .discoverFreeEndpoints(modelName);
  assert.deepEqual(dual.map(value => value.outputMode), ['json-schema', 'tool-call']);
  assert.notEqual(dual[0]!.catalogFingerprint, dual[1]!.catalogFingerprint);
  await assert.rejects(provider.discoverFreeEndpoints('openrouter/free'), /explicit :free model/);
});

test('verification requires a credential and the current catalog fingerprint', async () => {
  const provider = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const model = await registered(provider);
  assert.equal((await provider.verify(model, DEFAULT_LIMITS, AbortSignal.timeout(1000))).available, true);
  assert.equal((await provider.verify({ ...model, catalogFingerprint: '0'.repeat(64) }, DEFAULT_LIMITS, AbortSignal.timeout(1000))).available, false);
  assert.equal((await new OpenRouterProvider(config, fake(), () => undefined).verify(model, DEFAULT_LIMITS, AbortSignal.timeout(1000))).available, false);
  assert.equal((await new OpenRouterProvider({ ...config, maxCostUsd: 1 as 0 }, fake(), () => 'test-secret')
    .verify(model, DEFAULT_LIMITS, AbortSignal.timeout(1000))).available, false);
});

test('generation fixes free routing and returns only generation-proven identity and usage', async () => {
  const requests: { url: string; init?: RequestInit; body?: Record<string, unknown> }[] = [];
  const provider = new OpenRouterProvider(config, fake({}, requests), () => 'test-secret');
  const model = await registered(provider);
  const result = await provider.generate({
    model, messages: [{ role: 'user', content: 'Return JSON.' }],
    schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
    limits: DEFAULT_LIMITS, signal: AbortSignal.timeout(1000),
  });
  assert.equal(result.content, '{"ok":true}');
  assert.deepEqual(result.stats, {
    promptTokens: 1681, outputTokens: 70, costUsd: 0, generationId: 'gen-test', endpointId: 'nvidia', providerName: 'Nvidia',
  });
  const completion = requests.find(request => new URL(request.url).pathname === '/api/v1/chat/completions')!;
  assert.equal((completion.init!.headers as Record<string, string>)['X-OpenRouter-Metadata'], 'enabled');
  assert.deepEqual(completion.body!.transforms, []);
  assert.deepEqual(completion.body!.provider, {
    only: ['nvidia'], allow_fallbacks: false, require_parameters: true,
    max_price: { prompt: 0, completion: 0, request: 0, image: 0 }, data_collection: 'deny',
  });
  assert.equal(completion.body!.response_format, undefined);
  assert.equal(completion.body!.parallel_tool_calls, undefined);
  assert.deepEqual(completion.body!.tools, [{ type: 'function', function: { name: 'worker_action',
    description: 'Return the requested structured worker answer.',
    parameters: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] } } }]);
  assert.deepEqual(completion.body!.tool_choice, { type: 'function', function: { name: 'worker_action' } });
});

test('json-schema mode sends no tool contract and remains separately fingerprinted', async () => {
  const parameters = [...requiredParameters, 'response_format', 'structured_outputs'];
  const options: FakeOptions = { modelParameters: parameters, endpointParameters: parameters, completion: {
    id: 'gen-test', model: modelName, choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
    usage: { prompt_tokens: 1681, completion_tokens: 70, cost: 0 },
  } };
  const discovery = new OpenRouterProvider(config, fake(options), () => 'test-secret');
  const endpoint = (await discovery.discoverFreeEndpoints(modelName)).find(value => value.outputMode === 'json-schema')!;
  const model: OpenRouterModel = { id: 'remote-json', provider: 'openrouter', model: modelName, endpointId: endpoint.endpointId,
    providerSlug: endpoint.providerSlug, providerName: endpoint.providerName, catalogFingerprint: endpoint.catalogFingerprint,
    outputMode: 'json-schema', temperature: 0.1, contextTokens: 8192 };
  const requests: { url: string; init?: RequestInit; body?: Record<string, unknown> }[] = [];
  const provider = new OpenRouterProvider(config, fake(options, requests), () => 'test-secret');
  await provider.generate({ model, messages: [{ role: 'user', content: 'JSON' }], schema: { type: 'object' }, limits: DEFAULT_LIMITS,
    signal: AbortSignal.timeout(1000) });
  const body = requests.find(request => new URL(request.url).pathname === '/api/v1/chat/completions')!.body!;
  assert.equal(body.tools, undefined);
  assert.equal(body.tool_choice, undefined);
  assert.deepEqual(body.response_format, { type: 'json_schema', json_schema: {
    name: 'worker_answer', strict: true, schema: { type: 'object' },
  } });
});

test('generation fails closed on length, paid or mismatched generation proof and context overflow', async () => {
  const base = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const model = await registered(base);
  for (const [options, pattern] of [
    [{ finishReason: 'length' }, /output allowance/],
    [{ proof: { total_cost: 0.001 } }, /did not prove/],
    [{ proof: { provider_name: 'Another Provider' } }, /did not prove/],
    [{ proof: { model: modelName } }, /did not prove/],
    [{ metadataProvider: 'Another Provider' }, /routing metadata/],
    [{ metadataModel: 'nvidia/wrong-dated-endpoint:free' }, /routing metadata/],
  ] as const) {
    const provider = new OpenRouterProvider(config, fake(options), () => 'test-secret');
    await assert.rejects(provider.generate({ model, messages: [{ role: 'user', content: 'JSON' }], schema: {}, limits: DEFAULT_LIMITS,
      signal: AbortSignal.timeout(1000) }), pattern);
  }
  const provider = new OpenRouterProvider(config, fake(), () => 'test-secret');
  await assert.rejects(provider.generate({ model, messages: [{ role: 'user', content: 'x'.repeat(6000) }], schema: {}, limits: DEFAULT_LIMITS,
    signal: AbortSignal.timeout(1000) }), /conservative context allowance/);
});

test('catalog operations preserve cancellation reasons without making a request', async () => {
  let fetched = false;
  const provider = new OpenRouterProvider(config, (async () => { fetched = true; return Response.json({}); }) as typeof fetch, () => 'test-secret');
  const controller = new AbortController();
  const reason = new WorkerError('cancelled', 'test cancellation');
  controller.abort(reason);
  await assert.rejects(provider.discoverFreeEndpoints(modelName, controller.signal), error => error === reason);
  assert.equal(fetched, false);
});

test('generation bounds response bytes and does not expose upstream error bodies', async () => {
  const base = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const model = await registered(base);
  const request = { model, messages: [{ role: 'user' as const, content: 'JSON' }], schema: {}, limits: DEFAULT_LIMITS,
    signal: AbortSignal.timeout(1000) };
  const oversized = new OpenRouterProvider(config, fake({ completion: {
    id: 'gen-test', model: modelName, choices: [{ finish_reason: 'tool_calls', message: { tool_calls: [
      { type: 'function', function: { name: 'worker_action', arguments: JSON.stringify({ value: 'x'.repeat(70_000) }) } },
    ] } }],
    usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0 },
  } }), () => 'test-secret');
  await assert.rejects(oversized.generate(request), error => error instanceof WorkerError && error.code === 'provider_limit');

  const rejected = new OpenRouterProvider(config, fake({ completionStatus: 429,
    completion: { error: { message: 'SECRET echoed task text' } } }), () => 'test-secret');
  await assert.rejects(rejected.generate(request), error => error instanceof WorkerError && error.code === 'provider_error'
    && !error.message.includes('SECRET'));
});

test('tool-call output rejects wrong functions and multiple calls', async () => {
  const base = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const model = await registered(base);
  const request = { model, messages: [{ role: 'user' as const, content: 'JSON' }], schema: {}, limits: DEFAULT_LIMITS,
    signal: AbortSignal.timeout(1000) };
  for (const tool_calls of [
    [{ type: 'function', function: { name: 'different', arguments: '{}' } }],
    [{ type: 'function', function: { name: 'worker_action', arguments: '{}' } },
      { type: 'function', function: { name: 'worker_action', arguments: '{}' } }],
  ]) {
    const provider = new OpenRouterProvider(config, fake({ completion: {
      id: 'gen-test', model: modelName, choices: [{ finish_reason: 'tool_calls', message: { tool_calls } }],
      usage: { prompt_tokens: 1681, completion_tokens: 70, cost: 0 },
    } }), () => 'test-secret');
    await assert.rejects(provider.generate(request), /tool call/);
  }
});

test('generation receipt retries transient 404 without retrying inference', async () => {
  const base = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const model = await registered(base);
  const requests: { url: string; init?: RequestInit; body?: Record<string, unknown> }[] = [];
  const delays: number[] = [];
  const provider = new OpenRouterProvider(config, fake({ generationNotFoundCount: 2 }, requests), () => 'test-secret', {
    async wait(milliseconds) { delays.push(milliseconds); },
  });
  const result = await provider.generate({ model, messages: [{ role: 'user', content: 'JSON' }], schema: {}, limits: DEFAULT_LIMITS,
    signal: AbortSignal.timeout(1000) });
  assert.equal(result.stats.generationId, 'gen-test');
  assert.deepEqual(delays, [100, 200]);
  assert.equal(requests.filter(request => new URL(request.url).pathname === '/api/v1/chat/completions').length, 1);
  assert.equal(requests.filter(request => new URL(request.url).pathname === '/api/v1/generation').length, 3);
});

test('generation receipt persistent 404 exhausts the bounded wait schedule', async () => {
  const base = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const model = await registered(base);
  const requests: { url: string; init?: RequestInit; body?: Record<string, unknown> }[] = [];
  const delays: number[] = [];
  const provider = new OpenRouterProvider(config, fake({ generationNotFoundCount: 100 }, requests), () => 'test-secret', {
    async wait(milliseconds) { delays.push(milliseconds); },
  });
  await assert.rejects(provider.generate({ model, messages: [{ role: 'user', content: 'JSON' }], schema: {}, limits: DEFAULT_LIMITS,
    signal: AbortSignal.timeout(1000) }), /not available within the receipt window/);
  assert.equal(delays.reduce((sum, value) => sum + value, 0), 14_700);
  assert.equal(requests.filter(request => new URL(request.url).pathname === '/api/v1/chat/completions').length, 1);
  assert.equal(requests.filter(request => new URL(request.url).pathname === '/api/v1/generation').length, 9);
});

test('generation receipt wait observes task cancellation', async () => {
  const base = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const model = await registered(base);
  const controller = new AbortController();
  const reason = new WorkerError('cancelled', 'cancel receipt wait');
  const provider = new OpenRouterProvider(config, fake({ generationNotFoundCount: 1 }), () => 'test-secret', {
    async wait(_milliseconds, signal) {
      controller.abort(reason);
      assert.equal(signal.aborted, true);
      throw signal.reason;
    },
  });
  await assert.rejects(provider.generate({ model, messages: [{ role: 'user', content: 'JSON' }], schema: {}, limits: DEFAULT_LIMITS,
    signal: controller.signal }), error => {
      assert.ok(error instanceof WorkerError);
      assert.equal(error.code, 'cancelled');
      assert.equal(error.details?.phase, 'receipt');
      assert.equal(error.stats?.promptTokens, 1681);
      assert.equal(error.stats?.outputTokens, 70);
      return true;
    });
});

test('large remote input budget admits above 64 KiB and rejects above 128 KiB before inference', async () => {
  const base = new OpenRouterProvider(config, fake(), () => 'test-secret');
  const model = { ...(await registered(base)), contextTokens: 262_144 };
  const requests: { url: string; init?: RequestInit; body?: Record<string, unknown> }[] = [];
  const provider = new OpenRouterProvider(config, fake({}, requests), () => 'test-secret');
  const limits = { ...DEFAULT_LIMITS, contextTokens: 262_144, inputBytes: 131_072 };
  const accepted = await provider.generate({ model, messages: [{ role: 'user', content: 'x'.repeat(70_000) }], schema: {}, limits,
    signal: AbortSignal.timeout(1000) });
  assert.equal(accepted.content, '{"ok":true}');
  assert.equal(requests.filter(request => new URL(request.url).pathname === '/api/v1/chat/completions').length, 1);

  await assert.rejects(provider.generate({ model, messages: [{ role: 'user', content: 'x'.repeat(131_072) }], schema: {}, limits,
    signal: AbortSignal.timeout(1000) }), error => error instanceof WorkerError && error.code === 'context_limit');
  assert.equal(requests.filter(request => new URL(request.url).pathname === '/api/v1/chat/completions').length, 1);
});
