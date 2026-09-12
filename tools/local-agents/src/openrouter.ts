import { createHash } from 'node:crypto';
import {
  WorkerError,
  type GenerateRequest,
  type Limits,
  type ModelProvider,
  type OpenRouterConfig,
  type OpenRouterModel,
  type ProviderHealth,
  type RegisteredModel,
} from './types.js';

const ORIGIN = 'https://openrouter.ai';
const CATALOG_LIMIT_BYTES = 4 * 1024 * 1024;
const CONTEXT_TEMPLATE_RESERVE_TOKENS = 512;
const RECEIPT_RETRY_DELAYS_MS = [100, 200, 400, 800, 1600, 3200, 6400, 2000] as const;
const BASE_PARAMETERS = ['max_tokens', 'temperature'] as const;
type JsonObject = Record<string, unknown>;

export interface FreeEndpointIdentity {
  model: string;
  endpointId: string;
  endpointName: string;
  endpointModel: string;
  providerSlug: string;
  providerName: string;
  contextTokens: number;
  maxOutputTokens: number;
  catalogFingerprint: string;
  supportedParameters: string[];
  pricing: Record<string, string>;
  outputMode: OpenRouterModel['outputMode'];
}

export type OpenRouterCredentialResolver = (environmentVariable: string) => string | undefined;
export interface OpenRouterDependencies {
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, milliseconds);
    function done(): void { signal.removeEventListener('abort', aborted); resolve(); }
    function aborted(): void { clearTimeout(timer); reject(signal.reason ?? new WorkerError('cancelled', 'OpenRouter request was cancelled')); }
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
  });
}

function object(value: unknown, message: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkerError('provider_error', message);
  return value as JsonObject;
}

