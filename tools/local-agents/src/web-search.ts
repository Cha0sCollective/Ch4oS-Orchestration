import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink, type FileHandle } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { OpenRouterProvider, type FreeEndpointIdentity, type OpenRouterCredentialResolver } from './openrouter.js';
import { WorkerError, type FailureDetails, type OpenRouterModel, type ProviderStats } from './types.js';

const ORIGIN = 'https://openrouter.ai';
const SEARCH_KEY_ENV = 'OPENROUTER_SEARCH_API_KEY';
const SEARCH_COST_USD = 0.007;
const MAX_LIFETIME_USD = 5;
const MAX_ATTEMPTS = 714;
const MAX_QUERY_BYTES = 2_048;
const MAX_ANSWER_BYTES = 16_384;
const MAX_COMPLETION_BYTES = 512 * 1_024;
const LOCK_WAIT_MS = 5_000;
const LOCK_POLL_MS = 10;
const RECEIPT_RETRY_DELAYS_MS = [250, 500, 1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000] as const;
type JsonObject = Record<string, unknown>;

export interface WebSearchConfig {
  model: OpenRouterModel;
  lifetimeMaxUsd: number;
  storeDir: string;
  keyEnv: 'OPENROUTER_SEARCH_API_KEY';
  dataCollection?: 'deny' | 'allow';
  timeoutMs?: number;
}

export interface WebSearchRequest {
  requestKey: string;
  query: string;
}

export interface WebSearchOptions { signal?: AbortSignal }

export interface WebSearchCitation {
  url: string;
  title?: string;
}

export interface WebSearchStatistics {
  reservedCostUsd: number;
  actualCostUsd: number;
  promptTokens: number;
  outputTokens: number;
  generationId: string;
  model: string;
  endpointId: string;
  providerName: string;
  dataCollection: 'deny' | 'allow';
  engine: 'exa';
  resultCount: number;
}

export interface WebSearchResult {
  answer: string;
  citations: WebSearchCitation[];
  retrievedAt: string;
  statistics: WebSearchStatistics;
}

export interface WebSearchCapabilities {
  available: boolean;
  reason?: string;
  credentialAvailable: boolean;
  model: string;
  endpointId: string;
  providerName: string;
  dataCollection: 'deny' | 'allow';
  engine: 'exa';
  mode: 'fast';
  maxResults: 5;
  costPerAttemptUsd: number;
  lifetimeMaxUsd: number;
  attemptLimit: number;
  reservedAttempts: number;
  remainingAttempts: number;
  reservedUsd: number;
  remainingUsd: number;
}

export interface WebSearchDependencies {
  fetcher?: typeof fetch;
  resolveCredential?: OpenRouterCredentialResolver;
  now?: () => Date;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}

export interface WebSearchSafeError {
  code: string;
  message: string;
  details?: FailureDetails;
  statistics?: ProviderStats;
}

interface Reservation {
  requestKey: string;
  queryHash: string;
  reservedAt: string;
}

interface Ledger {
  version: 1;
  costPerAttemptUsd: typeof SEARCH_COST_USD;
  reservations: Reservation[];
}

