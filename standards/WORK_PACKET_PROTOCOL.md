# Work Packet Protocol

## Purpose

A work packet is the unit of production execution. It should be small enough that one production orchestrator can hold its proof boundary and dependencies in working context without carrying an entire roadmap.

A roadmap issue may describe many packets. It is not automatically an executable production assignment.

## Required packet fields

Every production packet should establish:

- objective;
- explicit non-goals;
- starting branch or base revision;
- dependencies and prerequisites;
- files/subsystems likely in scope when known;
- validation required before handoff;
- owner gates or stop conditions;
- definition of done.

Prefer one issue to one bounded PR or one clearly defined acceptance result.

## Active-work rule

Within a project, only one packet should normally be active for a single production lane. Additional queued issues may exist, but completing one packet does not authorize the production orchestrator to begin the next unless the workflow explicitly advances it.

Parallel production lanes may be introduced later for genuinely independent work, but each lane must have its own worktree, issue, branch boundary, and integration owner.

## Production lifecycle

```text
queued
  -> active
  -> implementation / validation
  -> candidate revision
  -> production handoff
  -> ready for independent review
```

If an owner-only action is required before production can finish, the packet moves to an owner gate with precise instructions rather than expanding into unrelated work.

## Production handoff

Use a compact durable handoff. Do not paste large CI logs or re-explain the whole project when GitHub contains the authoritative records.

Recommended format:

```text
[production-agent] HANDOFF

Issue: #<issue>
PR: #<pr or none>
Base: <exact revision>
Head: <exact candidate revision>

Implemented:
- ...

Validation:
- <check or workflow reference>
- <check or workflow reference>

Known limitations / unproven boundaries:
- ...

Reviewer decision requested:
- ...
```

The handoff must distinguish facts already established from claims awaiting review.

## Stop conditions

Production stops and asks for direction when:

- required human/live acceptance is reached;
- the candidate would require crossing an explicit non-goal;
- a prerequisite is invalid or missing;
- a necessary permission, secret, or destructive action requires owner authority;
- the implementation exposes a material architecture decision not covered by the packet;
- evidence for the claimed revision cannot be established reliably.

A blocked packet is not permission to pull the next roadmap item into scope.

## Roadmaps

Roadmaps describe dependency chains and destination state. Production reads them for context but executes only the active packet.

A good roadmap answers "what comes later?" A good work packet answers "what may I change now, what must I prove, and where must I stop?"
