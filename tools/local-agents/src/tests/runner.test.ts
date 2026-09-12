import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'node:child_process';
import { IsolatedCommandRunner, runnerQualificationFingerprint, type RunnerDependencies } from '../runner.js';
import { DEFAULT_LIMITS, type RunnerConfig, type Snapshot } from '../types.js';

function permissionTemplate(profile = 'checks', recipeIds: string[] = ['node']): string {
  return [
    `[permissions.${profile}.filesystem]`,
    `":root" = "deny"`,
    `":minimal" = "read"`,
    `"{{workspace}}" = "read"`,
    `"{{scratch}}" = "write"`,
    ...recipeIds.map(recipeId => `"{{runtime:${recipeId}}}" = "read"`),
    '',
    `[permissions.${profile}.network]`,
    'enabled = false',
    '',
  ].join('\n');
}

async function configured(args = ['-e', 'process.stdout.write("ok")']): Promise<{ root: string; config: RunnerConfig; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'local-agent-runner-'));
  const configFile = join(root, 'permissions.toml');
  await writeFile(configFile, permissionTemplate(), 'utf8');
  const config: RunnerConfig = {
    codexExecutable: process.execPath,
    permissionProfile: 'checks',
    configFile,
    recipes: [{ id: 'node', executable: process.execPath, args, requiredPaths: ['src/input.txt'], timeoutMs: 1000 }],
  };
  return { root, config, cleanup: () => rm(root, { recursive: true, force: true }) };
}

function snapshot(): Snapshot {
  const text = 'input\n';
  return { id: 'snapshot-id', repositoryId: 'repo', head: null, dirty: false, omissions: [],
    files: [{ path: 'src/input.txt', text, sha256: createHash('sha256').update(text).digest('hex') }] };
}

class FakeChild extends EventEmitter {
  pid = 4242;
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  kill(): boolean { queueMicrotask(() => this.emit('close', null)); return true; }
}