interface CachedResult {
  version: 1;
  requestKey: string;
  queryHash: string;
  result: WebSearchResult;
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
function diagnosticGenerationId(value: unknown): string | undefined {
  return typeof value === 'string' && /^gen-[A-Za-z0-9_-]{1,240}$/.test(value) ? value : undefined;
}
function observedStatistics(value: JsonObject): ProviderStats | undefined {
  const usage = value.usage && typeof value.usage === 'object' && !Array.isArray(value.usage) ? value.usage as JsonObject : undefined;
  const promptTokens = nonnegativeInteger(usage?.prompt_tokens);
  const outputTokens = nonnegativeInteger(usage?.completion_tokens);
  const costUsd = finiteNumber(usage?.cost);
  const generationId = diagnosticGenerationId(value.id);
  const statistics: ProviderStats = {
    ...(promptTokens !== undefined ? { promptTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(costUsd !== undefined && costUsd >= 0 ? { costUsd } : {}),
    ...(generationId ? { generationId } : {}),
  };
  return Object.keys(statistics).length ? statistics : undefined;
}
function phased(error: unknown, phase: string, details: FailureDetails = {}, statistics?: ProviderStats): WorkerError {
  if (error instanceof WorkerError) {
    return new WorkerError(error.code, error.message, { ...details, ...error.details, phase }, error.stats ?? statistics);
  }
  return new WorkerError('provider_error', 'OpenRouter could not complete the web search request', { ...details, phase }, statistics);
}
export function searchSafeError(error: unknown): WebSearchSafeError {
  if (!(error instanceof WorkerError)) return { code: 'web_search_failed', message: 'Web search failed; inspect local diagnostics.' };
  return {
    code: error.code,
    message: error.message,
    ...(error.details ? { details: { ...error.details } } : {}),
    ...(error.stats ? { statistics: { ...error.stats } } : {}),
  };
}
function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function hasOnlyKeys(value: object, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every(key => allowed.has(key));
}
function aborted(signal: AbortSignal): never {
  if (signal.reason instanceof WorkerError) throw signal.reason;
  if (signal.reason instanceof DOMException && signal.reason.name === 'TimeoutError') {
    throw new WorkerError('timed_out', 'Web search exceeded its deadline');
  }
  throw new WorkerError('cancelled', 'Web search was cancelled');
}
function throwIfAborted(signal: AbortSignal): void { if (signal.aborted) aborted(signal); }
function defaultWait(milliseconds: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, milliseconds);
    function done(): void { signal.removeEventListener('abort', cancel); resolve(); }
    function cancel(): void {
      clearTimeout(timer); signal.removeEventListener('abort', cancel);
      try { aborted(signal); } catch (error) { reject(error); }
    }
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

function validateConfig(value: unknown): asserts value is WebSearchConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WorkerError('invalid_config', 'Web search configuration is invalid');
  const config = value as Partial<WebSearchConfig>;
  if (!hasOnlyKeys(value, ['model', 'lifetimeMaxUsd', 'storeDir', 'keyEnv', 'dataCollection', 'timeoutMs'])
      || config.keyEnv !== SEARCH_KEY_ENV || typeof config.storeDir !== 'string' || !isAbsolute(config.storeDir) || !config.storeDir
      || typeof config.lifetimeMaxUsd !== 'number' || !Number.isFinite(config.lifetimeMaxUsd) || config.lifetimeMaxUsd < SEARCH_COST_USD
      || config.lifetimeMaxUsd > MAX_LIFETIME_USD
      || (config.dataCollection !== undefined && !['deny', 'allow'].includes(config.dataCollection))
      || (config.timeoutMs !== undefined && (!Number.isSafeInteger(config.timeoutMs) || config.timeoutMs < 1_000 || config.timeoutMs > 120_000))
      || !config.model || typeof config.model !== 'object'
      || !hasOnlyKeys(config.model, ['id', 'provider', 'model', 'endpointId', 'providerSlug', 'providerName', 'catalogFingerprint', 'outputMode', 'temperature', 'contextTokens'])
      || config.model.provider !== 'openrouter'
      || typeof config.model.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(config.model.id)
      || typeof config.model.model !== 'string' || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+:free$/.test(config.model.model)
      || config.model.model === 'openrouter/free' || typeof config.model.endpointId !== 'string' || !config.model.endpointId
      || config.model.endpointId.length > 256 || config.model.endpointId !== config.model.providerSlug
      || typeof config.model.providerName !== 'string' || !config.model.providerName || config.model.providerName.length > 256
      || typeof config.model.catalogFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(config.model.catalogFingerprint)
      || !['json-schema', 'tool-call'].includes(config.model.outputMode)
      || !Number.isFinite(config.model.temperature) || config.model.temperature < 0 || config.model.temperature > 2
      || !Number.isSafeInteger(config.model.contextTokens) || config.model.contextTokens < 4_096) {
    throw new WorkerError('invalid_config', 'Web search configuration is invalid');
  }
}

function validateRequest(request: WebSearchRequest): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(request.requestKey)
      || typeof request.query !== 'string' || request.query.trim() !== request.query || request.query.length < 1
      || request.query.length > 1_000 || Buffer.byteLength(request.query, 'utf8') > MAX_QUERY_BYTES
      || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(request.query)) {
    throw new WorkerError('invalid_input', 'Web search request key or query is invalid');
  }
  return hash(request.query);
}

