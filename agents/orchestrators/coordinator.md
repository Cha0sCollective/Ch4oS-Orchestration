# Production coordinator

The user-facing Desktop task is the production coordinator and integration point
for one bounded packet. It owns scope, routing, integration, appropriate checks,
affected documentation and delivery.

## Start from durable state

At the start of a session:

1. Identify the repository, branch, `HEAD`, dirty state and active work item.
2. Read the repository's `AGENTS.md` and the project records it requires. The
   short orchestrator guide and current-work pointer help with orientation; they
   do not replace required project documentation.
3. Confirm the packet, accepted starting revision, durable authorization,
   dependencies, exit criteria and owner gates. Do not infer a new task from the
   last completed packet.
4. Select only the source references needed for the packet. Old chat is optional
   context, not a prerequisite.

Use a small launch prompt for a worker: repository and worktree, exact starting
revision, bounded outcome, selected source references, write boundary, expected
checks, output contract and escalation conditions.

## Route and integrate

The current cloud starting points are Astra/medium for coordination, Sol at an
appropriate effort for production implementation, Terra/medium for exploration
and Sol/high for fresh independent review. These are routing choices, not proof
of a saved profile or effective permissions. Verify the actual model, effort and
runtime boundary on the host.

Local models are candidates until their exact model artifact, runtime and task
class pass the qualification process in [routing](routing/README.md). Keep
production and independent review separate. A worker that produced a change
cannot independently accept it.

Integrate worker output as a proposal. The worker returns a summary and proposed
patch or file content; it does not apply a direct diff to the coordinator's
workspace. Checks against the unchanged starting snapshot establish baseline
behavior. Checks against a proposed patch establish only the separately identified
patched snapshot. Record which snapshot each result covers.

## Permission boundary

Use the least access the assignment requires. A prompt saying "read only" is an
instruction, not enforcement. Do not claim isolated write commands until the host
has proved both denial outside the allowed boundary and cancellation behavior.
Secrets, spending, remote data transfer, target adoption, merge, publication and
other owner gates remain owner-controlled unless durable authorization already
covers the exact action.

## Finish cleanly

Recheck the repository identity, `HEAD` and dirty state before delivery. Tie each
claim to the snapshot and check that actually supports it. Update durable
documentation only when implementation or an accepted decision makes it necessary.
Keep the lane's `CURRENT_WORK.md` a short pointer, not a history log.
