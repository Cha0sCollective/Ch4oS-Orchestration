# Contraption Lab orchestration staging

Contraption Lab is the first project we expect to move onto this orchestration model.

It is also exactly the kind of repo where changing process halfway through a proof-heavy milestone can cause more harm than good, so the cutover stays deliberate.

## Current state

**Do not migrate the active Phase 3 stack mid-flight.**

Contraption Lab already has a branch/PR/acceptance process that produced the current work. Let that process finish the Phase 3 promotion cleanly.

PR #16 is now close to completion, so we can prepare the orchestration overlay here without pushing it into the target repo yet.

The clean cutover point is an accepted, reviewed `main` baseline after the existing Phase 3 promotion sequence finishes.

## What we can prepare now

Before cutover, we can safely:

- design and dry-run reusable agents here;
- build the Contraption Lab project overlay here;
- derive candidate `AGENTS.md` guidance from accepted project docs;
- identify build/test commands and project-specific owner gates;
- decide which reusable specialists belong in production and review;
- prepare the first config-only deployment change;
- test how well fresh Codex sessions can reconstruct work from the repo/GitHub state.

We should **not** deploy new `AGENTS.md`, `.codex/`, workflow labels, or governance rules into the active Phase 3 PR stack just to get the migration started sooner.

Do not reinterpret old acceptance records under the new workflow retroactively.

## First deployment after cutover

The first target change should be configuration/governance only, separate from product behavior.

Expected shape:

```text
AGENTS.md
.codex/
  config.toml
  agents/
    <approved production/review specialists>
```

The exact files should come from this repo only after the reusable agent designs and the Contraption Lab overlay are reviewed.

## Production lane

Contraption Lab will probably benefit from specialists for:

- repository exploration and impact mapping;
- difficult implementation;
- CI/test investigation;
- API/runtime research for version-specific Minecraft/Create behavior;
- documentation stewardship when behavior or accepted project knowledge actually changes.

One bounded packet should normally be active per production lane.

## Review lane

Fresh review should inspect the exact candidate revision and bring in specialist views when relevant:

- architecture and authority boundaries;
- evidence/provenance and exact-revision proof;
- adversarial/failure-path testing and false-pass risk;
- public contracts and compatibility;
- documentation accuracy and whether any new prose actually belongs in durable project memory.

Review agents stay read-only by default and do not fix their own findings.

## Context discipline matters especially here

Contraption Lab has accumulated a lot of thoughtful design discussion. That context is useful, but we do not want future agents turning every explanation, future idea, or debugging theory into another document.

At cutover, derive the project overlay from accepted `main` documentation and current project state. Do not copy chat history or in-flight branch assumptions into the permanent config just because they were useful during development.

## Project invariants to re-derive at cutover

The future overlay should re-check the accepted project docs for things like:

- authoritative server ownership of mutations, timing, assertions, and pass/fail;
- media observing the same authoritative run rather than a reenactment;
- exact source/run/evidence linkage;
- honest separation of headless, synthetic, graphical, and connected proof;
- safe cleanup/restoration boundaries;
- client/server classloading isolation;
- version-aware adapter boundaries;
- clear separation between implementation, validation, acceptance, and merge/promotion authorization.

Do not blindly copy these from an in-flight branch. Re-derive them from the accepted baseline we actually deploy against.

## First real workflow test

Use a new post-cutover candidate, not an unchanged historical revision.

A rebased/retargeted recovery PR or another bounded post-cutover change is a good candidate because it naturally creates a new SHA that needs fresh validation and review.
