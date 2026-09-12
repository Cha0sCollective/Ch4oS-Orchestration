import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { DEFAULT_LIMITS, TASK_CLASSES, type HostConfig, WorkerError } from './types.js';

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/);
const text = z.string().max(16000);
const digest = z.string().regex(/^(sha256:)?[a-f0-9]{64}$/);
const taskClass = z.enum(TASK_CLASSES);
export const limitsSchema = z.object({
  contextTokens: z.number().int().min(2048).max(1048576),
  outputTokens: z.number().int().min(128).max(16384),
  inputBytes: z.number().int().min(1024).max(524288),
  rounds: z.number().int().min(1).max(32),
  taskTimeoutMs: z.number().int().min(1000).max(1800000),
  checkTimeoutMs: z.number().int().min(1000).max(3600000),
  maxFiles: z.number().int().min(1).max(4096),
  maxFileBytes: z.number().int().min(128).max(1048576),
  snapshotBytes: z.number().int().min(128).max(33554432),
  toolOutputBytes: z.number().int().min(128).max(65536),
  resultBytes: z.number().int().min(1024).max(131072),
}).strict();
const evidenceSchema = z.object({ path: text, startLine: z.number().int().positive(), endLine: z.number().int().positive() }).strict();
export const answerSchema = z.object({
  outcome: z.enum(['answered', 'incomplete', 'needs_codex']), summary: text,
  findings: z.array(z.object({ text, evidence: z.array(evidenceSchema).max(32) }).strict()).max(32),
  limitations: z.array(text).max(32),
  proposals: z.array(z.object({ path: text, originalSha256: digest, unifiedDiff: z.string().max(65536) }).strict()).max(8),
}).strict();
export const actionSchema = z.object({
  action: z.enum(['list', 'read', 'search', 'run_check', 'finish']),
  path: text.optional(), startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(), query: z.string().max(256).optional(),
  checkId: id.optional(), answer: answerSchema.optional(),
}).strict();
export const taskRequestSchema = z.object({
  requestKey: id, repositoryId: id, paths: z.array(z.string().min(1).max(1024)).min(1).max(128),
  expectedHead: z.string().regex(/^[a-f0-9]{40,64}$/).optional(), expectedSnapshotId: digest.optional(),
  profileId: id, taskClass, instruction: z.string().min(1).max(8000),
  mode: z.enum(['work', 'qualification']).default('work'), enabledCheckIds: z.array(id).max(16).default([]),
  limits: limitsSchema.partial().optional(),
  remoteDataConsent: z.boolean().default(false),
  sources: z.array(z.object({ url: z.string().url().max(2048), retrievedAt: z.string().datetime(), text: z.string().max(16000) }).strict()).max(8).optional(),
}).strict();
export const feedbackSchema = z.object({
  jobId: z.string().uuid(), verdict: z.enum(['accepted', 'corrected', 'rejected', 'escalated']),
  evidence: z.array(z.string().min(1).max(2048)).min(1).max(16),
  correctionCount: z.number().int().min(0).max(10000), verificationMs: z.number().int().min(0).max(86400000),
}).strict();
export const hostConfigSchema = z.object({
  version: z.literal(1), inferencePolicy: z.enum(['local-only', 'approved-free-providers']),
  dataDir: z.string().min(1), leaseDir: z.string().min(1),
  ollamaUrl: z.string().url().default('http://127.0.0.1:11434'),
  allowQualification: z.boolean().default(false), queueLimit: z.number().int().min(0).max(4).default(4),
  limits: limitsSchema.default(DEFAULT_LIMITS),
  repositories: z.array(z.object({ id, root: z.string().min(1), allowPaths: z.array(z.string()).min(1), excludes: z.array(z.string()).default([]) }).strict()).min(1),
  openrouter: z.object({ apiKeyEnv: z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/).default('OPENROUTER_API_KEY'),
    maxCostUsd: z.literal(0), allowedRepositories: z.array(id).max(64).default([]),
    allowSuppliedSources: z.boolean().default(false), dataCollection: z.enum(['deny','allow']).default('deny'),
  }).strict().optional(),
  models: z.array(z.discriminatedUnion('provider', [z.object({ id, provider: z.literal('ollama'), model: z.string().min(1).max(128), digest,
    quantization: z.string().min(1).max(32), think: z.boolean().default(false), temperature: z.number().min(0).max(2).default(0.2),
    contextProof: z.object({ ollamaVersion: z.string(), digest, contextTokens: z.number().int(), outputTokens: z.number().int(),
      singleOverflowRejected: z.boolean(), historyOverflowRejected: z.boolean(), verifiedAt: z.string().datetime() }).strict().optional(),
  }).strict(), z.object({ id, provider: z.literal('openrouter'),
    model: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+:free$/).max(256),
    endpointId: z.string().min(1).max(256), providerSlug: z.string().min(1).max(256), providerName: z.string().min(1).max(256),
    catalogFingerprint: digest, temperature: z.number().min(0).max(2).default(0.6), contextTokens: z.number().int().min(2048).max(2097152),
    outputMode: z.enum(['json-schema', 'tool-call']),
  }).strict()])),
  profiles: z.array(z.object({ id, modelId: id, taskClasses: z.array(taskClass).min(1), instruction: z.string().max(4000), limits: limitsSchema.partial().optional(),
    qualification: z.object({ fingerprint: digest, taskClasses: z.array(taskClass).min(1), evidence: z.array(z.string().max(2048)).min(1), expiresAt: z.string().datetime().optional() }).strict().optional(),
  }).strict()),
  runner: z.object({ codexExecutable: z.string(), permissionProfile: id, configFile: z.string(),
    qualification: z.object({ fingerprint: digest, evidence: z.string(), verifiedAt: z.string().datetime() }).strict().optional(),
    recipes: z.array(z.object({ id, executable: z.string(), args: z.array(z.string()), requiredPaths: z.array(z.string()), timeoutMs: z.number().int().positive().max(3600000) }).strict()),
  }).strict().optional(),
}).strict().superRefine((config, context) => {
  for (let profileIndex = 0; profileIndex < config.profiles.length; profileIndex += 1) {
    const profile = config.profiles[profileIndex]!;
    for (const [key, value] of Object.entries(profile.limits ?? {}) as [keyof typeof config.limits, number][]) {
      if (value > config.limits[key]) {
        context.addIssue({
          code: 'custom', path: ['profiles', profileIndex, 'limits', key],
          message: `Profile limit ${key} exceeds the host ceiling`,
        });
      }
    }
    const contextTokens = profile.limits?.contextTokens ?? config.limits.contextTokens;
    const outputTokens = profile.limits?.outputTokens ?? config.limits.outputTokens;
    if (outputTokens >= contextTokens) {
      context.addIssue({
        code: 'custom', path: ['profiles', profileIndex, 'limits'],
        message: 'Profile output allowance must leave input context space',
      });
    }
  }
});