function string(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function nonnegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
function sortedStrings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) return [];
  return [...new Set(value as string[])].sort((a, b) => a.localeCompare(b, 'en-US'));
}
function sortedBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as JsonObject)
    .filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
    .sort(([left], [right]) => left.localeCompare(right, 'en-US')));
}
function canonicalPricing(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as JsonObject).sort(([left], [right]) => left.localeCompare(right, 'en-US'));
  if (entries.length === 0) return undefined;
  const pricing: Record<string, string> = {};
  for (const [dimension, raw] of entries) {
    if ((typeof raw !== 'string' && typeof raw !== 'number') || raw === '') return undefined;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount !== 0) return undefined;
    pricing[dimension] = String(raw);
  }
  return pricing;
}
function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function splitModel(model: string): [string, string] {
  const parts = model.split('/');
  if (parts.length !== 2 || parts.some(part => !part || /[\x00-\x20?#\\]/.test(part))
      || !model.endsWith(':free') || model === 'openrouter/free') {
    throw new WorkerError('model_unavailable', 'OpenRouter registrations must name one explicit :free model');
  }
  return [parts[0]!, parts[1]!];
}
function endpointModelFromName(endpointName: string, providerName: string): string | undefined {
  const prefix = `${providerName} | `;
  if (!endpointName.startsWith(prefix)) return undefined;
  const endpointModel = endpointName.slice(prefix.length);
  try { splitModel(endpointModel); }
  catch { return undefined; }
  return endpointModel;
}
function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw signal.reason ?? new WorkerError('cancelled', 'OpenRouter request was cancelled');
}

function validateRouterMetadata(value: unknown, model: OpenRouterModel, endpointModel: string): void {
  if (value === undefined) return; // Cache replays may omit router metadata; generation proof remains mandatory.
  const metadata = object(value, 'OpenRouter returned invalid routing metadata');
  const endpoints = object(metadata.endpoints, 'OpenRouter returned invalid endpoint routing metadata');
  if (!Array.isArray(endpoints.available)) throw new WorkerError('provider_error', 'OpenRouter omitted selected endpoint routing metadata');
  const selected = endpoints.available.map(entry => object(entry, 'OpenRouter returned invalid endpoint routing metadata'))
    .filter(entry => entry.selected === true);
  if (metadata.requested !== model.model || metadata.strategy !== 'direct' || metadata.attempt !== 1
      || (Array.isArray(metadata.pipeline) && metadata.pipeline.length > 0)
      || selected.length !== 1 || selected[0]!.provider !== model.providerName || selected[0]!.model !== endpointModel) {
    throw new WorkerError('provider_error', 'OpenRouter routing metadata does not prove the pinned direct endpoint');
  }
}

export class OpenRouterProvider implements ModelProvider {
  readonly id = 'openrouter';
  readonly locality = 'remote' as const;

  constructor(
    private readonly config: OpenRouterConfig | undefined,
    private readonly fetcher: typeof fetch = fetch,
    private readonly resolveCredential: OpenRouterCredentialResolver = name => process.env[name],
    private readonly dependencies: OpenRouterDependencies = {},
  ) {}

  private validatedConfig(): OpenRouterConfig {
    const config = this.config;
    if (!config) throw new WorkerError('provider_unavailable', 'OpenRouter is not configured');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(config.apiKeyEnv) || config.maxCostUsd !== 0
        || !Array.isArray(config.allowedRepositories) || typeof config.allowSuppliedSources !== 'boolean'
        || !['allow', 'deny'].includes(config.dataCollection)) {
      throw new WorkerError('invalid_config', 'OpenRouter configuration is invalid or permits nonzero cost');
    }
    return config;
  }

  private credential(): string {
    const config = this.validatedConfig();
    const credential = this.resolveCredential(config.apiKeyEnv);
    if (typeof credential !== 'string' || credential.length < 1 || /[\r\n]/.test(credential)) {
      throw new WorkerError('credential_unavailable', 'The configured OpenRouter credential is unavailable');
    }
    return credential;
  }

  private async json(path: string, init: RequestInit, signal: AbortSignal, maxBytes: number, authenticated = true,
    retryGenerationNotFound = false): Promise<JsonObject> {
    throwIfAborted(signal);
    let response: Response;
    try {
      response = await this.fetcher(`${ORIGIN}${path}`, {
        ...init,
        redirect: 'error',
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...(authenticated ? { Authorization: `Bearer ${this.credential()}` } : {}),
          ...(init.headers ?? {}),
        },
      });
    } catch (error) {
      throwIfAborted(signal);
      throw new WorkerError('provider_error', 'OpenRouter could not be reached');
    }
    if (response.url && !response.url.startsWith(`${ORIGIN}/api/v1/`)) {
      await response.body?.cancel().catch(() => {});
      throw new WorkerError('provider_error', 'OpenRouter returned an unexpected response origin');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new WorkerError('provider_error', 'OpenRouter returned no response body');
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        throwIfAborted(signal);
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) throw new WorkerError('provider_limit', 'OpenRouter response exceeded the byte allowance');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    let parsed: unknown;
    try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new WorkerError('provider_error', 'OpenRouter returned invalid JSON'); }
    const result = object(parsed, 'OpenRouter returned an invalid response');
    if (!response.ok) {
      if (retryGenerationNotFound && response.status === 404) {
        throw new WorkerError('generation_not_ready', 'OpenRouter generation proof is not ready');
      }
      throw new WorkerError('provider_error', `OpenRouter rejected the request (HTTP ${response.status})`);
    }
    return result;
  }

  private async generationProof(generationId: string, signal: AbortSignal): Promise<JsonObject> {
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await this.json(`/api/v1/generation?id=${encodeURIComponent(generationId)}`, { method: 'GET' }, signal,
          256 * 1024, true, true);
        return object(result.data, 'OpenRouter omitted generation proof');
      } catch (error) {
        throwIfAborted(signal);
        if (!(error instanceof WorkerError) || error.code !== 'generation_not_ready') throw error;
        const delay = RECEIPT_RETRY_DELAYS_MS[attempt];
        if (delay === undefined) throw new WorkerError('provider_error', 'OpenRouter generation proof was not available within the receipt window');
        await (this.dependencies.wait ?? wait)(delay, signal);
      }
    }
  }

  private async catalog(modelName: string, signal: AbortSignal): Promise<{ model: JsonObject; endpoints: JsonObject[] }> {
    const [author, slug] = splitModel(modelName);
    const encoded = `${encodeURIComponent(author)}/${encodeURIComponent(slug)}`;
    const [modelResult, endpointResult] = await Promise.all([
      this.json(`/api/v1/model/${encoded}`, { method: 'GET' }, signal, CATALOG_LIMIT_BYTES, false),
      this.json(`/api/v1/models/${encoded}/endpoints`, { method: 'GET' }, signal, CATALOG_LIMIT_BYTES, false),
    ]);
    const model = object(modelResult.data, 'OpenRouter returned invalid model catalog data');
    const endpointData = object(endpointResult.data, 'OpenRouter returned invalid endpoint catalog data');
    if (model.id !== modelName || endpointData.id !== modelName || !Array.isArray(endpointData.endpoints)) {
      throw new WorkerError('model_unavailable', 'OpenRouter catalog identity differs from the requested model');
    }
    return { model, endpoints: endpointData.endpoints.map(value => object(value, 'OpenRouter returned an invalid endpoint record')) };
  }

  private identities(model: JsonObject, endpoint: JsonObject): FreeEndpointIdentity[] {
    const modelName = string(model.id);
    const tag = string(endpoint.tag);
    const endpointName = string(endpoint.name);
    const providerName = string(endpoint.provider_name);
    const endpointModel = endpointName && providerName ? endpointModelFromName(endpointName, providerName) : undefined;
    const modelContext = nonnegativeInteger(model.context_length);
    const endpointContext = nonnegativeInteger(endpoint.context_length);
    const maxOutputTokens = nonnegativeInteger(endpoint.max_completion_tokens);
    const contextTokens = Math.min(modelContext ?? 0, endpointContext ?? 0);
    const modelPricing = canonicalPricing(model.pricing);
    const endpointPricing = canonicalPricing(endpoint.pricing);
    const modelParameters = sortedStrings(model.supported_parameters);
    const endpointParameters = sortedStrings(endpoint.supported_parameters);
    const supportedToolChoice = sortedBooleanRecord(endpoint.supports_tool_choice);
    if (!modelName || !tag || !endpointName || !endpointModel || !providerName || contextTokens < 1 || !maxOutputTokens || !modelPricing || !endpointPricing
        || endpoint.status !== 0
        || endpoint.model_id !== modelName
        || BASE_PARAMETERS.some(parameter => !modelParameters.includes(parameter) || !endpointParameters.includes(parameter))) return [];
    const modes: OpenRouterModel['outputMode'][] = [];
    if (['response_format', 'structured_outputs'].every(parameter => modelParameters.includes(parameter) && endpointParameters.includes(parameter))) {
      modes.push('json-schema');
    }
    if (['tools', 'tool_choice'].every(parameter => modelParameters.includes(parameter) && endpointParameters.includes(parameter))
        && supportedToolChoice.function === true) {
      modes.push('tool-call');
    }
    return modes.map(outputMode => {
      const fingerprintInput = {
        format: 'openrouter-catalog-v3', model: modelName, endpointId: tag, endpointName, endpointModel,
        providerSlug: tag, providerName, outputMode,
        contextTokens, maxCompletionTokens: maxOutputTokens,
        maxPromptTokens: nonnegativeInteger(endpoint.max_prompt_tokens) ?? null,
        quantization: string(endpoint.quantization) ?? null, supportsImplicitCaching: endpoint.supports_implicit_caching ?? null,
        supportedToolChoice,
        modelPricing, endpointPricing, modelParameters, endpointParameters,
      };
      return {
        model: modelName, endpointId: tag, endpointName, endpointModel, providerSlug: tag, providerName, outputMode, contextTokens, maxOutputTokens,
        catalogFingerprint: sha256(fingerprintInput), supportedParameters: endpointParameters, pricing: endpointPricing,
      };
    });
  }

  /** Read-only discovery for an operator to review and pin; it never enables a model. */
  async discoverFreeEndpoints(modelName: string, signal = AbortSignal.timeout(15_000)): Promise<FreeEndpointIdentity[]> {
    this.validatedConfig();
    const catalog = await this.catalog(modelName, signal);
    const candidates = catalog.endpoints.flatMap(endpoint => this.identities(catalog.model, endpoint));
    const counts = new Map<string, number>();
    for (const candidate of candidates) {
      const key = `${candidate.providerSlug}\0${candidate.outputMode}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return candidates.filter(candidate => counts.get(`${candidate.providerSlug}\0${candidate.outputMode}`) === 1);
  }

  /** Inspect one registered endpoint against the current remote catalog. */
  async inspect(model: OpenRouterModel, signal = AbortSignal.timeout(15_000)): Promise<FreeEndpointIdentity> {
    if (model.provider !== 'openrouter' || model.endpointId !== model.providerSlug) {
      throw new WorkerError('model_unavailable', 'OpenRouter model and endpoint identity are not exactly pinned');
    }
    const candidates = await this.discoverFreeEndpoints(model.model, signal);
    const candidate = candidates.find(value => value.endpointId === model.endpointId && value.providerName === model.providerName
      && value.outputMode === model.outputMode);
    if (!candidate || candidate.catalogFingerprint !== model.catalogFingerprint || model.contextTokens < 1
        || model.contextTokens > candidate.contextTokens || !Number.isSafeInteger(model.contextTokens)) {
      throw new WorkerError('model_unavailable', 'OpenRouter model registration differs from the current free endpoint catalog');
    }
    return candidate;
  }

  private async qualifiedEndpoint(model: OpenRouterModel, limits: Limits, signal: AbortSignal): Promise<FreeEndpointIdentity> {
    this.credential();
    const endpoint = await this.inspect(model, signal);
    if (!Number.isSafeInteger(limits.contextTokens) || limits.contextTokens < 1 || limits.contextTokens > model.contextTokens
        || limits.contextTokens > endpoint.contextTokens || !Number.isSafeInteger(limits.outputTokens) || limits.outputTokens < 1
        || limits.outputTokens > endpoint.maxOutputTokens || !Number.isSafeInteger(limits.inputBytes) || limits.inputBytes < 1
        || !Number.isSafeInteger(limits.resultBytes) || limits.resultBytes < 1) {
      throw new WorkerError('model_unavailable', 'Configured request limits exceed the pinned OpenRouter endpoint bounds');
    }
    return endpoint;
  }

  async verify(model: RegisteredModel, limits: Limits, signal: AbortSignal): Promise<ProviderHealth> {
    try {
      if (model.provider !== 'openrouter') throw new WorkerError('model_unavailable', 'This provider only accepts OpenRouter model registrations');
      const endpoint = await this.qualifiedEndpoint(model, limits, signal);
      return { available: true, version: endpoint.catalogFingerprint };
    } catch (error) {
      throwIfAborted(signal);
      return { available: false, reason: error instanceof WorkerError ? `${error.code}: ${error.message}` : 'OpenRouter is unavailable' };
    }
  }

  async generate(request: GenerateRequest) {
    if (request.model.provider !== 'openrouter') throw new WorkerError('model_unavailable', 'This provider only accepts OpenRouter model registrations');
    const { model, messages, schema, limits, signal } = request;
    const endpoint = await this.qualifiedEndpoint(model, limits, signal);
    if (!Number.isFinite(model.temperature) || model.temperature < 0 || model.temperature > 2) {
      throw new WorkerError('invalid_config', 'OpenRouter temperature must be between zero and two');
    }
    const outputContract = model.outputMode === 'json-schema' ? {
      response_format: { type: 'json_schema', json_schema: { name: 'worker_answer', strict: true, schema } },
    } : {
      tools: [{ type: 'function', function: { name: 'worker_action', description: 'Return the requested structured worker answer.', parameters: schema } }],
      tool_choice: { type: 'function', function: { name: 'worker_action' } },
    };
    const body = {
      model: model.model,
      messages,
      ...outputContract,
      max_tokens: limits.outputTokens,
      temperature: model.temperature,
      stream: false,
      transforms: [],
      provider: {
        only: [model.providerSlug], allow_fallbacks: false, require_parameters: true,
        max_price: { prompt: 0, completion: 0, request: 0, image: 0 }, data_collection: this.validatedConfig().dataCollection,
      },
    };
    let serializedBody: string;
    try { serializedBody = JSON.stringify(body); }
    catch { throw new WorkerError('invalid_input', 'OpenRouter input is not serializable'); }
    const inputBytes = Buffer.byteLength(serializedBody, 'utf8');
    if (inputBytes > limits.inputBytes
        || inputBytes + limits.outputTokens + CONTEXT_TEMPLATE_RESERVE_TOKENS > Math.min(limits.contextTokens, model.contextTokens)) {
      throw new WorkerError('context_limit', 'Complete OpenRouter input cannot fit the conservative context allowance');
    }
    const result = await this.json('/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'X-OpenRouter-Metadata': 'enabled' },
      body: serializedBody,
    }, signal, Math.min(CATALOG_LIMIT_BYTES, Math.max(65_536, limits.resultBytes * 4)));
    const generationId = string(result.id);
    if (!Array.isArray(result.choices) || result.choices.length !== 1) {
      throw new WorkerError('provider_error', 'OpenRouter did not return exactly one completion choice');
    }
    const choice = object(result.choices[0], 'OpenRouter returned no completion choice');
    const finishReason = string(choice.finish_reason);
    const message = object(choice.message, 'OpenRouter returned no completion message');
    let content: string | undefined;
    if (model.outputMode === 'json-schema') {
      content = string(message.content);
      if (finishReason === 'length') throw new WorkerError('context_limit', 'OpenRouter exhausted the requested output allowance');
      if (finishReason !== 'stop') throw new WorkerError('provider_error', 'OpenRouter did not return a complete structured response');
    } else {
      if (finishReason === 'length') throw new WorkerError('context_limit', 'OpenRouter exhausted the requested output allowance');
      if (finishReason !== 'tool_calls' || !Array.isArray(message.tool_calls) || message.tool_calls.length !== 1) {
        throw new WorkerError('provider_error', 'OpenRouter did not return exactly one worker_action tool call');
      }
      const call = object(message.tool_calls[0], 'OpenRouter returned an invalid worker_action tool call');
      const fn = object(call.function, 'OpenRouter returned an invalid worker_action function call');
      content = string(fn.arguments);
      if (call.type !== 'function' || fn.name !== 'worker_action' || content === undefined) {
        throw new WorkerError('provider_error', 'OpenRouter returned a different tool call');
      }
      try { object(JSON.parse(content), 'OpenRouter worker_action arguments must be a JSON object'); }
      catch (error) {
        if (error instanceof WorkerError) throw error;
        throw new WorkerError('provider_error', 'OpenRouter worker_action arguments are invalid JSON');
      }
    }
    const usage = object(result.usage, 'OpenRouter omitted response usage proof');
    if (!generationId || generationId.length > 256 || result.model !== model.model || content === undefined
        || nonnegativeInteger(usage.prompt_tokens) === undefined || nonnegativeInteger(usage.completion_tokens) === undefined
        || finiteNumber(usage.cost) !== 0) {
      throw new WorkerError('provider_error', 'OpenRouter completion identity or zero-cost usage proof is missing');
    }
    if (Buffer.byteLength(content, 'utf8') > limits.resultBytes) throw new WorkerError('provider_limit', 'Generated content exceeded the result allowance');
    validateRouterMetadata(result.openrouter_metadata, model, endpoint.endpointModel);

    const proof = await this.generationProof(generationId, signal);
    const routedPromptTokens = nonnegativeInteger(proof.tokens_prompt);
    const routedOutputTokens = nonnegativeInteger(proof.tokens_completion);
    const promptTokens = nonnegativeInteger(proof.native_tokens_prompt);
    const outputTokens = nonnegativeInteger(proof.native_tokens_completion);
    if (proof.id !== generationId || proof.model !== endpoint.endpointModel || proof.provider_name !== model.providerName
        || proof.is_byok !== false || finiteNumber(proof.total_cost) !== 0 || finiteNumber(proof.usage) !== 0
        || routedPromptTokens === undefined || routedOutputTokens === undefined
        || promptTokens === undefined || outputTokens === undefined || outputTokens > limits.outputTokens
        || promptTokens !== usage.prompt_tokens || outputTokens !== usage.completion_tokens) {
      throw new WorkerError('provider_error', 'OpenRouter generation did not prove the pinned free endpoint identity');
    }
    return {
      content,
      doneReason: 'stop',
      stats: { promptTokens, outputTokens, costUsd: 0, generationId, endpointId: model.endpointId, providerName: model.providerName },
    };
  }
}
