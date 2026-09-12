import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { captureSnapshot, listFiles, normalizeSnapshotPath, readLines, searchSnapshot } from '../snapshot.js';
import { DEFAULT_LIMITS, type RepositoryConfig, type TaskRequest, WorkerError } from '../types.js';

const execFileAsync = promisify(execFile);

async function fixture(): Promise<{ root: string; repository: RepositoryConfig; request: TaskRequest; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'local-agent-snapshot-'));
  await mkdir(join(root, 'src'));
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'src', 'alpha.txt'), 'one\nNeedle here\nthree\n', 'utf8');
  await writeFile(join(root, 'src', 'beta.txt'), 'outside requested path\n', 'utf8');
  await writeFile(join(root, 'dist', 'generated.txt'), 'excluded\n', 'utf8');
  await writeFile(join(root, '.env'), 'SECRET=not-captured\n', 'utf8');
  await execFileAsync('git', ['init', '--quiet'], { cwd: root, windowsHide: true });
  await execFileAsync('git', ['-c', 'user.name=Snapshot Test', '-c', 'user.email=snapshot@example.invalid', 'add', '.'], { cwd: root, windowsHide: true });
  await execFileAsync('git', ['-c', 'user.name=Snapshot Test', '-c', 'user.email=snapshot@example.invalid', 'commit', '--quiet', '-m', 'fixture'], { cwd: root, windowsHide: true });
  const repository = { id: 'repo', root, allowPaths: ['src'], excludes: [] };
  const request: TaskRequest = {
    requestKey: 'request', repositoryId: 'repo', paths: ['src/alpha.txt'], profileId: 'profile',
    taskClass: 'exploration', instruction: 'inspect', mode: 'work', enabledCheckIds: [],
  };
  return { root, repository, request, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('captureSnapshot intersects scope and resolves Git independently of the repository PATH', async () => {
  const item = await fixture();
  try {
    const originalPath = process.env.PATH;
    let snapshot: Awaited<ReturnType<typeof captureSnapshot>>;
    try {
      process.env.PATH = item.root;
      snapshot = await captureSnapshot(item.repository, item.request, DEFAULT_LIMITS);
    } finally { process.env.PATH = originalPath; }
    assert.match(snapshot.head ?? '', /^[a-f0-9]{40}$/);
    assert.equal(snapshot.dirty, false);
    assert.deepEqual(snapshot.files.map(file => file.path), ['src/alpha.txt']);
    assert.equal(snapshot.files[0]!.sha256, createHash('sha256').update(snapshot.files[0]!.text).digest('hex'));
    assert.match(snapshot.id, /^[a-f0-9]{64}$/);
    const repeated = await captureSnapshot(item.repository, { ...item.request, expectedHead: snapshot.head!, expectedSnapshotId: snapshot.id }, DEFAULT_LIMITS);
    assert.equal(repeated.id, snapshot.id);
  } finally { await item.cleanup(); }
});

test('captureSnapshot rejects scope escape and ambiguous Windows paths before filesystem access', async () => {
  const item = await fixture();
  try {
    for (const path of ['../src/alpha.txt', 'C:src/alpha.txt', '\\\\server\\share', 'src/file:stream', 'src/CON.txt']) {
      await assert.rejects(captureSnapshot(item.repository, { ...item.request, paths: [path] }, DEFAULT_LIMITS),
        (error: unknown) => error instanceof WorkerError && error.code === 'invalid_path');
    }
    await assert.rejects(captureSnapshot(item.repository, { ...item.request, paths: ['other'] }, DEFAULT_LIMITS),
      (error: unknown) => error instanceof WorkerError && error.code === 'scope_denied');
  } finally { await item.cleanup(); }
});

test('captureSnapshot enforces expected Git and snapshot identities', async () => {
  const item = await fixture();
  try {
    await assert.rejects(captureSnapshot(item.repository, { ...item.request, expectedHead: '0'.repeat(40) }, DEFAULT_LIMITS),
      (error: unknown) => error instanceof WorkerError && error.code === 'head_mismatch');
    await assert.rejects(captureSnapshot(item.repository, { ...item.request, expectedSnapshotId: '0'.repeat(64) }, DEFAULT_LIMITS),
      (error: unknown) => error instanceof WorkerError && error.code === 'snapshot_mismatch');
  } finally { await item.cleanup(); }
});

test('snapshot identity binds effective scope even when captured files are identical', async () => {
  const item = await fixture();
  try {
    const narrow = await captureSnapshot(item.repository, item.request, DEFAULT_LIMITS);
    const wider = await captureSnapshot(item.repository, { ...item.request, paths: ['src/alpha.txt', 'src/missing.txt'] }, DEFAULT_LIMITS);
    assert.deepEqual(wider.files, narrow.files);
    assert.deepEqual(wider.omissions, narrow.omissions);
    assert.notEqual(wider.id, narrow.id);
  } finally { await item.cleanup(); }
});

test('snapshot identity binds omissions and exact dirty status identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'local-agent-snapshot-identity-'));
  try {
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src', 'alpha.txt'), 'same\n', 'utf8');
    const repository = { id: 'repo', root, allowPaths: ['src'], excludes: [] };
    const request: TaskRequest = { requestKey: 'request', repositoryId: 'repo', paths: ['src'], profileId: 'profile',
      taskClass: 'exploration', instruction: 'inspect', mode: 'work', enabledCheckIds: [] };
    const complete = await captureSnapshot(repository, request, DEFAULT_LIMITS);
    await writeFile(join(root, 'src', 'binary.dat'), Buffer.from([1, 0, 2]));
    const incomplete = await captureSnapshot(repository, request, DEFAULT_LIMITS);
    assert.deepEqual(incomplete.files, complete.files);
    assert.notDeepEqual(incomplete.omissions, complete.omissions);
    assert.notEqual(incomplete.id, complete.id);
  } finally { await rm(root, { recursive: true, force: true }); }

  const item = await fixture();
  try {
    await writeFile(join(item.root, 'outside-a.txt'), 'ignored\n', 'utf8');
    const first = await captureSnapshot(item.repository, item.request, DEFAULT_LIMITS);
    await rm(join(item.root, 'outside-a.txt'));
    await writeFile(join(item.root, 'outside-b.txt'), 'ignored\n', 'utf8');
    const second = await captureSnapshot(item.repository, item.request, DEFAULT_LIMITS);
    assert.equal(first.dirty, true);
    assert.equal(second.dirty, true);
    assert.deepEqual(first.files, second.files);
    assert.notEqual(first.id, second.id);
  } finally { await item.cleanup(); }
});

