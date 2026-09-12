/** Transport-neutral contracts. No provider SDK or MCP types belong here. */
export const SERVICE_VERSION = '0.1.2';
export const PROMPT_VERSION = '4';
export const TASK_CLASSES = ['exploration', 'research', 'summary', 'triage', 'transformation', 'draft', 'check-monitor'] as const;
export type TaskClass = typeof TASK_CLASSES[number];
export interface Limits {
  contextTokens: number; outputTokens: number; inputBytes: number; rounds: number;
  taskTimeoutMs: number; checkTimeoutMs: number; maxFiles: number;
  maxFileBytes: number; snapshotBytes: number; toolOutputBytes: number; resultBytes: number;
}
export const DEFAULT_LIMITS: Limits = {
  contextTokens: 8192, outputTokens: 2048, inputBytes: 16384, rounds: 8,
  taskTimeoutMs: 180000, checkTimeoutMs: 600000, maxFiles: 256,
  maxFileBytes: 131072, snapshotBytes: 4194304, toolOutputBytes: 8192, resultBytes: 32768,
};
export interface RepositoryConfig { id: string; root: string; allowPaths: string[]; excludes: string[] }
export interface ContextProof {
  ollamaVersion: string; digest: string; contextTokens: number; outputTokens: number;
  singleOverflowRejected: boolean; historyOverflowRejected: boolean; verifiedAt: string;
}
export interface LocalModel {
  id: string; provider: 'ollama'; model: string; digest: string; quantization: string;
  think: boolean; temperature: number; contextProof?: ContextProof;
}
export interface OpenRouterModel {
  id: string; provider: 'openrouter'; model: string; endpointId: string;
  providerSlug: string; providerName: string; catalogFingerprint: string;
  outputMode: 'json-schema' | 'tool-call'; temperature: number; contextTokens: number;
}
export type RegisteredModel = LocalModel | OpenRouterModel;
export function modelIdentity(model: RegisteredModel): string {
  return model.provider === 'ollama' ? model.digest : model.catalogFingerprint;
}
export interface Profile {
  id: string; modelId: string; taskClasses: TaskClass[]; instruction: string;
  limits?: Partial<Limits>;
  qualification?: { fingerprint: string; taskClasses: TaskClass[]; evidence: string[]; expiresAt?: string };
}
export interface CommandRecipe {
  id: string; executable: string; args: string[]; requiredPaths: string[];
  timeoutMs: number;
}
export interface RunnerConfig {
  codexExecutable: string; permissionProfile: string; configFile: string;
  qualification?: { fingerprint: string; evidence: string; verifiedAt: string };
  recipes: CommandRecipe[];
}
export interface OpenRouterConfig {
  apiKeyEnv: string; maxCostUsd: 0; allowedRepositories: string[];
  allowSuppliedSources: boolean; dataCollection: 'deny' | 'allow';
}
export interface HostConfig {
  version: 1; inferencePolicy: 'local-only' | 'approved-free-providers'; dataDir: string; leaseDir: string;
  ollamaUrl: string; allowQualification: boolean; queueLimit: number;
  repositories: RepositoryConfig[]; models: RegisteredModel[]; profiles: Profile[];
  limits: Limits; runner?: RunnerConfig; openrouter?: OpenRouterConfig;
}
export interface TaskRequest {
  requestKey: string; repositoryId: string; paths: string[]; expectedHead?: string;
  expectedSnapshotId?: string; profileId: string; taskClass: TaskClass; instruction: string;
  mode: 'work' | 'qualification'; enabledCheckIds: string[]; limits?: Partial<Limits>;
  sources?: { url: string; retrievedAt: string; text: string }[];
  remoteDataConsent?: boolean;
}
export interface SnapshotFile { path: string; sha256: string; text: string }
export interface Snapshot {
  id: string; repositoryId: string; head: string | null; dirty: boolean;
  files: SnapshotFile[]; omissions: string[];
}
export interface Evidence { path: string; startLine: number; endLine: number }
export interface Finding { text: string; evidence: Evidence[] }
export interface Proposal { path: string; originalSha256: string; unifiedDiff: string }
export interface WorkerAnswer {
  outcome: 'answered' | 'incomplete' | 'needs_codex'; summary: string;
  findings: Finding[]; limitations: string[]; proposals: Proposal[];
}
export interface CommandReceipt {
  id: string; checkId: string; snapshotId: string; executable: string; args: string[];
  exitCode: number | null; status: 'passed' | 'failed' | 'timed_out' | 'cancelled' | 'unavailable';
  output: string; truncated: boolean; durationMs: number;
}
export interface ProviderStats {
  promptTokens?: number; outputTokens?: number; totalDurationNs?: number; loadDurationNs?: number;
  costUsd?: number; generationId?: string; endpointId?: string; providerName?: string;
}
export interface SourceReference { path: string; url: string; retrievedAt: string; sha256: string }
export interface Message { role: 'system' | 'user' | 'assistant'; content: string }
export interface GenerateRequest {
  model: RegisteredModel; messages: Message[]; schema: Record<string, unknown>;
  limits: Limits; signal: AbortSignal;
}
export interface ProviderHealth { available: boolean; version?: string; reason?: string }
export interface ModelProvider {
  readonly id: string; readonly locality: 'local' | 'remote';
  verify(model: RegisteredModel, limits: Limits, signal: AbortSignal): Promise<ProviderHealth>;
  generate(request: GenerateRequest): Promise<{ content: string; stats: ProviderStats; doneReason?: string }>;
}
export interface CommandRunner {
  health(): Promise<{ available: boolean; reason?: string; checkIds: string[] }>;
  run(recipeId: string, snapshot: Snapshot, limits: Limits, signal: AbortSignal): Promise<CommandReceipt>;
}
export type JobState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timed_out' | 'interrupted';
export interface JobResult {
  snapshot: Omit<Snapshot, 'files'> & { files: Omit<SnapshotFile, 'text'>[] };
  sourceReferences?: SourceReference[];
  answer: WorkerAnswer; commands: CommandReceipt[]; modelId: string; modelDigest?: string;
  modelIdentity: string; modelProvider: RegisteredModel['provider']; routing: ModelRouting;
  qualificationFingerprint: string; statistics: ProviderStats[];
}
export interface ModelRouting {
  locality: 'local' | 'remote'; model?: string; endpointId?: string; providerSlug?: string;
  providerName?: string; outputMode?: OpenRouterModel['outputMode']; dataCollection?: 'deny' | 'allow';
}
export interface Job {
  id: string; requestKey: string; state: JobState; createdAt: string; updatedAt: string;
  progress: string; result?: JobResult; error?: { code: string; message: string };
}
export interface Feedback {
  jobId: string; verdict: 'accepted' | 'corrected' | 'rejected' | 'escalated';
  evidence: string[]; correctionCount: number; verificationMs: number;
}
export class WorkerError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'WorkerError'; }
}
