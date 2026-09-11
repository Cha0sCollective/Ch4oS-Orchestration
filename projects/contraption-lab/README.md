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
- decide which reusable specialists belong in production, experimental assurance, and review;
- prepare the first config-only deployment change;
- test how well fresh Codex sessions can reconstruct work from the repo/GitHub state;
- design the boundary between normal game QA and controlled numerical experiments;
- draft an experiment-specialist role and candidate experiment-file concepts without introducing new target infrastructure yet.

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
    <approved production/review/experiment specialists>
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

## Experimental assurance

Contraption Lab is likely to need stronger experimental methodology than an ordinary mod project because some experiments will make quantitative claims about complex in-game systems.

Examples may eventually include Create kinetics, high-voltage grid behavior, reactor systems, transfer rates, thermal behavior, or other modded systems where the game exposes meaningful numerical state.

For those claims, we want real experimental discipline:

- controlled starting conditions;
- trustworthy fixture construction;
- known inputs;
- explicit observations and units;
- sampling/tick semantics;
- tolerances and stability windows;
- valid/unavailable states;
- repeatability where the claim requires it;
- structured results tied to the relevant code/mod/configuration;
- cleanup strong enough that later runs remain trustworthy.

That rigor belongs **inside the experiment**.

Do not automatically apply the same burden to ordinary graphical proof. A connected-client video showing a contraption behaving correctly is game-development evidence, not something that needs cryptographic media attestation unless a future claim genuinely requires it.

### Start with one role, leave room for a lab team

The first Contraption Lab setup can use a single `experiment-specialist`/experimental-assurance lead.

If repeated work later shows that experiment design, fixture engineering, instrumentation, execution, and analysis need separate specialists, the orchestration system should let that role fan out into a team without changing the project's basic workflow.

We are not building that team now.

### Leave room for portable experiments

Mature experiments may eventually deserve versioned portable definitions so the scientific question is not trapped inside one Codex prompt or one Minecraft-version-specific implementation.

A future experiment artifact may describe:

```text
claim / purpose
compatible runtime + mod versions
fixture/setup
controlled inputs
procedure
observations + units + sampling
stability/tolerance rules
assertions / interpretation
cleanup
result metadata
```

The execution side can then use version-specific adapters/harnesses to run the same experiment where practical.

Do **not** design or deploy a DSL/schema during the pre-cutover work. Let the first real Create experiments tell us which parts are stable enough to deserve portability.

See `../../standards/EXPERIMENTAL_ASSURANCE.md` and `../../agents/experiment-specialist.md`.

## Review lane

Fresh review should inspect the exact candidate revision and bring in specialist views when relevant:

- architecture and authority boundaries;
- evidence/provenance and exact-revision proof;
- adversarial/failure-path testing and false-pass risk;
- experimental method and interpretation when the candidate makes a scientific/numerical claim;
- public contracts and compatibility;
- documentation accuracy and whether any new prose actually belongs in durable project memory.

Review agents stay read-only by default and do not fix their own findings.

Experimental assurance does not replace independent review. If the experiment specialist helped design or implement the experiment, the review side should independently challenge the method, measurements, and conclusion.

## Context discipline matters especially here

Contraption Lab has accumulated a lot of thoughtful design discussion. That context is useful, but we do not want future agents turning every explanation, future idea, or debugging theory into another document.

At cutover, derive the project overlay from accepted `main` documentation and current project state. Do not copy chat history or in-flight branch assumptions into the permanent config just because they were useful during development.

Accepted experiment definitions, methodology decisions, and results may become valuable internal project memory when future work genuinely depends on them. Preserve those intentionally; do not preserve every conversation that led there.

## Project invariants to re-derive at cutover

The future overlay should re-check the accepted project docs for things like:

- authoritative server ownership of mutations, timing, assertions, and pass/fail;
- media observing the same authoritative run rather than a reenactment where that still matters to the accepted claim;
- exact source/run/evidence linkage at the strength actually required by the claim;
- honest separation of numerical experiment proof, headless QA, graphical behavior, and connected-client acceptance;
- safe cleanup/restoration boundaries;
- client/server classloading isolation;
- version-aware adapter boundaries;
- clear separation between implementation, validation, acceptance, and merge/promotion authorization.

Do not blindly copy these from an in-flight branch. Re-derive them from the accepted baseline we actually deploy against.

## First real workflow test

Use a new post-cutover candidate, not an unchanged historical revision.

A rebased/retargeted recovery PR or another bounded post-cutover change is a good candidate because it naturally creates a new SHA that needs fresh validation and review.

For the first actual experimental-assurance pilot, a small Create observation/measurement task is preferable to a high-complexity reactor or power-grid experiment. We want to learn the workflow on a claim that is scientifically real but operationally bounded.