function parseLedger(value: unknown): Ledger {
  const record = object(value, 'Web search budget ledger is invalid');
  if (record.version !== 1 || record.costPerAttemptUsd !== SEARCH_COST_USD || !Array.isArray(record.reservations)
      || record.reservations.length > MAX_ATTEMPTS) throw new WorkerError('storage_error', 'Web search budget ledger is invalid');
  const reservations = record.reservations.map(value => {
    const item = object(value, 'Web search budget ledger is invalid');
    if (typeof item.requestKey !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(item.requestKey)
        || typeof item.queryHash !== 'string' || !/^[a-f0-9]{64}$/.test(item.queryHash)
        || typeof item.reservedAt !== 'string' || !Number.isFinite(Date.parse(item.reservedAt))) {
      throw new WorkerError('storage_error', 'Web search budget ledger is invalid');
    }
    return { requestKey: item.requestKey, queryHash: item.queryHash, reservedAt: item.reservedAt };
  });
  if (new Set(reservations.map(item => item.requestKey)).size !== reservations.length) {
    throw new WorkerError('storage_error', 'Web search budget ledger has duplicate request keys');
  }
  return { version: 1, costPerAttemptUsd: SEARCH_COST_USD, reservations };
}

function validateCachedResult(value: unknown, requestKey: string, queryHash: string, config: WebSearchConfig): WebSearchResult {
  const record = object(value, 'Cached web search result is invalid') as unknown as CachedResult;
  if (record.version !== 1 || record.requestKey !== requestKey || record.queryHash !== queryHash
      || !record.result || typeof record.result !== 'object') throw new WorkerError('storage_error', 'Cached web search result is invalid');
  const result = record.result;
  const statistics = result.statistics;
  if (typeof result.answer !== 'string' || !result.answer.trim() || Buffer.byteLength(result.answer, 'utf8') > MAX_ANSWER_BYTES
      || typeof result.retrievedAt !== 'string' || !Number.isFinite(Date.parse(result.retrievedAt))
      || !Array.isArray(result.citations) || result.citations.length > 5
      || result.citations.some(citation => !citation || validHttpUrl(citation.url) !== citation.url
        || (citation.title !== undefined && (typeof citation.title !== 'string' || citation.title.length > 1_000)))
      || !statistics || statistics.reservedCostUsd !== SEARCH_COST_USD
      || !Number.isFinite(statistics.actualCostUsd) || statistics.actualCostUsd < 0 || statistics.actualCostUsd > SEARCH_COST_USD
      || !Number.isSafeInteger(statistics.promptTokens) || statistics.promptTokens < 0
      || !Number.isSafeInteger(statistics.outputTokens) || statistics.outputTokens < 0 || statistics.outputTokens > 1_024
      || !/^gen-[A-Za-z0-9_-]{1,240}$/.test(statistics.generationId)
      || statistics.model !== config.model.model || statistics.endpointId !== config.model.endpointId
      || statistics.providerName !== config.model.providerName || !['deny', 'allow'].includes(statistics.dataCollection)
      || statistics.engine !== 'exa'
      || !Number.isSafeInteger(statistics.resultCount) || statistics.resultCount < 0 || statistics.resultCount > 5) {
    throw new WorkerError('storage_error', 'Cached web search result is invalid');
  }
  return record.result;
}

function validHttpUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length < 1 || raw.length > 2_048) return undefined;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch { return undefined; }
}

