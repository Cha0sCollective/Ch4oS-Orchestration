# Fresh-session guide

Use this page to enter the orchestration workspace without prior chat history.
The detailed rules remain in `AGENTS.md` and the standards it requires.

1. Run `git branch --show-current`, `git rev-parse HEAD` and `git status --short`.
   Confirm the repository and worktree before interpreting status.
2. Read `AGENTS.md`, [CURRENT_WORK.md](CURRENT_WORK.md), the active work item and
   only the project or standard references relevant to the packet. Existing
   required-reading rules in `AGENTS.md` still apply.
3. Confirm the accepted base, durable authorization, scope, non-goals, validation,
   delivery target and owner gates. A previous packet is not a new assignment.
4. Use [the coordinator brief](../agents/orchestrators/coordinator.md) for routing
   and handoff. Verify actual model, effort and permissions on the host.

A worker launch prompt should stay small: exact repo/worktree and revision, bounded
outcome, selected references, permitted writes, checks, return format and stop
conditions. Ask the worker for a proposed patch or file content rather than a
direct diff applied to this workspace.

When the boundary changes, update the authoritative roadmap or standard first,
then refresh `CURRENT_WORK.md` as a short pointer. Do not copy chat history or
dated command transcripts into this guide.


The current coordinator owns scope, difficult reasoning, integration, verification
and final decisions. Preserve the existing Astra coordinator and independent
Sol review lane. Use the installed `ch4os-local-agents` MCP connector only when
its capabilities list the bounded task in `availableTaskClasses`. Check
`qualificationRequired` rather than treating `qualifiedTaskClasses` as the
eligibility field. Supply explicit
paths, snapshot/candidate identity, budgets and acceptance criteria. Verify every
worker result. Missing capability escalates to Codex. The exact NVIDIA Nemotron
3 Ultra free route does not require qualification; use ordinary `work` mode.
OpenRouter still requires current endpoint terms suitable for the assignment, an
approved free endpoint, host data permission and per-task consent. Qualification
status never overrides service terms or authorizes private data transmission.
The connector refers to a versioned host installation, not a sibling checkout.

Read `docs/CURRENT_WORK.md` at startup. Reconcile stale pointers against actual
Git and linked issue/PR state; surface competing assignments or missing authority.
At packet boundaries and before ending a session, replace obsolete pointer content
and keep it under roughly 500 words. Detailed history belongs in durable records.

Use this startup prompt in a fresh chat:

> Act as this project's production coordinator. Read AGENTS.md,
> docs/ORCHESTRATOR.md, and docs/CURRENT_WORK.md. Verify the current repository
> and linked work state, then continue the next authorized bounded packet.
> Use available local workers where appropriate and verify their results.

This guide does not claim activation of a saved subagent profile.
