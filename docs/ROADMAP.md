# Orchestration Rollout Roadmap

We are building this in layers because orchestration mistakes scale just as well as good orchestration does.

The target is a quality-first local Codex setup that can move across Cha0sCollective projects without depending on long-lived chats or fake GitHub identities.

## Phase 0 — Get the foundation right

Status: **in progress**

Agree on:

- production vs review;
- fresh-context and exact-revision rules;
- bounded work packets;
- owner gates;
- quality-first model routing;
- context-is-not-content;
- documentation stewardship;
- private-development vs public-publication boundaries;
- experimental assurance and claim-matched rigor;
- an expansion path from one experiment specialist to a team without prebuilding the team;
- a future path for portable experiment definitions without freezing a schema too early;
- canonical vs effective config;
- project overlays;
- how we talk to each other: direct, technical, natural, and not bureaucratic.

No executable agent TOML is required to finish this phase.

## Phase 1 — Build the first reusable agents

Add specialists one at a time and test them from Codex Desktop before expanding the catalog.

Suggested order:

1. `repo-explorer` — read-heavy mapping with source-linked findings;
2. `documentation-steward` — keep durable docs accurate without preserving chat history;
3. `architecture-reviewer` — read-only architecture reasoning;
4. `ci-investigator` — test/log analysis tied to the exact revision;
5. `experiment-specialist` — design/evaluate controlled in-game experiments without overbuilding the lab;
6. `evidence-reviewer` — read-only proof/provenance analysis;
7. `implementation-engineer` — bounded write-capable implementation specialist;
8. `adversarial-test-reviewer` — read-only false-pass and failure-path analysis;
9. `contract-reviewer` — public contracts/compatibility/claims;
10. `api-researcher` — current/version-specific API research when external references matter;
11. `publication-steward` — prepare/check deliberate private-to-public publication flows when a project needs them.

Each agent gets a role design, model/effort rationale, permissions, escalation conditions, and at least one dry run before executable TOML is considered stable.

The `experiment-specialist` starts as one role on purpose. Split it only when real experiment work repeatedly shows stable expertise boundaries.

## Phase 2 — Use this repo as the local pilot

Open Ch4oS-Orchestration in Codex Desktop and exercise the system here first.

Test:

- Astra-class orchestration across several specialists;
- useful subagent outputs without context dumps;
- model routing and escalation;
- documentation context boundaries;
- read-only review behavior;
- fresh production/review parent chats;
- worktrees where they actually help;
- uncertainty reporting;
- at least one ambiguous task where the correct behavior is escalation, not confident completion.

For the experiment capability, use design-only dry runs first. We should be able to ask for a valid experimental plan without the specialist inventing a whole framework just because it can.

## Phase 3 — Prepare Contraption Lab while its current Phase 3 finishes

Contraption Lab's existing process stays in charge until the current promotion reaches a clean accepted `main`.

PR #16 is close enough to completion that we should use the remaining time to prepare here, not change the active target workflow.

Prepare:

- candidate project `AGENTS.md` source;
- selected reusable agent roster;
- build/test commands;
- architecture/evidence invariants;
- owner gates;
- documentation boundaries;
- model-routing overrides if needed;
- experimental-assurance boundaries for ordinary game QA vs controlled numerical experiments;
- candidate experiment-specialist instructions for the first Create measurement work;
- a conceptual portable-experiment shape, without committing to a DSL/schema;
- first project-manifest design;
- repo topology/publication rules if Contraption Lab or related projects later split private development from public release surfaces.

At actual cutover, reconcile all of this against accepted `main`, not against chat memory or an old in-flight branch.

## Phase 4 — First target deployment

Once Contraption Lab has the clean baseline:

1. render/copy the approved effective config;
2. open a configuration-only target change;
3. verify Codex discovers the instructions and agents from a clean local checkout/worktree;
4. review that config independently;
5. merge only after the project's normal owner/governance gate.

Do not mix the first orchestration deployment with product behavior.

## Phase 5 — First real production/review cycle

Run one bounded post-cutover packet:

```text
fresh production context
  -> useful specialist delegation
  -> experimental-assurance workstream if the claim needs it
  -> exact candidate revision
  -> production handoff
  -> fresh review context
  -> read-only specialist review
  -> review decision / owner gate
```

Record what worked, what created unnecessary context, where routing was too weak or wasteful, and anything review missed.

If the packet contains an experiment, also record whether the method was appropriately rigorous, whether we overbuilt infrastructure, and which parts of the experiment could usefully become portable/reusable later.

Quality is the acceptance criterion. Usage optimization happens after we know the workflow is good.

## Phase 6 — Experiment portability only when earned

Do not build this phase just because it appears on the roadmap.

When multiple real experiments show a stable repeated shape, evaluate whether versioned portable experiment definitions would reduce duplication or improve reproducibility.

If they do, design the smallest format that captures the stable concepts, such as:

- claim/purpose;
- compatible runtime/mod versions;
- setup/fixture;
- controlled inputs;
- observations, units, and sampling;
- tolerances/stability;
- assertions/interpretation;
- cleanup;
- result metadata.

Keep the experiment definition separate from version-specific execution adapters where practical.

Only split the experiment specialist into a team if repeated work shows that doing so improves quality or manages genuinely different expertise—not because a team diagram looks mature.

## Phase 7 — Distribution tooling

Once manual canonical/effective-copy handling is boring and predictable, add tooling for:

- project manifest validation;
- deterministic rendering/copying;
- drift detection;
- dry-run deployment;
- project config diff reports;
- PowerShell workflows that fit Windows/Codex Desktop.

Read-only/dry-run should come first. Write/deploy modes should be explicit.

## Phase 8 — Publication pilot when a project needs one

Do not force every project into a private/public split.

When a real project benefits from it, pilot the two-repo model deliberately:

```text
private development repo
       |
       | reviewed publication task
       v
public release/docs repo
```

Define the allowed public surface, authoring source for end-user docs, release artifacts, community-contribution flow (if any), and owner gate before automating publication.

Test `publication-steward` against realistic leakage/ambiguity cases before giving it write access.

The goal is to keep private development continuity useful while making publication intentional and reviewable.

## Phase 9 — Reuse across the organization

Adopt the model in other Cha0sCollective repositories where it helps.

Do not assume every repo needs the same agents, the same proof boundary, the same experiment capability, or even the same repo topology.

Reuse generic specialists where the job is genuinely shared. Keep project-specific constraints in the project overlay.

## Phase 10 — Measure and refine

Once real workflows exist, pay attention to:

- defects/review escapes;
- rework caused by weak model routing;
- unnecessary premium-model use;
- parent-context growth;
- specialist usefulness vs noise;
- validation completeness;
- experiment validity and reproducibility;
- verification infrastructure growth vs actual need;
- documentation drift/pollution;
- publication mistakes or over-sanitization pressure;
- owner-gate quality;
- configuration drift.

Optimize efficiency only where the observed results show quality stays the same or gets better.
