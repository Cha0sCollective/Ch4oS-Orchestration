# Ch4oS Orchestration

`Ch4oS-Orchestration` is the canonical design and configuration-management repository for Codex-assisted development across Cha0sCollective projects.

The repository separates reusable agent design from project-specific policy. Target projects continue to carry the effective `AGENTS.md` and `.codex/` files that Codex consumes for the exact revision being worked on; this repository is the source from which those files are designed, reviewed, and eventually synchronized.

## Core principles

1. **Quality and correctness come first.** Efficiency means avoiding waste, unnecessary duplication, and misuse of expensive models; it never means knowingly accepting a meaningful reduction in reasoning, implementation, validation, or review quality.
2. **Git is durable memory.** Agent chats are disposable; repository state, issues, pull requests, commits, evidence, and policy files are authoritative.
3. **Production and review are separate lanes.** A write-capable production session does not review its own candidate. Review starts from a fresh context at an exact revision.
4. **One bounded packet at a time.** A production assignment should have a clear objective, non-goals, validation boundary, and handoff condition.
5. **A review belongs to one exact revision.** Any code change invalidates the previous review decision for the candidate.
6. **Subagents are specialists, not durable identities.** Roles are encoded in configuration and policy rather than represented by extra GitHub users.
7. **Use the least expensive model that preserves quality.** Strong orchestrators decide, delegate, and synthesize; cheaper specialists perform high-volume work only where doing so does not materially reduce result quality. When adequacy is uncertain, escalate.
8. **Human authority is explicit.** Repository promotion, live acceptance, destructive operations, and other owner-only gates remain owner decisions unless explicitly delegated.
9. **Configuration is one-way.** Canonical designs live here; target-project effective copies are generated or synchronized deliberately. Target drift is detected rather than silently absorbed.

## Repository layout

```text
AGENTS.md                         instructions for Codex working on this repo
standards/
  OPERATING_MODEL.md              roles, lanes, context boundaries, owner gates
  MODEL_ROUTING.md                quality-first model/effort routing and escalation
  WORK_PACKET_PROTOCOL.md         bounded production assignment contract
  REVIEW_PROTOCOL.md              fresh-context independent review contract
  CONFIG_DISTRIBUTION.md          canonical-to-project configuration flow
agents/
  README.md                       reusable agent catalog conventions
projects/
  README.md                       project overlay conventions
  contraption-lab/
    README.md                     Contraption Lab adoption staging area
docs/
  ROADMAP.md                      incremental rollout plan
```

## Current phase

This repository is in **foundation design**. The initial goal is to make the operating rules reviewable before creating executable custom-agent TOML files or synchronization scripts.

No target repository is modified merely because policy exists here. Adoption is a separate, explicit project change.

## Intended local workflow

Cha0sCollective development is expected to run from Codex Desktop on Windows using local repository checkouts and, where useful, separate Git worktrees. This repository can itself be opened as a Codex project to maintain agent designs, routing policy, project overlays, and synchronization tooling.

See `standards/OPERATING_MODEL.md` first.