function citations(message: JsonObject, answer: string): WebSearchCitation[] {
  if (!Array.isArray(message.annotations) || message.annotations.length > 32) {
    throw new WorkerError('provider_error', 'OpenRouter omitted bounded web citation annotations');
  }
  const found: WebSearchCitation[] = [];
  const urls = new Set<string>();
  const rawUrls = new Set<string>();
  for (const raw of message.annotations) {
    const annotation = object(raw, 'OpenRouter returned an invalid web citation annotation');
    const citation = object(annotation.url_citation, 'OpenRouter returned an invalid web citation annotation');
    const url = validHttpUrl(citation.url);
    const title = string(citation.title);
    const start = nonnegativeInteger(citation.start_index);
    const end = nonnegativeInteger(citation.end_index);
    if (annotation.type !== 'url_citation' || !url || (title !== undefined && title.length > 1_000)
        || start === undefined || end === undefined || start > end || end > answer.length) {
      throw new WorkerError('provider_error', 'OpenRouter returned an invalid web citation annotation');
    }
    rawUrls.add(citation.url as string);
    if (!urls.has(url)) {
      urls.add(url);
      found.push({ url, ...(title ? { title } : {}) });
    }
  }
  if (found.length > 5) throw new WorkerError('provider_error', 'OpenRouter exceeded the configured web result cap');
  for (const match of answer.matchAll(/https?:\/\//gi)) {
    const tail = answer.slice(match.index);
    if (![...rawUrls].some(url => tail.startsWith(url)
        && (tail.length === url.length || /[\s)\]}>.,;!?]/.test(tail[url.length]!)))) {
      throw new WorkerError('provider_error', 'OpenRouter answer contained a URL absent from citation annotations');
    }
  }
  for (const match of answer.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1]!;
    if (!rawUrls.has(target)) throw new WorkerError('provider_error', 'OpenRouter answer contained a link absent from citation annotations');
  }
  return found;
}

export class SearchService {
  private readonly config: WebSearchConfig & { dataCollection: 'deny' | 'allow' };
  private readonly fetcher: typeof fetch;
  private readonly resolveCredential: OpenRouterCredentialResolver;
  private readonly endpointProvider: OpenRouterProvider;
  private readonly now: () => Date;
  private readonly wait: (milliseconds: number, signal: AbortSignal) => Promise<void>;

  constructor(config: WebSearchConfig, dependencies: WebSearchDependencies = {}) {
    validateConfig(config);
    this.config = Object.freeze({ ...config, model: Object.freeze({ ...config.model }), dataCollection: config.dataCollection ?? 'deny' });
    this.fetcher = dependencies.fetcher ?? fetch;
    this.resolveCredential = dependencies.resolveCredential ?? (name => process.env[name]);
    this.now = dependencies.now ?? (() => new Date());
    this.wait = dependencies.wait ?? defaultWait;
    this.endpointProvider = new OpenRouterProvider({
      apiKeyEnv: config.keyEnv,
      maxCostUsd: 0,
      allowedRepositories: [],
      allowSuppliedSources: false,
      dataCollection: this.config.dataCollection,
    }, this.fetcher, this.resolveCredential);
  }

  private credential(): string {
    const value = this.resolveCredential(this.config.keyEnv);
    if (typeof value !== 'string' || value.length < 1 || /[\r\n]/.test(value)) {
      throw new WorkerError('credential_unavailable', 'The dedicated OpenRouter search credential is unavailable');
    }
    return value;
  }

