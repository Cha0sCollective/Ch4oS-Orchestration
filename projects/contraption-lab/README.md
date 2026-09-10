# Contraption Lab orchestration staging

Contraption Lab is the first planned project to adopt the Cha0sCollective Codex orchestration model.

## Current adoption state

**MIGRATION BLOCKED BY EXISTING IN-FLIGHT DEVELOPMENT PROCESS**

The project currently has an established Phase 3 branch/PR/acceptance topology. This orchestration repository must not be used to change that process mid-stream merely to accelerate migration.

The intended cutover point is an accepted, reviewed mainline baseline after the existing Phase 3 process has completed its own promotion sequence.

## Pre-cutover rule

Before the cutover:

- design and test reusable agents here;
- design the Contraption Lab project overlay here;
- do not deploy `AGENTS.md`, `.codex/`, workflow-state changes, or new governance rules into the active Phase 3 PR stack solely for orchestration migration;
- do not reinterpret historical acceptance records using the new workflow retroactively.

Existing work continues under the process that created it.

## First deployment

After a clean accepted mainline baseline exists, the first Contraption Lab orchestration deployment should be a configuration/governance-only change, separate from product behavior.

That deployment is expected eventually to install:

```text
AGENTS.md
.codex/
  config.toml
  agents/
    <selected production and review agents>
```

Exact files will be produced only after the canonical agent catalog and project overlay are validated.

## Initial production lane goals

Contraption Lab is expected to use a quality-first production orchestrator with specialists for:

- repository exploration and impact mapping;
- difficult implementation;
- CI/test investigation;
- API/runtime research when version-specific mod behavior is involved.

One bounded work packet should normally be active per production lane.

## Initial review lane goals

A fresh review context should independently evaluate exact candidate revisions using at least these concerns when applicable:

- architecture and authority boundaries;
- evidence/provenance and exact-revision proof;
- adversarial/failure-path testing and false-pass risk;
- contracts, documentation, limitations, and acceptance claims.

Review agents should be read-only by default and should not implement fixes during review.

## Project-specific invariants to encode later

The future project overlay should derive its rules from Contraption Lab's accepted architecture and development documents, including principles such as:

- authoritative server ownership of mutations, timing, assertions, and pass/fail;
- media observing the same authoritative run rather than a reenactment;
- exact source/run/evidence linkage;
- honest separation of headless, synthetic, graphical, and connected proof;
- safe cleanup/restoration boundaries;
- client/server classloading isolation;
- version-aware adapter boundaries;
- explicit distinction between implementation, validation, acceptance, and merge/promotion authorization.

These must be re-derived from the accepted mainline documents at deployment time rather than copied blindly from an in-flight branch.

## Candidate first real workflow test

The first substantial candidate reviewed under the new orchestration model should be a new revision created after cutover, not an unchanged historical candidate. A rebased/retargeted recovery or other bounded post-cutover PR may be suitable because it naturally creates a fresh revision that requires fresh validation and review.
