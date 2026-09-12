import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, stat, unlink, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import type { Feedback, Job, ModelRouting, RegisteredModel, TaskClass } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_TTL_MS = DAY_MS;
const DEFAULT_METRIC_RETENTION_MS = 30 * DAY_MS;
const DEFAULT_METRIC_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_JOBS = 256;
const DEFAULT_MAX_STORE_BYTES = 16 * 1024 * 1024;

export interface JobMetadata {
  serviceVersion: string;
  promptVersion: string;
  runtimeFingerprint: string;
  modelId: string;
  modelIdentity: string;
  modelProvider: RegisteredModel['provider'];
  routing: ModelRouting;
  modelDigest?: string;
  profileId: string;
  taskClass: TaskClass;
  qualificationFingerprint: string;
  snapshotId?: string;
}

interface StoredJob {
  job: Job;
  requestHash: string;
  ownerId: string;
  expiresAt: string;
  metadata?: JobMetadata;
}

interface StoreFile {
  version: 1;
  jobs: StoredJob[];
}

export interface StoreOptions {
  ttlMs?: number;
  metricRetentionMs?: number;
  maxMetricBytes?: number;
  now?: () => Date;
  metricsFile?: string;
  maxJobs?: number;
  maxStoreBytes?: number;
}

export interface JobIdentity {
  job: Job;
  requestHash: string;
  ownerId: string;
}

