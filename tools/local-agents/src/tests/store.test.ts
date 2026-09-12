import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JobStore, hashRequest } from '../store.js';
import type { Job } from '../types.js';

function queuedJob(id = 'job-1'): Job {
  return {
    id, requestKey: 'request-1', state: 'queued', createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z', progress: 'queued',
  };
}

const metadata = {
  serviceVersion: '0.1.0', promptVersion: '2', runtimeFingerprint: 'a'.repeat(64),
  modelId: 'model', modelIdentity: 'b'.repeat(64), modelProvider: 'ollama' as const,
  routing: { locality: 'local' as const, model: 'test' }, modelDigest: 'b'.repeat(64), profileId: 'profile', taskClass: 'exploration' as const,
  qualificationFingerprint: 'c'.repeat(64), snapshotId: 'd'.repeat(64),
};

test('persists only a stable request hash and expires jobs after TTL', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'local-agents-store-'));
  let now = new Date('2026-01-01T00:00:00.000Z');
  const store = new JobStore(directory, { ttlMs: 1_000, now: () => now });
  await store.init();
  const request = { requestKey: 'request-1', instruction: 'SUPER SECRET RAW PROMPT', sources: [{ text: 'PRIVATE SOURCE' }] };
  const digest = hashRequest(request);
  await store.create(queuedJob(), digest, 'owner-1');
  const persisted = await readFile(path.join(directory, 'jobs.json'), 'utf8');
  assert.match(persisted, new RegExp(digest));
  assert.doesNotMatch(persisted, /SUPER SECRET|PRIVATE SOURCE/);
  assert.equal(store.findByRequestKey('request-1')?.requestHash, digest);

  now = new Date('2026-01-01T00:00:02.000Z');
  assert.equal(store.get('job-1'), undefined);
  await store.close();
});

test('recovers only nonterminal jobs and retains terminal results', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'local-agents-store-'));
  const store = new JobStore(directory);
  await store.init();
  await store.create(queuedJob('abandoned'), 'a'.repeat(64), 'old-owner');
  await store.create({ ...queuedJob('done'), requestKey: 'request-2', state: 'cancelled' }, 'b'.repeat(64), 'old-owner');
  assert.equal(await store.recoverAbandoned('new-owner'), 1);
  assert.equal(store.get('abandoned')?.state, 'interrupted');
  assert.equal(store.get('done')?.state, 'cancelled');
  await store.close();
});

test('feedback metrics contain hashes and counts instead of evidence text', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'local-agents-store-'));
  const store = new JobStore(directory);
  await store.init();
  await store.appendFeedback({
    jobId: 'job-1', verdict: 'corrected', evidence: ['sensitive reviewer note'], correctionCount: 2, verificationMs: 17,
  }, metadata);
  const metrics = await readFile(path.join(directory, 'metrics.jsonl'), 'utf8');
  assert.doesNotMatch(metrics, /sensitive reviewer note/);
  assert.match(metrics, /"evidenceCount":1/);
  assert.match(metrics, /"evidenceHashes":\["[a-f0-9]{64}"\]/);
  assert.match(metrics, /"profileId":"profile"/);
  assert.match(metrics, /"snapshotId":"d{64}"/);
  assert.match(metrics, /"runtimeFingerprint":"a{64}"/);
  await store.close();
});

test('prunes the oldest terminal jobs by count and bytes without evicting active work', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'local-agents-store-'));
  const store = new JobStore(directory, { maxJobs: 2, maxStoreBytes: 1_500 });
  await store.init();
  await store.create({ ...queuedJob('active'), requestKey: 'active' }, 'a'.repeat(64), 'owner');
  await store.create({
    ...queuedJob('old'), requestKey: 'old', state: 'completed', updatedAt: '2026-01-01T00:00:01.000Z',
    progress: 'x'.repeat(500),
  }, 'b'.repeat(64), 'owner');
  await store.create({
    ...queuedJob('new'), requestKey: 'new', state: 'completed', updatedAt: '2026-01-01T00:00:02.000Z',
    progress: 'y'.repeat(500),
  }, 'c'.repeat(64), 'owner');
  assert.ok(store.get('active'));
  assert.equal(store.get('old'), undefined);
  const persisted = await readFile(path.join(directory, 'jobs.json'), 'utf8');
  assert.ok(Buffer.byteLength(persisted) <= 1_500);
  assert.ok(store.size <= 2);
  await store.close();
});

test('compacts metrics by age and maximum bytes', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'local-agents-store-'));
  let now = new Date('2026-01-01T00:00:00.000Z');
  const store = new JobStore(directory, { metricRetentionMs: 1_000, maxMetricBytes: 220, now: () => now });
  await store.init();
  await store.appendMetric({ event: 'old', state: 'completed' });
  now = new Date('2026-01-01T00:00:02.000Z');
  for (let index = 0; index < 8; index += 1) {
    await store.appendMetric({ event: `new-${index}`, state: 'completed' });
  }
  const metrics = await readFile(path.join(directory, 'metrics.jsonl'), 'utf8');
  assert.doesNotMatch(metrics, /"event":"old"/);
  assert.ok(Buffer.byteLength(metrics) <= 220);
  assert.match(metrics, /"event":"new-7"/);
  await store.close();
});
