# Orchestration Rollout Roadmap

## Objective

Build a quality-first, locally operated Codex orchestration system for Cha0sCollective that scales across repositories without depending on long-lived chat context or separate GitHub identities for logical agents.

Rollout is deliberately incremental. The system should prove each layer before adding automation that makes mistakes easier to propagate.

## Phase 0 — Foundation standards

Status: **in progress**

Define and review:

- operating model;
- production/review separation;
- exact-revision review rule;
- work-packet contract;
- owner gates;
- quality-first model-routing policy;
- canonical versus effective configuration boundary;
- project-overlay convention.

No executable reusable agent catalog is required to complete this phase.

## Phase 1 — First reusable agents

Build agents one at a time and test them from Codex Desktop before expanding the catalog.

Recommended order:

1. `repo-explorer` — read-heavy repository mapping and source-linked summaries;
2. `architecture-reviewer` — read-only architectural reasoning;
3. `ci-investigator` — command/test/log analysis with exact revision awareness;
4. `evidence-reviewer` — read-only proof/provenance analysis;
5. `implementation-engineer` — bounded write-capable implementation specialist;
6. `adversarial-test-reviewer` — read-only false-pass and failure-path analysis;
7. `contract-reviewer` — contracts/docs/claims consistency;
8. `api-researcher` — version-specific API research where external/current reference material is required.

Each agent should have a documented role contract, model/effort rationale, permissions, escalation conditions, and a dry-run scenario.

## Phase 2 — Local orchestration pilot

Use this repository itself as the safe Codex Desktop project for exercising orchestration behavior.

Validate:

- orchestrator delegation to multiple specialists;
- subagent output quality and concision;
- model routing and escalation;
- read-only review behavior;
- fresh production/review parent contexts;
- separate worktrees where useful;
- failure and uncertainty reporting.

The pilot should include at least one intentionally ambiguous task that requires escalation rather than low-confidence completion.

## Phase 3 — Contraption Lab project overlay

While Contraption Lab finishes its existing in-flight process, derive but do not deploy:

- project-specific `AGENTS.md` source;
- selected reusable agent roster;
- build/test commands;
- architecture/evidence invariants;
- owner gates;
- model-routing overrides if needed;
- initial project manifest design.

Reconcile the overlay against the accepted mainline documentation at the actual cutover point.

## Phase 4 — First target deployment

After Contraption Lab reaches an accepted clean mainline baseline:

1. render/copy the approved effective configuration;
2. open a configuration-only target change;
3. validate Codex discovery and custom-agent loading from a clean local checkout/worktree;
4. independently review the configuration change;
5. merge only after owner approval if the target's governance requires it.

Do not combine the first orchestration deployment with unrelated product behavior.

## Phase 5 — First real production/review cycle

Run one bounded post-cutover work packet using:

```text
fresh production context
  -> specialist delegation
  -> exact candidate revision
  -> production handoff
  -> fresh review context
  -> read-only specialist review
  -> review decision / owner gate
```

Record what worked, what created unnecessary context or usage, where model routing was too weak/strong, and any review escape.

Quality is the acceptance criterion. Usage reduction is evaluated only after quality is established.

## Phase 6 — Distribution tooling

Only after the manual canonical/effective-copy process is stable, add tools such as:

- project manifest validation;
- deterministic rendering/copying;
- drift detection;
- dry-run deployment;
- project configuration diff reports;
- PowerShell support suitable for Windows/Codex Desktop workflows.

Initial tooling should be read-only/dry-run by default. Write/deployment modes must be explicit.

## Phase 7 — Organization reuse

Adopt the model in additional Cha0sCollective repositories where useful, such as Create-Ch4oS, World-Wide-Power-Grid, documentation/manual projects, or installer tooling.

Do not assume every repository needs the same agent roster or governance. Reuse generic agents where responsibilities match; keep project-specific proof boundaries in project overlays.

## Phase 8 — Measurement and refinement

Once real workflows exist, evaluate:

- defect/review escape rate;
- rework caused by underpowered model routing;
- unnecessary use of premium models;
- context growth in parent orchestrators;
- subagent usefulness versus noise;
- validation completeness;
- owner-gate quality;
- synchronization drift.

Optimize efficiency only where observed results show quality is preserved or improved.
