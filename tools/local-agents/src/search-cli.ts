#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { SearchService, type WebSearchConfig } from './web-search.js';
import { createSearchMcpServer, safeSearchError } from './search-mcp.js';
import { WorkerError } from './types.js';

const args = process.argv.slice(2);
const option = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
async function boundedJson(filename: string, maxBytes: number): Promise<unknown> {
  if ((await stat(filename)).size > maxBytes) throw new WorkerError('input_limit', 'Search input file exceeds allowance');
  const data = await readFile(filename);
  if (data.byteLength > maxBytes) throw new WorkerError('input_limit', 'Search input file exceeds allowance');
  return JSON.parse(data.toString('utf8'));
}
try {
  const command = args[0];
  if (!command || ['help', '--help', '-h'].includes(command)) {
    process.stdout.write('ch4os-web-search <mcp|capabilities|search> --config <search.json> [--request <query.json>]\nSeparate paid-search key and budget; ordinary model inference remains free-only.\n');
  } else {
    if (!['mcp', 'capabilities', 'search'].includes(command)) throw new WorkerError('invalid_request', 'Unknown search command');
    const filename = option('--config');
    if (!filename) throw new WorkerError('invalid_config', 'Supply --config <search.json>');
    const config = await boundedJson(filename, 16384) as WebSearchConfig;
    if (!config || typeof config.storeDir !== 'string') throw new WorkerError('invalid_config', 'Search configuration requires storeDir');
    config.storeDir = resolve(dirname(resolve(filename)), config.storeDir);
    const service = new SearchService(config);
    const shutdown = new AbortController();
    process.once('SIGINT', () => shutdown.abort(new WorkerError('cancelled', 'Search stopped')));
    process.once('SIGTERM', () => shutdown.abort(new WorkerError('cancelled', 'Search stopped')));
    if (command === 'capabilities') process.stdout.write(JSON.stringify(await service.capabilities()) + '\n');
    else if (command === 'search') {
      const request = option('--request');
      if (!request) throw new WorkerError('invalid_request', 'Supply --request <query.json>');
      process.stdout.write(JSON.stringify(await service.search(await boundedJson(request, 8192) as Parameters<SearchService['search']>[0], { signal: shutdown.signal })) + '\n');
    } else {
      const transport = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 16384 });
      const server = serveStdio(() => createSearchMcpServer(service, shutdown.signal), { transport, onerror: () => process.stderr.write('Search transport error\n') });
      await new Promise<void>(resolve => {
        const done = () => { shutdown.abort(new WorkerError('cancelled', 'Search transport disconnected')); resolve(); };
        process.stdin.once('end', done);
        process.stdin.once('close', done);
        shutdown.signal.addEventListener('abort', () => resolve(), { once: true });
      });
      await server.close();
    }
  }
} catch (error) {
  process.stderr.write(JSON.stringify({ error: safeSearchError(error) }) + '\n');
  process.exitCode = 1;
}
