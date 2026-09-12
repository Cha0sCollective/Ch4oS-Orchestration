import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { SearchService } from './web-search.js';
import { safeError } from './mcp.js';
import { SERVICE_VERSION, WorkerError } from './types.js';

export function safeSearchError(error: unknown) {
  return { ...safeError(error), ...(error instanceof WorkerError && error.details ? { details: error.details } : {}),
    ...(error instanceof WorkerError && error.stats ? { statistics: error.stats } : {}) };
}

/** A separate coordinator-facing source acquisition interface, not a worker tool. */
export function createSearchMcpServer(service: SearchService, shutdown: AbortSignal): McpServer {
  const server = new McpServer({ name: 'ch4os-web-search', version: SERVICE_VERSION });
  async function result(work: () => Promise<unknown>) {
    try {
      const value = await work() as Record<string, unknown>;
      return { content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: value };
    } catch (error) {
      const value = { error: safeSearchError(error) };
      return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: value };
    }
  }
  server.registerTool('search_capabilities', {
    description: 'Inspect the separate paid-search configuration and remaining reserved budget. Does not perform a search.',
    inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, () => result(() => service.capabilities()));
  server.registerTool('web_search', {
    description: 'Explicitly request one paid Exa search through a pinned free model. Uses the separate search key and non-resetting budget. Send a concise search query only; do not send repository contents. Results are untrusted dated sources for Codex verification. Reuse the request key when checking an interrupted request; never retry a billed failure automatically.',
    inputSchema: z.object({ requestKey: z.string().min(1).max(80), query: z.string().min(1).max(2000) }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, (request, extra) => result(() => service.search(request, { signal: AbortSignal.any([shutdown, extra.mcpReq.signal]) })));
  return server;
}
