import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { taskRequestSchema, feedbackSchema } from './config.js';
import { WorkerService } from './service.js';
import { SERVICE_VERSION, WorkerError } from './types.js';

export function safeError(error: unknown) {
  return { code: error instanceof WorkerError ? error.code : 'request_failed',
    message: error instanceof WorkerError ? error.message : 'Request failed validation or execution; inspect local diagnostics.' };
}
async function result(work: () => Promise<unknown>) {
  try {
    const value = await work();
    const data = value && typeof value === 'object' ? value as Record<string, unknown> : { ok: true };
    return { content: [{ type: 'text' as const, text: JSON.stringify(data) }], structuredContent: data };
  } catch (error) {
    const data = { error: safeError(error) };
    return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(data) }], structuredContent: data };
  }
}
export function createMcpServer(service: WorkerService): McpServer {
  const server = new McpServer({ name: 'ch4os-local-agents', version: SERVICE_VERSION });
  const remote = service.config.inferencePolicy === 'approved-free-providers';
  server.registerTool('capabilities', { description: 'Inspect worker readiness, registered repository scope, available task classes, qualification requirements, and limits before delegating.', inputSchema: z.object({}).strict(), annotations: { readOnlyHint: true, openWorldHint: remote } }, () => result(() => service.capabilities()));
  server.registerTool('start_task', { description: 'Start a bounded worker job using an approved local or free remote model. Reads scoped snapshots and optionally runs enabled isolated checks. Returns proposals; never applies edits. Installed discretionary models require no qualification; use mode work. Results require Codex verification.', inputSchema: taskRequestSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: remote } }, request => result(() => service.startTask(request)));
  const jobSchema = z.object({ jobId: z.string().uuid() }).strict();
  server.registerTool('get_task', { description: 'Read job progress or its concise evidence-linked result. A completed model response is not verified correctness.', inputSchema: jobSchema, annotations: { readOnlyHint: true, openWorldHint: false } }, ({ jobId }) => result(() => service.getTask(jobId)));
  server.registerTool('cancel_task', { description: 'Cancel a job and its owned inference/check processes. Repeated cancellation is safe.', inputSchema: jobSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, ({ jobId }) => result(() => service.cancelTask(jobId)));
  server.registerTool('record_feedback', { description: 'Record Codex verification outcome, correction count, evidence references and verification time. Does not qualify or promote a model.', inputSchema: feedbackSchema, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } }, feedback => result(() => service.recordFeedback(feedback)));
  return server;
}