interface MetricRecord {
  at: string;
  event: string;
  jobId?: string;
  state?: string;
  durationMs?: number;
  promptTokens?: number;
  outputTokens?: number;
  verdict?: Feedback['verdict'];
  evidenceCount?: number;
  evidenceHashes?: string[];
  correctionCount?: number;
  verificationMs?: number;
  serviceVersion?: string;
  modelId?: string;
  modelIdentity?: string;
  modelProvider?: RegisteredModel['provider'];
  routing?: ModelRouting;
  profileId?: string;
  taskClass?: string;
  modelDigest?: string;
  qualificationFingerprint?: string;
  inputBytes?: number;
  truncated?: boolean;
  errorCode?: string;
  promptVersion?: string;
  runtimeFingerprint?: string;
  snapshotId?: string;
  costUsd?: number;
  generationIds?: string[];
  endpointIds?: string[];
  providerNames?: string[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isTerminal(job: Job): boolean {
  return ['completed', 'failed', 'cancelled', 'timed_out', 'interrupted'].includes(job.state);
}

function pidIsDefinitelyDead(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return false; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH'; }
}

function validStore(value: unknown): value is StoreFile {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoreFile>;
  return candidate.version === 1 && Array.isArray(candidate.jobs);
}

function boundedMetadataText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !/[\r\n\0]/.test(value);
}

function validMetricRouting(routing: ModelRouting | undefined): boolean {
  if (!routing) return true;
  return ['local', 'remote'].includes(routing.locality)
    && (routing.model === undefined || boundedMetadataText(routing.model, 256))
    && (routing.endpointId === undefined || boundedMetadataText(routing.endpointId, 256))
    && (routing.providerSlug === undefined || boundedMetadataText(routing.providerSlug, 256))
    && (routing.providerName === undefined || boundedMetadataText(routing.providerName, 256))
    && (routing.outputMode === undefined || ['json-schema', 'tool-call'].includes(routing.outputMode))
    && (routing.dataCollection === undefined || ['deny', 'allow'].includes(routing.dataCollection));
}

function validMetricTexts(values: string[] | undefined, maxItems: number, maxLength: number): boolean {
  return values === undefined || (Array.isArray(values) && values.length <= maxItems
    && values.every((value) => boundedMetadataText(value, maxLength)));
}

/** Stable, non-reversible request identity. Request contents are never written to disk. */
export function hashRequest(value: unknown): string {
  const stable = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(stable);
    if (input && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]));
    }
    return input;
  };
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export class JobStore {
  readonly #jobsFile: string;
  readonly #metricsFile: string;
  readonly #ttlMs: number;
  readonly #metricRetentionMs: number;
  readonly #maxMetricBytes: number;
  readonly #now: () => Date;
  readonly #maxJobs: number;
  readonly #maxStoreBytes: number;
  #records = new Map<string, StoredJob>();
  #writes: Promise<void> = Promise.resolve();
  #metricSerial: Promise<void> = Promise.resolve();
  #initialized = false;
  #lastMetricCompactionMs = 0;

  constructor(readonly dataDir: string, options: StoreOptions = {}) {
    this.#jobsFile = path.join(dataDir, 'jobs.json');
    this.#metricsFile = options.metricsFile ?? path.join(dataDir, 'metrics.jsonl');
    this.#ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.#metricRetentionMs = options.metricRetentionMs ?? DEFAULT_METRIC_RETENTION_MS;
    this.#maxMetricBytes = options.maxMetricBytes ?? DEFAULT_METRIC_BYTES;
    this.#maxJobs = options.maxJobs ?? DEFAULT_MAX_JOBS;
    this.#maxStoreBytes = options.maxStoreBytes ?? DEFAULT_MAX_STORE_BYTES;
    if (!Number.isSafeInteger(this.#maxJobs) || this.#maxJobs < 1
      || !Number.isSafeInteger(this.#maxStoreBytes) || this.#maxStoreBytes < 1_024) {
      throw new Error('job store bounds are invalid');
    }
    this.#now = options.now ?? (() => new Date());
  }

  async init(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await mkdir(path.dirname(this.#metricsFile), { recursive: true });
    try {
      const parsed: unknown = JSON.parse(await readFile(this.#jobsFile, 'utf8'));
      if (!validStore(parsed)) throw new Error('unsupported job store format');
      for (const record of parsed.jobs) {
        if (record && typeof record === 'object' && record.job?.id && record.requestHash && record.ownerId) {
          this.#records.set(record.job.id, record);
        }
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
    this.#initialized = true;
    const expired = this.#purgeExpired();
    const bounded = this.#enforceJobBounds();
    const changed = expired || bounded;
    if (changed) await this.#persist();
    await this.#withMetricLock(() => this.#compactMetrics());
    this.#lastMetricCompactionMs = this.#now().getTime();
  }

  async recoverAbandoned(newOwnerId: string): Promise<number> {
    this.#assertInitialized();
    let recovered = 0;
    const now = this.#now().toISOString();
    for (const record of this.#records.values()) {
      if (!isTerminal(record.job) && record.ownerId !== newOwnerId) {
        record.job = {
          ...record.job,
          state: 'interrupted',
          updatedAt: now,
          progress: 'interrupted during service restart',
          error: { code: 'interrupted', message: 'The owning worker stopped before this job finished.' },
        };
        record.expiresAt = new Date(this.#now().getTime() + this.#ttlMs).toISOString();
        recovered += 1;
      }
    }
    if (recovered > 0) await this.#persist();
    return recovered;
  }

  async create(job: Job, requestHash: string, ownerId: string, metadata?: JobMetadata): Promise<void> {
    this.#assertInitialized();
    if (this.#records.has(job.id)) throw new Error(`job already exists: ${job.id}`);
    this.#records.set(job.id, {
      job: clone(job), requestHash, ownerId,
      expiresAt: new Date(this.#now().getTime() + this.#ttlMs).toISOString(), metadata: metadata ? clone(metadata) : undefined,
    });
    this.#enforceJobBounds();
    await this.#persist();
  }

  async update(job: Job, metadata?: Partial<JobMetadata>): Promise<void> {
    this.#assertInitialized();
    const record = this.#records.get(job.id);
    if (!record) throw new Error(`unknown job: ${job.id}`);
    record.job = clone(job);
    if (metadata && record.metadata) record.metadata = { ...record.metadata, ...clone(metadata) };
    record.expiresAt = new Date(this.#now().getTime() + this.#ttlMs).toISOString();
    this.#enforceJobBounds();
    await this.#persist();
  }

  get(jobId: string): Job | undefined {
    this.#assertInitialized();
    if (this.#purgeExpired()) void this.#persist().catch(() => undefined);
    const record = this.#records.get(jobId);
    return record ? clone(record.job) : undefined;
  }

  findByRequestKey(requestKey: string): JobIdentity | undefined {
    this.#assertInitialized();
    if (this.#purgeExpired()) void this.#persist().catch(() => undefined);
    for (const record of this.#records.values()) {
      if (record.job.requestKey === requestKey) {
        return { job: clone(record.job), requestHash: record.requestHash, ownerId: record.ownerId };
      }
    }
    return undefined;
  }

  getMetadata(jobId: string): JobMetadata | undefined {
    this.#assertInitialized();
    const metadata = this.#records.get(jobId)?.metadata;
    return metadata ? clone(metadata) : undefined;
  }

  async appendMetric(metric: Omit<MetricRecord, 'at'>): Promise<void> {
    this.#assertInitialized();
    if (!/^[a-z0-9_-]{1,64}$/.test(metric.event)
      || (metric.jobId !== undefined && !/^[a-zA-Z0-9_.-]{1,128}$/.test(metric.jobId))
      || (metric.state !== undefined && !/^[a-z_]{1,32}$/.test(metric.state))
      || (metric.modelId !== undefined && !/^[a-zA-Z0-9_.-]{1,80}$/.test(metric.modelId))
      || (metric.modelProvider !== undefined && !['ollama', 'openrouter'].includes(metric.modelProvider))
      || (metric.modelIdentity !== undefined && !/^(sha256:)?[a-f0-9]{64}$/.test(metric.modelIdentity))
      || (metric.profileId !== undefined && !/^[a-zA-Z0-9_.-]{1,80}$/.test(metric.profileId))
      || (metric.taskClass !== undefined && !/^[a-z-]{1,32}$/.test(metric.taskClass))
      || (metric.errorCode !== undefined && !/^[a-z0-9_-]{1,64}$/.test(metric.errorCode))
      || (metric.promptVersion !== undefined && !/^[a-zA-Z0-9_.-]{1,32}$/.test(metric.promptVersion))
      || (metric.snapshotId !== undefined && !/^[a-f0-9]{64}$/.test(metric.snapshotId))
      || (metric.runtimeFingerprint !== undefined && !/^[a-f0-9]{64}$/.test(metric.runtimeFingerprint))
      || (metric.costUsd !== undefined && (!Number.isFinite(metric.costUsd) || metric.costUsd < 0))
      || !validMetricRouting(metric.routing)
      || !validMetricTexts(metric.generationIds, 8, 256)
      || !validMetricTexts(metric.endpointIds, 8, 256)
      || !validMetricTexts(metric.providerNames, 8, 256)) {
      throw new Error('metric metadata is outside its bounds');
    }
    await this.#withMetricLock(async () => {
      const safe: MetricRecord = { at: this.#now().toISOString(), ...metric };
      await appendFile(this.#metricsFile, `${JSON.stringify(safe)}\n`, { encoding: 'utf8', mode: 0o600 });
      const info = await stat(this.#metricsFile);
      const compactInterval = Math.min(DAY_MS, this.#metricRetentionMs);
      if (info.size > this.#maxMetricBytes || this.#now().getTime() - this.#lastMetricCompactionMs >= compactInterval) {
        await this.#compactMetrics();
        this.#lastMetricCompactionMs = this.#now().getTime();
      }
    });
  }

  async appendFeedback(feedback: Feedback, metadata: JobMetadata): Promise<void> {
    await this.appendMetric({
      event: 'feedback',
      jobId: feedback.jobId,
      verdict: feedback.verdict,
      evidenceCount: feedback.evidence.length,
      evidenceHashes: feedback.evidence.map((entry) => createHash('sha256').update(entry).digest('hex')),
      correctionCount: feedback.correctionCount,
      verificationMs: feedback.verificationMs,
      serviceVersion: metadata.serviceVersion,
      promptVersion: metadata.promptVersion,
      runtimeFingerprint: metadata.runtimeFingerprint,
      modelId: metadata.modelId,
      modelIdentity: metadata.modelIdentity,
      modelProvider: metadata.modelProvider,
      routing: metadata.routing,
      ...(metadata.modelDigest ? { modelDigest: metadata.modelDigest } : {}),
      profileId: metadata.profileId,
      taskClass: metadata.taskClass,
      qualificationFingerprint: metadata.qualificationFingerprint,
      snapshotId: metadata.snapshotId,
    });
  }

  async close(): Promise<void> {
    await Promise.all([this.#writes, this.#metricSerial]);
  }

  get size(): number {
    this.#assertInitialized();
    return this.#records.size;
  }

  #assertInitialized(): void {
    if (!this.#initialized) throw new Error('job store is not initialized');
  }

  #purgeExpired(): boolean {
    const nowMs = this.#now().getTime();
    let changed = false;
    for (const [id, record] of this.#records) {
      if (Date.parse(record.expiresAt) <= nowMs) {
        this.#records.delete(id);
        changed = true;
      }
    }
    return changed;
  }

  #enforceJobBounds(): boolean {
    let changed = false;
    const exceeds = (): boolean => this.#records.size > this.#maxJobs
      || Buffer.byteLength(JSON.stringify({ version: 1, jobs: [...this.#records.values()] }), 'utf8') > this.#maxStoreBytes;
    if (!exceeds()) return false;
    const terminal = [...this.#records.values()]
      .filter((record) => isTerminal(record.job))
      .sort((left, right) => Date.parse(left.job.updatedAt) - Date.parse(right.job.updatedAt));
    for (const record of terminal) {
      if (!exceeds()) break;
      this.#records.delete(record.job.id);
      changed = true;
    }
    return changed;
  }

  async #persist(): Promise<void> {
    const snapshot: StoreFile = { version: 1, jobs: [...this.#records.values()].map(clone) };
    this.#writes = this.#writes.then(async () => {
      const temporary = `${this.#jobsFile}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temporary, `${JSON.stringify(snapshot)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      try {
        await rename(temporary, this.#jobsFile);
      } catch (error) {
        await unlink(temporary).catch(() => undefined);
        throw error;
      }
    });
    await this.#writes;
  }

  async #compactMetrics(): Promise<void> {
    let raw: string;
    try {
      raw = await readFile(this.#metricsFile, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const cutoff = this.#now().getTime() - this.#metricRetentionMs;
    const kept: string[] = [];
    let bytes = 0;
    for (const line of raw.split('\n').reverse()) {
      if (!line) continue;
      try {
        const parsed = JSON.parse(line) as { at?: unknown };
        if (typeof parsed.at !== 'string' || Date.parse(parsed.at) < cutoff) continue;
      } catch {
        continue;
      }
      const lineBytes = Buffer.byteLength(line) + 1;
      if (bytes + lineBytes > this.#maxMetricBytes) break;
      kept.push(line);
      bytes += lineBytes;
    }
    kept.reverse();
    const temporary = `${this.#metricsFile}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, kept.length ? `${kept.join('\n')}\n` : '', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    try { await rename(temporary, this.#metricsFile); }
    catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
  }

  async #withMetricLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.#metricSerial;
    let releaseLocal!: () => void;
    this.#metricSerial = new Promise<void>((resolve) => { releaseLocal = resolve; });
    await previous;
    const lockPath = `${this.#metricsFile}.lock`;
    const token = JSON.stringify({ pid: process.pid, id: randomUUID() });
    const deadline = Date.now() + 5_000;
    try {
      while (true) {
        try {
          const handle = await open(lockPath, 'wx', 0o600);
          try { await handle.writeFile(token, 'utf8'); }
          catch (error) {
            await handle.close().catch(() => undefined);
            await unlink(lockPath).catch(() => undefined);
            throw error;
          }
          await handle.close();
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
          const existing = await readFile(lockPath, 'utf8').catch(() => '');
          let pid = 0;
          try { pid = Number((JSON.parse(existing) as { pid?: unknown }).pid); } catch { /* do not steal malformed locks */ }
          if (pidIsDefinitelyDead(pid) && await readFile(lockPath, 'utf8').catch(() => '') === existing) {
            await unlink(lockPath).catch(() => undefined);
            continue;
          }
          if (Date.now() >= deadline) throw new Error('metrics lock remained unavailable');
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
      return await operation();
    } finally {
      try {
        if (await readFile(lockPath, 'utf8') === token) await unlink(lockPath);
      } catch { /* a failed metadata cleanup must not expose or corrupt job data */ }
      releaseLocal();
    }
  }
}