test('runner is disabled by default and rejects an unreviewed fingerprint', async () => {
  const root = await mkdtemp(join(tmpdir(), 'local-agent-runner-disabled-'));
  try {
    assert.equal((await new IsolatedCommandRunner(undefined, root).health()).available, false);
    const item = await configured();
    try {
      item.config.qualification = { fingerprint: '0'.repeat(64), evidence: 'test', verifiedAt: new Date().toISOString() };
      assert.equal((await new IsolatedCommandRunner(item.config, item.root).health()).available, false);
    } finally { await item.cleanup(); }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('qualification rejects unknown recipe argument placeholders', async () => {
  const item = await configured(['{workspace}', '{arbitrary}']);
  try { await assert.rejects(runnerQualificationFingerprint(item.config), /unsupported argument placeholder/); }
  finally { await item.cleanup(); }
});

test('qualification rejects extra config sections that could widen execution', async () => {
  const item = await configured();
  try {
    await writeFile(item.config.configFile, `${permissionTemplate()}\n[hooks]\nenabled = true\n`, 'utf8');
    await assert.rejects(runnerQualificationFingerprint(item.config), /unreviewed or duplicate section/);
  } finally { await item.cleanup(); }
});

test('rendering deduplicates a shared Windows runtime path across recipes', async () => {
  const item = await configured();
  try {
    item.config.recipes.push({ ...item.config.recipes[0]!, id: 'node-again' });
    await writeFile(item.config.configFile, permissionTemplate('checks', ['node', 'node-again']), 'utf8');
    item.config.qualification = { fingerprint: await runnerQualificationFingerprint(item.config), evidence: 'unit fixture', verifiedAt: new Date().toISOString() };
    let renderedConfig: Promise<string> | undefined;
    const runner = new IsolatedCommandRunner(item.config, item.root, {
      spawnProcess(_executable, args, options) {
        const layerIndex = args.indexOf('-p');
        renderedConfig = readFile(join(String(options.env!.CODEX_HOME), `${String(args[layerIndex + 1])}.config.toml`), 'utf8');
        const child = new FakeChild();
        queueMicrotask(() => child.emit('close', 0));
        return child as unknown as ChildProcessWithoutNullStreams;
      },
    });
    const receipt = await runner.run('node', snapshot(), DEFAULT_LIMITS, new AbortController().signal);
    assert.equal(receipt.status, 'passed');
    const configText = await renderedConfig!;
    const escapedExecutable = process.execPath.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
    assert.equal(configText.split(`"${escapedExecutable}" = "read"`).length - 1, 1);
  } finally { await item.cleanup(); }
});

test('runner uses fixed sandbox argv, bounds output, and cleans job directories', async () => {
  const item = await configured(['{workspace}', '{scratch}']);
  try {
    item.config.qualification = { fingerprint: await runnerQualificationFingerprint(item.config), evidence: 'unit fixture', verifiedAt: new Date().toISOString() };
    let invocation: { executable: string; args: readonly string[]; options: SpawnOptionsWithoutStdio } | undefined;
    const dependencies: RunnerDependencies = {
      spawnProcess(executable, args, options) {
        invocation = { executable, args, options };
        const child = new FakeChild();
        queueMicrotask(() => { child.stdout.write('0123456789'); child.stderr.write('more'); child.emit('close', 0); });
        return child as unknown as ChildProcessWithoutNullStreams;
      },
    };
    const runner = new IsolatedCommandRunner(item.config, item.root, dependencies);
    assert.equal((await runner.health()).available, true);
    const receipt = await runner.run('node', snapshot(), { ...DEFAULT_LIMITS, toolOutputBytes: 8 }, new AbortController().signal);
    assert.equal(receipt.status, 'passed');
    assert.equal(receipt.exitCode, 0);
    assert.equal(receipt.output, '01234567');
    assert.equal(receipt.truncated, true);
    assert.equal(invocation!.executable, process.execPath);
    assert.equal(invocation!.args[0], 'sandbox');
    assert.ok(invocation!.args.includes('-p'));
    assert.ok(invocation!.args.includes('-P'));
    assert.ok(invocation!.args.includes('--sandbox-state-disable-network'));
    assert.ok(invocation!.args.includes('--'));
    const cwdIndex = invocation!.args.indexOf('-C');
    assert.equal(invocation!.options.cwd, invocation!.args[cwdIndex + 1]);
    assert.deepEqual((await readdir(item.root)).sort(), ['codex-runner-home', 'permissions.toml']);
    assert.deepEqual(await readdir(join(item.root, 'codex-runner-home')), []);
  } finally { await item.cleanup(); }
});

test('missing required paths fail closed before process launch', async () => {
  const item = await configured();
  try {
    item.config.qualification = { fingerprint: await runnerQualificationFingerprint(item.config), evidence: 'unit fixture', verifiedAt: new Date().toISOString() };
    let spawned = false;
    const runner = new IsolatedCommandRunner(item.config, item.root, { spawnProcess() { spawned = true; throw new Error('must not spawn'); } });
    const missing = { ...snapshot(), files: [] };
    const receipt = await runner.run('node', missing, DEFAULT_LIMITS, new AbortController().signal);
    assert.equal(receipt.status, 'unavailable');
    assert.equal(spawned, false);
  } finally { await item.cleanup(); }
});

test('deadline kills the process tree and removes the isolated workspace', async () => {
  const item = await configured();
  try {
    item.config.recipes[0]!.timeoutMs = 5;
    item.config.qualification = { fingerprint: await runnerQualificationFingerprint(item.config), evidence: 'unit fixture', verifiedAt: new Date().toISOString() };
    let killed = false;
    let active: FakeChild | undefined;
    const runner = new IsolatedCommandRunner(item.config, item.root, {
      spawnProcess() { active = new FakeChild(); return active as unknown as ChildProcessWithoutNullStreams; },
      async killProcessTree() { killed = true; active!.emit('close', null); },
    });
    const receipt = await runner.run('node', snapshot(), DEFAULT_LIMITS, new AbortController().signal);
    assert.equal(receipt.status, 'timed_out');
    assert.equal(killed, true);
    assert.deepEqual((await readdir(item.root)).sort(), ['codex-runner-home', 'permissions.toml']);
    assert.deepEqual(await readdir(join(item.root, 'codex-runner-home')), []);
  } finally { await item.cleanup(); }
});

test('persistent home refuses unreviewed base configuration before launch', async () => {
  const item=await configured();
  try {
    item.config.qualification={fingerprint:await runnerQualificationFingerprint(item.config),evidence:'unit',verifiedAt:new Date().toISOString()};
    await mkdir(join(item.root,'codex-runner-home'));
    await writeFile(join(item.root,'codex-runner-home','config.toml'),'sandbox_mode = "danger-full-access"');
    let spawned=false;
    const runner=new IsolatedCommandRunner(item.config,item.root,{spawnProcess(){spawned=true;throw new Error('forbidden')}});
    const receipt=await runner.run('node',snapshot(),DEFAULT_LIMITS,new AbortController().signal);
    assert.equal(receipt.status,'unavailable');assert.match(receipt.output,/base configuration/);assert.equal(spawned,false);
  } finally {await item.cleanup()}
});

test('cancellation during spawn is observed and duplicate runtime grants are collapsed', async () => {
  const item=await configured();
  try {
    item.config.recipes.push({...item.config.recipes[0]!,id:'second'});
    await writeFile(item.config.configFile, permissionTemplate('checks', ['node', 'second']));
    item.config.qualification={fingerprint:await runnerQualificationFingerprint(item.config),evidence:'unit',verifiedAt:new Date().toISOString()};
    const controller=new AbortController();let killed=false;let generated='';
    const runner=new IsolatedCommandRunner(item.config,item.root,{
      spawnProcess(_executable,args,options){const child=new FakeChild();generated=join(options.env!.CODEX_HOME!,String(args[2])+'.config.toml');controller.abort();return child as unknown as ChildProcessWithoutNullStreams},
      async killProcessTree(child){killed=true;const config=await readFile(generated,'utf8');assert.equal(config.split(process.execPath.replaceAll('\\','\\\\')).length-1,1);child.emit('close',null)},
    });
    const receipt=await runner.run('node',snapshot(),DEFAULT_LIMITS,controller.signal);
    assert.equal(receipt.status,'cancelled');assert.equal(killed,true);
  } finally {await item.cleanup()}
});
