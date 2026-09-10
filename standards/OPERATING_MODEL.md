# Operating Model

## Purpose

This standard defines how Codex work is divided between production, review, GitHub, and the project owner. The goal is to keep agent context disposable while making project state reconstructable from repositories and durable work objects.

## Roles

### Project owner

The owner sets priorities, resolves policy ambiguity, authorizes owner-gated actions, and decides whether a candidate is promoted when the project requires explicit approval.

### Production orchestrator

The production orchestrator owns one bounded work packet. It may delegate exploration, implementation, testing, or research to subagents, but it remains responsible for scope, integration, validation, and the final production handoff.

Production is write-capable only when the active packet requires it.

### Review orchestrator

The review orchestrator starts from a fresh context and an exact candidate revision. It may delegate specialized review to read-only subagents and synthesizes one review decision.

Review does not implement fixes. If changes are required, control returns to production.

### Specialist subagents

Subagents are temporary workers. They perform narrowly scoped tasks such as repository exploration, architecture analysis, evidence inspection, adversarial test analysis, API research, or mechanical implementation.

A subagent's output is evidence for its parent orchestrator; it is not durable project state until recorded in Git/GitHub.

## Two-lane model

```text
work packet
    |
    v
PRODUCTION lane
  fresh bounded chat/worktree
  -> implementation
  -> validation
  -> exact candidate revision
  -> production handoff
    |
    v
REVIEW lane
  fresh chat/worktree at candidate revision
  -> specialist reviews
  -> synthesized decision
    |
    +--> changes required -> new production candidate -> fresh review
    |
    +--> human action required -> owner gate
    |
    +--> accepted -> next project state
```

Production and review are logical lanes, not permanent conversations. Long-lived chats are discouraged. Start a fresh parent context when a new bounded production packet begins and when a new candidate revision requires independent review.

## Context boundary

A new session should be able to reconstruct its assignment from durable state:

- repository instructions and project documentation;
- the active issue/work packet;
- linked pull request or branch;
- exact base and candidate revisions;
- prior review findings when relevant;
- current CI, artifacts, and evidence for the candidate.

Prior chat memory may help convenience but must not be required for correctness.

## Exact-revision rule

A review decision applies only to the exact revision it names. If candidate code changes, the previous review remains historical evidence but does not approve the new revision.

Validation evidence must likewise identify the revision it proves. Do not combine successful checks from different revisions into a synthetic all-green candidate unless the project explicitly defines such aggregation as valid.

## Worktrees

Separate local Git worktrees are preferred when production and review may overlap or when multiple bounded efforts must coexist. A review worktree should be clean and anchored to the candidate being reviewed.

Worktree separation is a filesystem and Git-safety mechanism; it does not replace fresh conversational context.

## Owner gates

An owner gate is required when a task reaches an action reserved for the owner or depends on evidence only the owner/operator can produce. Examples include:

- live graphical or hardware acceptance;
- irreversible or destructive repository administration;
- promotion to a protected mainline when explicit approval is required;
- secrets, credentials, billing, or permission expansion;
- changing the project's accepted proof boundary.

At an owner gate, agents stop unrelated implementation and provide the exact decision or procedure required.

## GitHub as coordination layer

GitHub issues, pull requests, commits, reviews, CI results, artifacts, and durable documentation form the shared message bus. Agent identity is carried by the work object and handoff format, not by creating one GitHub account per logical agent.

See `WORK_PACKET_PROTOCOL.md` and `REVIEW_PROTOCOL.md` for the concrete handoff contracts.
