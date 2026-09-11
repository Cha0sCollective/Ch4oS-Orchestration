# Operating Model

This document describes how work moves between the project owner, production, experimental assurance, review, GitHub, and specialist agents.

The main idea is simple: **chat context should be disposable; project state should be reconstructable.**

## The roles

### Project owner

The owner sets priorities, resolves genuine ambiguity, handles owner-only gates, and decides when a project-level tradeoff is worth taking.

### Production orchestrator

Production owns one bounded work packet at a time.

It can delegate exploration, implementation, testing, research, or documentation work to specialists, but it still owns scope, integration, validation, and the final handoff.

Production is write-capable when the packet requires it. It should not quietly pull future roadmap work into the current assignment.

### Experimental assurance

Experimental assurance is an optional capability, not a permanent bureaucracy every project must invoke.

Use it when the project is making a claim that depends on controlled in-game measurement or scientific interpretation rather than ordinary software/game QA alone.

At first this may be one experiment specialist working alongside production. Later, if repeated experiments justify it, that specialist can coordinate a small team for experiment design, fixtures/environment, instrumentation, execution, or analysis.

The expansion path should be possible without requiring us to build all of those roles now.

Experimental assurance may design or implement experiment fixtures and measurement tooling when authorized. Because it participates in the work, it does not replace independent review.

See `EXPERIMENTAL_ASSURANCE.md`.

### Review orchestrator

Review starts fresh at an exact candidate revision.

Its job is to decide whether the candidate holds up, not to continue production with a different prompt. It can delegate specialist review, but it should not implement fixes. If the candidate needs changes, control goes back to production.

### Specialist subagents

Specialists are temporary workers, not long-lived identities. Give them a narrow question and let them return a useful result.

Typical jobs include repository exploration, architecture review, experimental design, evidence inspection, failure-path analysis, API research, documentation maintenance, or focused implementation.

A specialist's scratch work is not project memory by default.

## Two main lanes, optional specialist workstreams

The durable workflow still has two authority lanes:

```text
work packet
   |
   v
PRODUCTION
  fresh bounded chat/worktree
  -> understand the packet
  -> delegate where useful
  -> implement
  -> validate
  -> exact candidate revision
  -> handoff
   |
   v
REVIEW
  fresh chat/worktree at that candidate
  -> inspect real diff/evidence
  -> delegate specialist review
  -> synthesize a decision
   |
   +--> changes needed -> production makes a new candidate -> fresh review
   +--> human action needed -> owner gate
   +--> accepted -> next project state
```

Experimental assurance can branch off inside the production side when needed:

```text
               work packet
                   |
          +--------+--------+
          |                 |
     product work      experiment design /
                       measurement / analysis
          |                 |
          +--------+--------+
                   |
             one candidate
                   |
              fresh review
```

That keeps product engineering and experimental methodology separable without creating another permanent approval lane.

Production and review are lanes, not immortal conversations. Start fresh often enough that the repo, issue, PR, and exact revision remain the source of truth.

## What a fresh session should be able to recover

A new production or review session should be able to orient itself from durable state:

- repo instructions and accepted project docs;
- the active issue/work packet;
- linked PR or branch;
- exact base and candidate revisions;
- relevant previous findings;
- current CI, artifacts, and evidence;
- accepted experiment definitions/results when the packet depends on them;
- owner-gate status when one exists.

Prior chat memory can be convenient, but correctness must not depend on it.

## Context is not project memory

Background given in a chat does not automatically belong in the repo.

Use conversational context to make better decisions, but preserve only information that actually became durable project knowledge: accepted decisions, contracts, architecture, workflows, experiment definitions/results worth maintaining, or documentation that must stay true for future work.

See `CONTEXT_AND_DOCUMENTATION.md` for the full boundary.

## Exact-revision rule

A review applies to the revision it names. If the candidate changes, the old review still matters historically, but it does not approve the new candidate.

The same goes for validation. Do not build a synthetic all-green story out of checks that actually belong to different SHAs unless the project explicitly defines that as valid.

Experimental results should likewise retain enough run/version/configuration identity to support the claim being made. That does not mean every surrounding screenshot or video needs forensic provenance.

## Worktrees

Use separate worktrees when production and review overlap or when multiple bounded efforts need to coexist safely.

A review worktree should be clean and anchored to the candidate under review. Worktrees keep files separated; they do not replace fresh conversational context.

An experimental workstream may use its own worktree when it is implementing fixtures or instrumentation independently, but do not create extra worktrees merely because more agents exist.

## Owner gates

Stop and ask for the owner when the work reaches something the project has intentionally kept human-controlled.

Examples:

- live graphical or hardware acceptance;
- destructive repo administration;
- promotion to a protected mainline when explicit approval is required;
- secrets, credentials, billing, or permission expansion;
- changing the accepted proof boundary;
- a design decision that materially changes the project's path, maintenance cost, validation burden, compatibility surface, or implementation resources;
- committing to a new generalized experiment framework, portable schema, or long-lived lab subsystem whose cost is materially larger than the packet that exposed the need.

At an owner gate, explain the exact decision or procedure needed. Do not fill the waiting time by wandering into unrelated work.

## GitHub is the handoff layer

Issues, PRs, commits, reviews, CI, artifacts, accepted experiment/result files, and accepted docs are the shared message bus.

The logical role of an agent comes from the work object and handoff, not from inventing a separate GitHub user for every role.

See `WORK_PACKET_PROTOCOL.md`, `REVIEW_PROTOCOL.md`, and `EXPERIMENTAL_ASSURANCE.md` for the handoff/proof boundaries.
