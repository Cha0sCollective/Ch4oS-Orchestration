#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { loadConfig } from './config.js';
import { OllamaProvider } from './ollama.js';
import { createProviders } from './providers.js';
import { IsolatedCommandRunner } from './runner.js';
import { WorkerService, qualificationFingerprint } from './service.js';
import { createMcpServer, safeError } from './mcp.js';
import { WorkerError } from './types.js';

async function* requestLines(input: NodeJS.ReadableStream): AsyncGenerator<string> {
  let pending = Buffer.alloc(0);
  for await (const chunk of input) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    let offset = 0;
    while (offset < bytes.length) {
      const newline = bytes.indexOf(10, offset);
      const end = newline < 0 ? bytes.length : newline;
      if (pending.length + end - offset > 262144) throw new WorkerError('input_limit', 'Request line exceeds allowance');
      pending = Buffer.concat([pending, bytes.subarray(offset, end)]);
      if (newline < 0) break;
      yield pending.toString('utf8');
      pending = Buffer.alloc(0);
      offset = newline + 1;
    }
  }
  if (pending.length) yield pending.toString('utf8');
}

const args = process.argv.slice(2);
const command = args[0];
const option = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
if (!command || ['--help', 'help', '-h'].includes(command)) {
  process.stdout.write('ch4os-local-agents <mcp|serve|capabilities|run|probe-context|fingerprint> --config <host.json> [--request <task.json>] [--model-id <id>] [--profile-id <id>]\nserve accepts newline-delimited JSON {id,method,params} using the five worker operations.\n');
} else {
  let service: WorkerService | undefined;
  try {
    const filename = option('--config') ?? process.env.CH4OS_LOCAL_AGENTS_CONFIG;
    if (!filename) throw new WorkerError('invalid_config', 'Supply --config or CH4OS_LOCAL_AGENTS_CONFIG');
    const config = await loadConfig(filename);
    const provider = new OllamaProvider(config.ollamaUrl);
    if (command === 'probe-context') {
      if (!config.allowQualification) throw new WorkerError('qualification_disabled', 'Host qualification must be explicitly enabled');
      const model = config.models.find(item => item.id === option('--model-id'));
      if (!model || model.provider !== 'ollama') throw new WorkerError('invalid_request', 'Select a registered local Ollama --model-id');
      process.stdout.write(JSON.stringify(await provider.probeContext(model, config.limits, AbortSignal.timeout(config.limits.taskTimeoutMs))) + '\n');
    } else if (command === 'fingerprint') {
      const profile = config.profiles.find(item => item.id === option('--profile-id'));
      const model = config.models.find(item => item.id === profile?.modelId);
      if (!profile || !model) throw new WorkerError('invalid_request', 'Select a registered --profile-id');
      process.stdout.write(JSON.stringify({ fingerprint: await qualificationFingerprint(config, profile, model) }) + '\n');
    } else {
      service = await WorkerService.create(config, createProviders(config), new IsolatedCommandRunner(config));
      const active = service;
      const shutdown = async () => { await active.close(); };
      process.once('SIGINT', () => { void shutdown().then(() => process.exit(130)); });
      process.once('SIGTERM', () => { void shutdown().then(() => process.exit(143)); });
      if (command === 'capabilities') process.stdout.write(JSON.stringify(await active.capabilities()) + '\n');
      else if (command === 'mcp') {
        const transport = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 262144 });
        const server = serveStdio(() => createMcpServer(active), { transport, onerror: () => process.stderr.write('MCP transport error\n') });
        await new Promise<void>(resolve => process.stdin.once('end', resolve));
        await active.close();
        await server.close();
      } else if (command === 'serve') {
        for await (const line of requestLines(process.stdin)) {
          let id: unknown = null;
          try {
            if (Buffer.byteLength(line) > 262144) throw new WorkerError('input_limit', 'Request line exceeds allowance');
            const request = JSON.parse(line); id = request.id;
            let value: unknown;
            switch (request.method) {
              case 'capabilities': value = await active.capabilities(); break;
              case 'start_task': value = await active.startTask(request.params); break;
              case 'get_task': value = await active.getTask(request.params?.jobId); break;
              case 'cancel_task': value = await active.cancelTask(request.params?.jobId); break;
              case 'record_feedback': await active.recordFeedback(request.params); value = { ok: true }; break;
              default: throw new WorkerError('unknown_method', 'Unknown worker operation');
            }
            process.stdout.write(JSON.stringify({ id, result: value }) + '\n');
          } catch (error) { process.stdout.write(JSON.stringify({ id, error: safeError(error) }) + '\n'); }
        }
      } else if (command === 'run') {
        const requestFile = option('--request');
        if (!requestFile) throw new WorkerError('invalid_request', 'Supply --request <task.json>');
        const input = await readFile(requestFile, 'utf8');
        if (Buffer.byteLength(input) > 262144) throw new WorkerError('input_limit', 'Task file exceeds allowance');
        let job = await active.startTask(JSON.parse(input));
        while (job.state === 'queued' || job.state === 'running') {
          await new Promise(resolve => setTimeout(resolve, 200)); job = await active.getTask(job.id);
        }
        process.stdout.write(JSON.stringify(job) + '\n');
        if (job.state !== 'completed' || job.result?.answer.outcome !== 'answered') process.exitCode = 1;
      } else throw new WorkerError('unknown_method', 'Unknown command; use --help');
    }
  } catch (error) { process.stderr.write(JSON.stringify({ error: safeError(error) }) + '\n'); process.exitCode = 1; }
  finally { await service?.close(); }
}
