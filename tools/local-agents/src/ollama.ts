import { WorkerError, requiresQualification, type ContextProof, type GenerateRequest, type Limits, type LocalModel, type RegisteredModel, type ModelProvider, type ProviderHealth } from './types.js';

type Json = Record<string, any>;
export class OllamaProvider implements ModelProvider {
  readonly id = 'ollama';
  readonly locality = 'local' as const;
  readonly baseUrl: string;
  constructor(url: string, private readonly fetcher: typeof fetch = fetch) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(parsed.hostname) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash)
      throw new WorkerError('local_only', 'Ollama must use a literal loopback HTTP address without credentials, paths or redirects');
    this.baseUrl = parsed.origin;
  }

  private async json(path: string, body: unknown, signal: AbortSignal, maxBytes = 1048576): Promise<Json> {
    const response = await this.fetcher(this.baseUrl + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal,
      headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const reader = response.body?.getReader();
    if (!reader) throw new WorkerError('provider_error', 'Ollama returned no response body');
    const chunks: Uint8Array[] = []; let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) throw new WorkerError('provider_limit', 'Ollama response exceeded the byte allowance');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkerError('provider_error', 'Ollama returned an invalid response');
    const object = value as Json;
    if (!response.ok) {
      const message = String(object.error ?? 'Ollama request failed');
      // Never return arbitrary upstream bodies (which can echo task contents) as errors.
      throw new WorkerError(/context|length|too long|truncat/i.test(message) ? 'context_limit' : 'provider_error', `Ollama rejected the request (HTTP ${response.status})`);
    }
    return object;
  }

  async inspect(model: LocalModel, signal = AbortSignal.timeout(10000)): Promise<{ version: string; digest: string; quantization: string }> {
    if (/^gpt-oss(?::|$)/i.test(model.model) && typeof model.think !== 'string') {
      throw new WorkerError('invalid_config', 'GPT-OSS requires a low, medium, or high reasoning level.');
    }
    if (model.provider !== 'ollama' || /cloud|https?:|[/\\]{2}/i.test(model.model)) throw new WorkerError('local_only', 'Only registered local model identities are admitted');
    const status = await this.json('/api/status', undefined, signal);
    if (status.cloud?.disabled !== true) throw new WorkerError('local_only', 'Ollama cloud must be disabled on the running server');
    const version = await this.json('/api/version', undefined, signal);
    const tags = await this.json('/api/tags', undefined, signal);
    const installed = tags.models?.find((entry: Json) => entry.name === model.model || entry.model === model.model);
    const expected = model.digest.replace(/^sha256:/, '');
    if (!installed || installed.digest?.replace(/^sha256:/, '') !== expected || !(installed.size > 0))
      throw new WorkerError('model_unavailable', 'The approved model digest is not installed');
    const shown = await this.json('/api/show', { model: model.model }, signal);
    if (shown.remote_host || shown.remote_model || shown.details?.remote_host || shown.model_info?.['general.architecture'] === 'remote')
      throw new WorkerError('local_only', 'Remote-backed Ollama models are not admitted');
    if (!shown.model_info?.['general.architecture'] || shown.details?.quantization_level !== model.quantization)
      throw new WorkerError('model_unavailable', 'Installed model metadata differs from the approved registration');
    if (typeof version.version !== 'string') throw new WorkerError('provider_error', 'Ollama did not report a version');
    return { version: version.version, digest: installed.digest, quantization: shown.details.quantization_level };
  }

  async verify(model: RegisteredModel, limits: Limits, signal: AbortSignal): Promise<ProviderHealth> {
    if (model.provider !== 'ollama') return { available: false, reason: 'Ollama only accepts local model registrations' };
    try {
      const installed = await this.inspect(model, signal);
      if (!requiresQualification(model)) return { available: true, version: installed.version };
      const proof = model.contextProof;
      if (!proof || proof.ollamaVersion !== installed.version || proof.digest.replace(/^sha256:/, '') !== installed.digest.replace(/^sha256:/, '') ||
          proof.contextTokens !== limits.contextTokens || proof.outputTokens !== limits.outputTokens ||
          !proof.singleOverflowRejected || !proof.historyOverflowRejected)
        return { available: false, version: installed.version, reason: 'Context overflow guards have not been verified for this model/runtime/settings tuple' };
      return { available: true, version: installed.version };
    } catch (error) {
      if (signal.aborted) throw error;
      return { available: false, reason: error instanceof WorkerError ? `${error.code}: ${error.message}` : 'Local Ollama is unavailable' };
    }
  }

  async generate(request: GenerateRequest) {
    if (request.model.provider !== 'ollama') throw new WorkerError('local_only', 'Ollama does not accept remote model registrations');
    const verified = await this.verify(request.model, request.limits, request.signal);
    if (!verified.available) throw new WorkerError('model_unavailable', verified.reason ?? 'Local model unavailable');
    const { model, limits, messages, schema, signal } = request;
    if (Buffer.byteLength(JSON.stringify({ messages, format: schema })) > limits.inputBytes)
      throw new WorkerError('context_limit', 'Complete inference input exceeds the byte allowance');
    const value = await this.json('/api/chat', {
      model: model.model, messages, format: schema, stream: false, think: model.think,
      truncate: false, shift: false, keep_alive: '5m',
      options: { num_ctx: limits.contextTokens, num_predict: limits.outputTokens, temperature: model.temperature },
    }, signal, Math.max(65536, limits.resultBytes * 4));
    if (value.done !== true || typeof value.message?.content !== 'string') throw new WorkerError('provider_error', 'Ollama did not produce a completed content message');
    if (value.model !== model.model) throw new WorkerError('model_unavailable', 'Ollama reported a different model identity');
    if (Buffer.byteLength(value.message.content) > limits.resultBytes) throw new WorkerError('provider_limit', 'Generated content exceeded the result allowance');
    return { content: value.message.content, doneReason: value.done_reason as string | undefined,
      stats: { promptTokens: value.prompt_eval_count as number | undefined, outputTokens: value.eval_count as number | undefined,
        totalDurationNs: value.total_duration as number | undefined, loadDurationNs: value.load_duration as number | undefined } };
  }

  /** Explicit installation trial; produces a receipt, never enables a profile automatically. */
  async probeContext(model: LocalModel, limits: Limits, signal: AbortSignal): Promise<ContextProof> {
    const installed = await this.inspect(model, signal);
    const content = 'context_boundary_probe '.repeat(limits.contextTokens * 2);
    const histories = [ [{ role: 'user', content }],
      [{ role: 'user', content: content.slice(0, content.length / 2) }, { role: 'assistant', content: 'acknowledged' }, { role: 'user', content: content.slice(content.length / 2) }] ];
    const rejected: boolean[] = [];
    for (const messages of histories) {
      try {
        await this.json('/api/chat', { model: model.model, messages, stream: false, think: model.think,
          truncate: false, shift: false, keep_alive: '5m', options: { num_ctx: limits.contextTokens, num_predict: limits.outputTokens } }, signal);
        rejected.push(false);
      } catch (error) {
        if (signal.aborted) throw error;
        if (!(error instanceof WorkerError) || error.code !== 'context_limit') throw error;
        rejected.push(true);
      }
    }
    return { ollamaVersion: installed.version, digest: installed.digest, contextTokens: limits.contextTokens,
      outputTokens: limits.outputTokens, singleOverflowRejected: rejected[0] === true, historyOverflowRejected: rejected[1] === true, verifiedAt: new Date().toISOString() };
  }
}