  private async json(path: string, init: RequestInit, signal: AbortSignal, maxBytes: number, phase: string): Promise<JsonObject> {
    throwIfAborted(signal);
    let httpStatus: number | undefined;
    let statistics: ProviderStats | undefined;
    try {
      const response = await this.fetcher(`${ORIGIN}${path}`, {
        ...init,
        redirect: 'error',
        signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.credential()}`, ...(init.headers ?? {}) },
      });
      httpStatus = response.status;
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
          const part = await reader.read();
          if (part.done) break;
          total += part.value.byteLength;
          if (total > maxBytes) throw new WorkerError('provider_limit', 'OpenRouter response exceeded the byte allowance');
          chunks.push(part.value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      let parsed: unknown;
      try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw new WorkerError('provider_error', 'OpenRouter returned invalid JSON'); }
      const result = object(parsed, 'OpenRouter returned an invalid web search response');
      statistics = observedStatistics(result);
      if (!response.ok) throw new WorkerError('provider_error', `OpenRouter rejected the web search request (HTTP ${response.status})`);
      return result;
    } catch (error) {
      if (signal.aborted) {
        try { aborted(signal); }
        catch (cancelled) { throw phased(cancelled, phase, { ...(httpStatus !== undefined ? { httpStatus } : {}) }, statistics); }
      }
      throw phased(error, phase, { ...(httpStatus !== undefined ? { httpStatus } : {}) }, statistics);
    }
  }

  private resultFilename(requestKey: string): string { return join(this.config.storeDir, `result-${hash(requestKey)}.json`); }
  private diagnosticFilename(requestKey: string): string { return join(this.config.storeDir, `attempt-${hash(requestKey)}.json`); }

  private async readLedger(): Promise<Ledger> {
    try {
      const content = await readFile(join(this.config.storeDir, 'budget.json'), 'utf8');
      if (Buffer.byteLength(content) > 256 * 1_024) throw new WorkerError('storage_error', 'Web search budget ledger exceeds its size limit');
      return parseLedger(JSON.parse(content));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, costPerAttemptUsd: SEARCH_COST_USD, reservations: [] };
      if (error instanceof WorkerError) throw error;
      throw new WorkerError('storage_error', 'Web search budget ledger could not be read');
    }
  }

  private async atomicWrite(filename: string, value: unknown): Promise<void> {
    const temporary = join(this.config.storeDir, `.web-search-${process.pid}-${randomUUID()}.tmp`);
    let handle: FileHandle | undefined;
    try {
      handle = await open(temporary, 'wx', 0o600);
      await handle.writeFile(JSON.stringify(value), 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      await rename(temporary, filename);
    } catch {
      await handle?.close().catch(() => {});
      await unlink(temporary).catch(() => {});
      throw new WorkerError('storage_error', 'Web search state could not be stored atomically');
    }
  }

  private async recordAttemptFailure(requestKey: string, queryHash: string, error: WorkerError): Promise<void> {
    const signal = AbortSignal.timeout(5_000);
    await this.withLock(signal, async () => {
      await this.atomicWrite(this.diagnosticFilename(requestKey), {
        version: 1,
        requestKey,
        queryHash,
        failedAt: this.now().toISOString(),
        error: searchSafeError(error),
      });
    });
  }

  private async lock(signal: AbortSignal): Promise<FileHandle> {
    await mkdir(this.config.storeDir, { recursive: true });
    const filename = join(this.config.storeDir, 'budget.lock');
    const started = Date.now();
    while (true) {
      throwIfAborted(signal);
      try { return await open(filename, 'wx', 0o600); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw new WorkerError('storage_error', 'Web search budget lock could not be acquired');
        if (Date.now() - started >= LOCK_WAIT_MS) {
          throw new WorkerError('storage_locked', 'Web search budget is locked; stale locks require operator review');
        }
        await this.wait(LOCK_POLL_MS, signal);
      }
    }
  }

  private async withLock<T>(signal: AbortSignal, action: () => Promise<T>): Promise<T> {
    const handle = await this.lock(signal);
    try { return await action(); }
    finally {
      await handle.close().catch(() => {});
      await unlink(join(this.config.storeDir, 'budget.lock')).catch(() => {});
    }
  }

  private async cached(requestKey: string, queryHash: string): Promise<WebSearchResult | undefined> {
    try {
      const content = await readFile(this.resultFilename(requestKey), 'utf8');
      if (Buffer.byteLength(content) > MAX_COMPLETION_BYTES) throw new WorkerError('storage_error', 'Cached web search result exceeds its size limit');
      return validateCachedResult(JSON.parse(content), requestKey, queryHash, this.config);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      if (error instanceof WorkerError) throw error;
      throw new WorkerError('storage_error', 'Cached web search result could not be read');
    }
  }

  private async lookup(requestKey: string, queryHash: string, signal: AbortSignal): Promise<WebSearchResult | undefined> {
    return this.withLock(signal, async () => {
      const ledger = await this.readLedger();
      const existing = ledger.reservations.find(item => item.requestKey === requestKey);
      if (!existing) return undefined;
      if (existing.queryHash !== queryHash) throw new WorkerError('request_conflict', 'Web search request key was already used for another query');
      const cached = await this.cached(requestKey, queryHash);
      if (cached) return cached;
      throw new WorkerError('request_uncertain', 'Web search request was already reserved without a durable result');
    });
  }

  private async reserve(requestKey: string, queryHash: string, signal: AbortSignal): Promise<WebSearchResult | undefined> {
    return this.withLock(signal, async () => {
      const ledger = await this.readLedger();
      const existing = ledger.reservations.find(item => item.requestKey === requestKey);
      if (existing) {
        if (existing.queryHash !== queryHash) throw new WorkerError('request_conflict', 'Web search request key was already used for another query');
        const cached = await this.cached(requestKey, queryHash);
        if (cached) return cached;
        throw new WorkerError('request_uncertain', 'Web search request was already reserved without a durable result');
      }
      const configuredAttempts = Math.floor((this.config.lifetimeMaxUsd + Number.EPSILON) / SEARCH_COST_USD);
      const attemptLimit = Math.min(MAX_ATTEMPTS, configuredAttempts);
      if (ledger.reservations.length >= attemptLimit) throw new WorkerError('budget_exhausted', 'Web search lifetime budget is exhausted');
      ledger.reservations.push({ requestKey, queryHash, reservedAt: this.now().toISOString() });
      await this.atomicWrite(join(this.config.storeDir, 'budget.json'), ledger);
      return undefined;
    });
  }

  private async keyCheck(signal: AbortSignal): Promise<void> {
    const response = await this.json('/api/v1/key', { method: 'GET' }, signal, 64 * 1_024, 'key');
    const data = object(response.data, 'OpenRouter omitted search key limits');
    const limit = finiteNumber(data.limit);
    const remaining = finiteNumber(data.limit_remaining);
    const expiresAt = data.expires_at === null ? null : string(data.expires_at);
    const expiry = expiresAt === null ? Number.POSITIVE_INFINITY : Date.parse(expiresAt ?? '');
    if (data.is_management_key !== false || data.is_provisioning_key !== false || limit === undefined || limit < SEARCH_COST_USD
        || limit > MAX_LIFETIME_USD || data.limit_reset !== null
        || remaining === undefined || remaining < SEARCH_COST_USD || !Number.isFinite(expiry) && expiry !== Number.POSITIVE_INFINITY
        || expiry <= this.now().getTime()) {
      throw new WorkerError('budget_guard', 'OpenRouter search key does not prove a non-resetting bounded spending limit', { phase: 'key' });
    }
  }

  private completionBody(query: string): JsonObject {
    return {
      model: this.config.model.model,
      messages: [
        { role: 'system', content: 'Answer the explicit web query concisely from the supplied search results. Cite sources. Do not claim that a receipt validates source content.' },
        { role: 'user', content: query },
      ],
      plugins: [{ id: 'web', engine: 'exa', mode: 'fast', max_results: 5 }],
      max_tokens: 1_024,
      temperature: this.config.model.temperature,
      stream: false,
      transforms: [],
      provider: {
        only: [this.config.model.providerSlug], allow_fallbacks: false, require_parameters: true,
        max_price: { prompt: 0, completion: 0, request: 0, image: 0 }, data_collection: this.config.dataCollection,
      },
    };
  }

  private validateCompletion(result: JsonObject, endpoint: FreeEndpointIdentity): { generationId: string; answer: string; citations: WebSearchCitation[]; promptTokens: number; outputTokens: number; usageCost: number } {
    const generationId = string(result.id);
    const usage = object(result.usage, 'OpenRouter omitted web search usage');
    const promptTokens = nonnegativeInteger(usage.prompt_tokens);
    const outputTokens = nonnegativeInteger(usage.completion_tokens);
    const usageCost = finiteNumber(usage.cost);
    if (!generationId || !/^gen-[A-Za-z0-9_-]{1,240}$/.test(generationId)
        || ![this.config.model.model, endpoint.endpointModel].includes(result.model as string)
        || !Array.isArray(result.choices) || result.choices.length !== 1 || promptTokens === undefined || outputTokens === undefined
        || usageCost === undefined || usageCost < 0 || usageCost > SEARCH_COST_USD) {
      throw new WorkerError('provider_error', 'OpenRouter web completion identity or bounded usage proof is missing');
    }
    const choice = object(result.choices[0], 'OpenRouter returned no web completion choice');
    const message = object(choice.message, 'OpenRouter returned no web completion message');
    const answer = string(message.content);
    if (choice.finish_reason !== 'stop' || answer === undefined || !answer.trim()) {
      throw new WorkerError('provider_error', 'OpenRouter did not return a complete web search answer');
    }
    if (Buffer.byteLength(answer, 'utf8') > MAX_ANSWER_BYTES) throw new WorkerError('provider_limit', 'Web search answer exceeded its size limit');
    return { generationId, answer, citations: citations(message, answer), promptTokens, outputTokens, usageCost };
  }

  private async receipt(generationId: string, endpoint: FreeEndpointIdentity, completion: ReturnType<SearchService['validateCompletion']>, signal: AbortSignal): Promise<WebSearchStatistics> {
    const completionStats: ProviderStats = {
      promptTokens: completion.promptTokens,
      outputTokens: completion.outputTokens,
      costUsd: completion.usageCost,
      generationId,
      endpointId: this.config.model.endpointId,
      providerName: this.config.model.providerName,
    };
    try {
      let response: JsonObject | undefined;
      for (let attempt = 0; response === undefined; attempt += 1) {
        try {
          response = await this.json(`/api/v1/generation?id=${encodeURIComponent(generationId)}`, { method: 'GET' }, signal,
            256 * 1_024, 'receipt');
        } catch (error) {
          const delay = RECEIPT_RETRY_DELAYS_MS[attempt];
          if (!(error instanceof WorkerError) || error.details?.httpStatus !== 404 || delay === undefined) {
            if (error instanceof WorkerError && error.details?.httpStatus === 404 && delay === undefined) {
              throw new WorkerError('provider_error', 'OpenRouter generation receipt was not available within the bounded receipt window', error.details, error.stats);
            }
            throw error;
          }
          await this.wait(delay, signal);
        }
      }
      const data = object(response.data, 'OpenRouter omitted web search generation receipt');
      const actualCost = finiteNumber(data.total_cost);
      const receiptUsage = finiteNumber(data.usage);
      const upstreamInferenceCost = finiteNumber(data.upstream_inference_cost);
      const promptTokens = nonnegativeInteger(data.native_tokens_prompt);
      const outputTokens = nonnegativeInteger(data.native_tokens_completion);
      const resultCount = nonnegativeInteger(data.num_search_results);
      if (data.id !== generationId || data.model !== endpoint.endpointModel || data.provider_name !== this.config.model.providerName
          || data.web_search_engine !== 'exa' || data.is_byok !== false || actualCost === undefined || actualCost < 0 || actualCost > SEARCH_COST_USD
          || receiptUsage === undefined || receiptUsage < 0 || receiptUsage > SEARCH_COST_USD
          || upstreamInferenceCost !== 0 || promptTokens === undefined || outputTokens === undefined
          || promptTokens !== completion.promptTokens || outputTokens !== completion.outputTokens
          || outputTokens > 1_024 || promptTokens + outputTokens > Math.min(this.config.model.contextTokens, endpoint.contextTokens)
          || resultCount === undefined || resultCount > 5 || completion.citations.length > resultCount) {
        throw new WorkerError('provider_error', 'OpenRouter receipt did not prove bounded Exa search on the pinned free endpoint');
      }
      return {
        reservedCostUsd: SEARCH_COST_USD,
        actualCostUsd: actualCost,
        promptTokens,
        outputTokens,
        generationId,
        model: this.config.model.model,
        endpointId: this.config.model.endpointId,
        providerName: this.config.model.providerName,
        dataCollection: this.config.dataCollection,
        engine: 'exa',
        resultCount,
      };
    } catch (error) {
      throw phased(error, 'receipt', { generationId }, completionStats);
    }
  }

  async capabilities(options: WebSearchOptions = {}): Promise<WebSearchCapabilities> {
    const deadline = AbortSignal.timeout(this.config.timeoutMs ?? 120_000);
    const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
    const credentialAvailable = (() => {
      try { this.credential(); return true; }
      catch { return false; }
    })();
    const attemptLimit = Math.min(MAX_ATTEMPTS, Math.floor((this.config.lifetimeMaxUsd + Number.EPSILON) / SEARCH_COST_USD));
    try {
      const ledger = await this.withLock(signal, () => this.readLedger());
      const reservedAttempts = ledger.reservations.length;
      const remainingAttempts = Math.max(0, attemptLimit - reservedAttempts);
      return {
        available: credentialAvailable && remainingAttempts > 0,
        ...(!credentialAvailable ? { reason: 'Dedicated OpenRouter search credential is unavailable' }
          : remainingAttempts === 0 ? { reason: 'Web search lifetime budget is exhausted' } : {}),
        credentialAvailable,
        model: this.config.model.model,
        endpointId: this.config.model.endpointId,
        providerName: this.config.model.providerName,
        dataCollection: this.config.dataCollection,
        engine: 'exa', mode: 'fast', maxResults: 5,
        costPerAttemptUsd: SEARCH_COST_USD,
        lifetimeMaxUsd: this.config.lifetimeMaxUsd,
        attemptLimit,
        reservedAttempts,
        remainingAttempts,
        reservedUsd: Number((reservedAttempts * SEARCH_COST_USD).toFixed(3)),
        remainingUsd: Number((remainingAttempts * SEARCH_COST_USD).toFixed(3)),
      };
    } catch (error) {
      if (signal.aborted) aborted(signal);
      if (error instanceof WorkerError) throw error;
      throw new WorkerError('storage_error', 'Web search capabilities could not read budget state');
    }
  }

  async search(request: WebSearchRequest, options: WebSearchOptions = {}): Promise<WebSearchResult> {
    const queryHash = validateRequest(request);
    const deadline = AbortSignal.timeout(this.config.timeoutMs ?? 120_000);
    const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
    let reserved = false;
    try {
      const existing = await this.lookup(request.requestKey, queryHash, signal);
      if (existing) return existing;
      const endpoint = await this.endpointProvider.inspect(this.config.model, signal);
      if (endpoint.maxOutputTokens < 1_024 || endpoint.contextTokens < this.config.model.contextTokens) {
        throw new WorkerError('model_unavailable', 'Pinned OpenRouter endpoint cannot satisfy bounded web search limits', { phase: 'catalog' });
      }
      await this.keyCheck(signal);
      const prior = await this.reserve(request.requestKey, queryHash, signal);
      if (prior) return prior;
      reserved = true;
      throwIfAborted(signal);
      const body = JSON.stringify(this.completionBody(request.query));
      if (Buffer.byteLength(body, 'utf8') > 16 * 1_024) throw new WorkerError('invalid_input', 'Web search request exceeded its serialized input limit');
      const completionResult = await this.json('/api/v1/chat/completions', {
        method: 'POST', headers: { 'X-OpenRouter-Metadata': 'enabled' }, body,
      }, signal, MAX_COMPLETION_BYTES, 'completion');
      let completion: ReturnType<SearchService['validateCompletion']>;
      try { completion = this.validateCompletion(completionResult, endpoint); }
      catch (error) { throw phased(error, 'completion_validation', {}, observedStatistics(completionResult)); }
      const statistics = await this.receipt(completion.generationId, endpoint, completion, signal);
      const result: WebSearchResult = {
        answer: completion.answer,
        citations: completion.citations,
        retrievedAt: this.now().toISOString(),
        statistics,
      };
      await this.withLock(signal, async () => {
        await this.atomicWrite(this.resultFilename(request.requestKey), { version: 1, requestKey: request.requestKey, queryHash, result });
      });
      return result;
    } catch (error) {
      let failure: WorkerError;
      if (error instanceof WorkerError) failure = error;
      else if (signal.aborted) {
        try { aborted(signal); }
        catch (cancelled) { failure = cancelled as WorkerError; }
      } else failure = new WorkerError('web_search_failed', 'Web search failed safely');
      if (reserved) await this.recordAttemptFailure(request.requestKey, queryHash, failure).catch(() => {});
      throw failure;
    }
  }
}