test('captureSnapshot fails immediately when its signal is cancelled', async () => {
  const item = await fixture();
  try {
    const controller = new AbortController();
    const reason = new WorkerError('cancelled', 'test cancellation');
    controller.abort(reason);
    await assert.rejects(captureSnapshot(item.repository, item.request, DEFAULT_LIMITS, controller.signal), error => error === reason);
  } finally { await item.cleanup(); }
});

test('captureSnapshot omits excluded, oversized, binary, and hard-linked files explicitly', async () => {
  const item = await fixture();
  try {
    await writeFile(join(item.root, 'src', 'large.txt'), 'x'.repeat(100), 'utf8');
    await writeFile(join(item.root, 'src', 'binary.dat'), Buffer.from([1, 0, 2]));
    await link(join(item.root, 'src', 'alpha.txt'), join(item.root, 'src', 'linked.txt'));
    const snapshot = await captureSnapshot(item.repository, { ...item.request, paths: ['src'] }, { ...DEFAULT_LIMITS, maxFileBytes: 32 });
    assert.equal(snapshot.files.some(file => file.path.endsWith('large.txt')), false);
    assert.equal(snapshot.files.some(file => file.path.endsWith('binary.dat')), false);
    assert.equal(snapshot.files.some(file => file.path.endsWith('linked.txt')), false);
    assert.ok(snapshot.omissions.some(value => value.includes('large.txt') && value.includes('exceeds')));
    assert.ok(snapshot.omissions.some(value => value.includes('binary.dat') && value.includes('binary')));
    assert.ok(snapshot.omissions.some(value => value.includes('linked.txt') && value.includes('hard-linked')));
  } finally { await item.cleanup(); }
});

test('captureSnapshot excludes private runtime and credential directories at every depth', async () => {
  const item = await fixture();
  try {
    const privatePaths = ['.local', '.ch4os-tools', '.ssh', '.aws'];
    for (const directory of privatePaths) {
      await mkdir(join(item.root, 'src', directory));
      await writeFile(join(item.root, 'src', directory, 'private.txt'), 'must not be captured\n', 'utf8');
    }
    const snapshot = await captureSnapshot(item.repository, { ...item.request, paths: ['src'] }, DEFAULT_LIMITS);
    for (const directory of privatePaths) {
      assert.equal(snapshot.files.some(file => file.path.includes(`/${directory}/`)), false);
      assert.ok(snapshot.omissions.some(value => value.includes(`src/${directory}: excluded (default: ${directory})`)));
    }
  } finally { await item.cleanup(); }
});

test('snapshot tools preserve one-based lines and bound serialized output', async () => {
  const item = await fixture();
  try {
    const snapshot = await captureSnapshot(item.repository, item.request, DEFAULT_LIMITS);
    const listed = listFiles(snapshot, 512);
    assert.equal(listed.files[0]!.lines, 4);
    const read = readLines(snapshot, 'src/alpha.txt', 2, 3, 100);
    assert.deepEqual(read, { path: 'src/alpha.txt', startLine: 2, endLine: 3, text: 'Needle here\nthree', truncated: false });
    const boundedRead = readLines(snapshot, 'src/alpha.txt', 1, 4, 95);
    assert.ok(Buffer.byteLength(JSON.stringify(boundedRead)) <= 95);
    assert.equal(boundedRead.truncated, true);
    const found = searchSnapshot(snapshot, 'needle', 256);
    assert.deepEqual(found.matches, [{ path: 'src/alpha.txt', line: 2, text: 'Needle here' }]);
    assert.ok(Buffer.byteLength(JSON.stringify(listFiles(snapshot, 40))) <= 40);
    assert.ok(Buffer.byteLength(JSON.stringify(searchSnapshot(snapshot, 'e', 40))) <= 40);
  } finally { await item.cleanup(); }
});

test('normalizeSnapshotPath accepts portable relative paths only', () => {
  assert.equal(normalizeSnapshotPath('./src\\alpha.txt'), 'src/alpha.txt');
  assert.throws(() => normalizeSnapshotPath('src//alpha.txt'), WorkerError);
});
