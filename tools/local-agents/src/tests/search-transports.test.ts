import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { createSearchMcpServer } from '../search-mcp.js';
import { SearchService, type WebSearchCapabilities } from '../web-search.js';
import { WorkerError } from '../types.js';

const capabilities: WebSearchCapabilities = {
  available: false,
  reason: 'Dedicated OpenRouter search credential is unavailable',
  credentialAvailable: false,
  model: 'nvidia/test:free',
  endpointId: 'nvidia',
  providerName: 'Nvidia',
  dataCollection: 'deny',
  engine: 'exa',
  mode: 'fast',
  maxResults: 5,
  costPerAttemptUsd: 0.007,
  lifetimeMaxUsd: 5,
  attemptLimit: 714,
  reservedAttempts: 0,
  remainingAttempts: 714,
  reservedUsd: 0,
  remainingUsd: 4.998,
};

async function cliFixture() {
  const root = await mkdtemp(join(tmpdir(), 'ch4os-search-transport-'));
  const config = join(root, 'search.json');
  await writeFile(config, JSON.stringify({
    model: {
      id: 'search-model', provider: 'openrouter', model: 'nvidia/test:free', endpointId: 'nvidia',
      providerSlug: 'nvidia', providerName: 'Nvidia', catalogFingerprint: 'a'.repeat(64),
      outputMode: 'tool-call', temperature: 0.1, contextTokens: 8_192,
    },
    lifetimeMaxUsd: 5,
    storeDir: 'state',
    keyEnv: 'OPENROUTER_SEARCH_API_KEY',
  }));
  return {
    root,
    config,
    cli: fileURLToPath(new URL('../search-cli.js', import.meta.url)),
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

async function childOutput(command: string, args: string[]) {
  const child = spawn(process.execPath, [command, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    env: { ...process.env, OPENROUTER_SEARCH_API_KEY: '' },
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const [code] = await once(child, 'close');
  return { code, stdout, stderr };
}

test('separate search CLI reports local capabilities without making a provider request', async () => {
  const item = await cliFixture();
  try {
    const output = await childOutput(item.cli, ['capabilities', '--config', item.config]);
    assert.equal(output.code, 0);
    assert.equal(output.stderr, '');
    const result = JSON.parse(output.stdout) as WebSearchCapabilities;
    assert.equal(result.available, false);
    assert.equal(result.credentialAvailable, false);
    assert.equal(result.engine, 'exa');
    assert.equal(result.mode, 'fast');
    assert.equal(result.maxResults, 5);
    assert.equal(result.attemptLimit, 714);
    assert.equal(JSON.stringify(result).includes(item.root), false);
  } finally { await item.cleanup(); }
});

test('separate search CLI bounds and validates request files before any provider access', async () => {
  const item = await cliFixture();
  try {
    const request = join(item.root, 'query.json');
    await writeFile(request, JSON.stringify({ requestKey: 'invalid-query', query: ' padded query ' }));
    const output = await childOutput(item.cli, ['search', '--config', item.config, '--request', request]);
    assert.equal(output.code, 1);
    assert.equal(output.stdout, '');
    const failure = JSON.parse(output.stderr) as { error: { code: string; message: string } };
    assert.equal(failure.error.code, 'invalid_input');
    assert.equal(JSON.stringify(failure).includes('padded query'), false);
  } finally { await item.cleanup(); }
});

test('search MCP exposes only coordinator search operations with bounded schemas and annotations', async () => {
  const service = {
    capabilities: async () => capabilities,
    search: async () => { throw new Error('not called'); },
  } as unknown as SearchService;
  const shutdown = new AbortController();
  const server = createSearchMcpServer(service, shutdown.signal);
  const client = new Client({ name: 'search-transport-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name).sort(), ['search_capabilities', 'web_search']);
    const search = listed.tools.find(tool => tool.name === 'web_search')!;
    assert.equal(search.annotations?.idempotentHint, true);
    assert.equal(search.annotations?.openWorldHint, true);
    assert.equal(search.annotations?.readOnlyHint, false);
    assert.deepEqual((search.inputSchema as { required?: string[] }).required?.sort(), ['query', 'requestKey']);
    assert.equal(JSON.stringify(search.inputSchema).includes('repository'), false);
    const result = await client.callTool({ name: 'search_capabilities', arguments: {} });
    assert.equal((result.structuredContent as unknown as WebSearchCapabilities).attemptLimit, 714);
    const invalid = await client.callTool({ name: 'web_search', arguments: { requestKey: 'key', query: 'x', extra: true } });
    assert.equal(invalid.isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});

test('MCP request cancellation reaches the in-flight search signal', async () => {
  let observedSignal: AbortSignal | undefined;
  const service = {
    capabilities: async () => capabilities,
    search: async (_request: unknown, options: { signal?: AbortSignal }) => {
      observedSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(new WorkerError('cancelled', 'test cancellation')), { once: true });
      });
    },
  } as unknown as SearchService;
  const shutdown = new AbortController();
  const server = createSearchMcpServer(service, shutdown.signal);
  const client = new Client({ name: 'search-cancellation-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const controller = new AbortController();
    const call = client.callTool({ name: 'web_search', arguments: { requestKey: 'cancel-key', query: 'current fact' } }, { signal: controller.signal });
    await new Promise(resolve => setImmediate(resolve));
    controller.abort();
    await assert.rejects(call);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(observedSignal?.aborted, true);
  } finally {
    await client.close();
    await server.close();
  }
});