export async function loadConfig(filename: string): Promise<HostConfig> {
  const absolute = resolve(filename);
  const content = await readFile(absolute, 'utf8');
  if (Buffer.byteLength(content) > 262144) throw new WorkerError('invalid_config', 'Host configuration exceeds size limit');
  const config = hostConfigSchema.parse(JSON.parse(content));
  const base = dirname(absolute);
  config.dataDir = resolve(base, config.dataDir);
  config.leaseDir = resolve(base, config.leaseDir);
  for (const repo of config.repositories) repo.root = resolve(base, repo.root);
  if (config.runner) {
    config.runner.configFile = resolve(base, config.runner.configFile);
    config.runner.codexExecutable = resolve(base, config.runner.codexExecutable);
    for (const recipe of config.runner.recipes) {
      if (!isAbsolute(recipe.executable)) throw new WorkerError('invalid_config', 'Recipe executables must be absolute host-local paths');
    }
  }
  for (const list of [config.repositories, config.models, config.profiles, config.runner?.recipes ?? []]) {
    if (new Set(list.map(x => x.id)).size !== list.length) throw new WorkerError('invalid_config', 'Duplicate registration identity');
  }
  for (const profile of config.profiles) {
    if (!config.models.some(m => m.id === profile.modelId)) throw new WorkerError('invalid_config', 'Profile references an unregistered model');
    for (const [key, value] of Object.entries(profile.limits ?? {}) as [keyof typeof config.limits, number][]) {
      if (value > config.limits[key]) throw new WorkerError('invalid_config', `Profile ${profile.id} limit ${key} exceeds the host ceiling`);
    }
  }
  if (config.models.some(model => model.provider === 'openrouter') && (config.inferencePolicy !== 'approved-free-providers' || !config.openrouter))
    throw new WorkerError('invalid_config', 'Remote models require the explicit approved-free-providers policy and OpenRouter controls');
  for (const repoId of config.openrouter?.allowedRepositories ?? []) {
    if (!config.repositories.some(repo => repo.id === repoId)) throw new WorkerError('invalid_config', 'OpenRouter references an unregistered repository');
  }
  if (config.limits.outputTokens >= config.limits.contextTokens) throw new WorkerError('invalid_config', 'Output allowance must leave input context space');
  return config;
}

/** Fingerprint the actual installed JavaScript, not only a manually bumped version. */
export async function implementationFingerprint(): Promise<string> {
  const root = dirname(fileURLToPath(import.meta.url));
  const hash = createHash('sha256');
  async function visit(dir: string): Promise<void> {
    for (const item of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      if (item.name === 'tests') continue;
      const path = join(dir, item.name);
      if (item.isDirectory()) await visit(path);
      else if (item.name.endsWith('.js')) hash.update(path.slice(root.length).replaceAll('\\', '/')).update(await readFile(path));
    }
  }
  await visit(root);
  return hash.digest('hex');
}
