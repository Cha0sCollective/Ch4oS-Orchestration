import test from 'node:test';
import assert from 'node:assert/strict';
import { OllamaProvider } from '../ollama.js';
import { DEFAULT_LIMITS, type LocalModel } from '../types.js';
const model: LocalModel = { id:'test', provider:'ollama', model:'test:local', digest:'a'.repeat(64), quantization:'Q4_K_M', think:false, temperature:0.2 };
function fake(overrides: Record<string, unknown> = {}): typeof fetch {
  return (async (url: string|URL|Request, init?: RequestInit) => {
    assert.equal(init?.redirect, 'error');
    const defaults: Record<string, unknown> = {
      '/api/status': { cloud: { disabled: true } }, '/api/version': { version:'0.33.2' },
      '/api/tags': { models:[{name:model.model, digest:model.digest, size:123}] },
      '/api/show': { model_info:{'general.architecture':'qwen'}, details:{quantization_level:'Q4_K_M'} },
    };
    return Response.json({ ...defaults, ...overrides }[new URL(String(url)).pathname]);
  }) as typeof fetch;
}
test('rejects remote, redirected, credential-bearing and nonliteral addresses', () => {
  for (const url of ['https://openrouter.ai','http://localhost:11434','http://127.0.0.1/api','http://user@127.0.0.1','http://127.0.0.1?x=1']) assert.throws(() => new OllamaProvider(url));
});
test('requires cloud disabled, installed digest and local model metadata', async () => {
  await assert.rejects(new OllamaProvider('http://127.0.0.1',fake({'/api/status':{cloud:{disabled:false}}})).inspect(model));
  await assert.rejects(new OllamaProvider('http://127.0.0.1',fake({'/api/show':{remote_host:'https://remote'}})).inspect(model));
  await assert.rejects(new OllamaProvider('http://127.0.0.1',fake()).inspect({...model,digest:'b'.repeat(64)}));
  await assert.rejects(new OllamaProvider('http://127.0.0.1',fake()).inspect({...model,model:'test:cloud'}));
  assert.equal((await new OllamaProvider('http://127.0.0.1',fake()).inspect(model)).version,'0.33.2');
});
test('requires context proof bound to runtime, digest and settings',async()=>{
  const provider=new OllamaProvider('http://127.0.0.1',fake());
  assert.equal((await provider.verify(model,DEFAULT_LIMITS,AbortSignal.timeout(1000))).available,false);
  const qualified={...model,contextProof:{ollamaVersion:'0.33.2',digest:model.digest,contextTokens:8192,outputTokens:2048,singleOverflowRejected:true,historyOverflowRejected:true,verifiedAt:new Date().toISOString()}};
  assert.equal((await provider.verify(qualified,DEFAULT_LIMITS,AbortSignal.timeout(1000))).available,true);
  assert.equal((await provider.verify(qualified,{...DEFAULT_LIMITS,contextTokens:16384},AbortSignal.timeout(1000))).available,false);
});

test('preserves boolean and named reasoning settings in Ollama requests', async () => {
  for (const think of [false, true, 'low', 'medium', 'high'] as const) {
    const base = fake();
    const fetcher = (async (url, init) => {
      if (new URL(String(url)).pathname === '/api/chat') {
        assert.equal(JSON.parse(String(init?.body)).think, think);
        return Response.json({ done: true, model: model.model, message: { content: '{}' }, prompt_eval_count: 1, eval_count: 1 });
      }
      return base(url, init);
    }) as typeof fetch;
    await new OllamaProvider('http://127.0.0.1', fetcher).generate({
      model: { ...model, think, contextProof: { ollamaVersion: '0.33.2', digest: model.digest, contextTokens: 8192, outputTokens: 2048,
        singleOverflowRejected: true, historyOverflowRejected: true, verifiedAt: new Date().toISOString() } },
      messages: [], schema: {}, limits: DEFAULT_LIMITS, signal: AbortSignal.timeout(1000),
    });
  }
  await assert.rejects(new OllamaProvider('http://127.0.0.1', fake()).inspect({ ...model, model: 'gpt-oss:20b', think: false }), /requires a low/);
});
