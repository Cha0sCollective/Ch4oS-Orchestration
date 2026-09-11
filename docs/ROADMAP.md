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
5. `evidence-reviewer` — read-only proof/provenance analysis;
6. `implementation-engineer` — bounded write-capable implementation specialist;
7. `adversarial-test-reviewer` — read-only false-pass and failure-path analysis;
8. `contract-reviewer` — public contracts/compatibility/claims;
9. `api-researcher` — current/version-specific API research when external references matter;
10. `publication-steward` — prepare/check deliberate private-to-public publication flows when a project needs them.

Each agent gets a role design, model/effort rationale, permissions, escalation conditions, and at least one dry run before executable TOML is considered stable.

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
  -> exact candidate revision
  -> production handoff
  -> fresh review context
  -> read-only specialist review
  -> review decision / owner gate
```

Record what worked, what created unnecessary context, where routing was too weak or wasteful, and anything review missed.

Quality is the acceptance criterion. Usage optimization happens after we know the workflow is good.

## Phase 6 — Distribution tooling

Once manual canonical/effective-copy handling is boring and predictable, add tooling for:

- project manifest validation;
- deterministic rendering/copying;
- drift detection;
- dry-run deployment;
- project config diff reports;
- PowerShell workflows that fit Windows/Codex Desktop.

Read-only/dry-run should come first. Write/deploy modes should be explicit.

## Phase 7 — Publication pilot when a project needs one

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

## Phase 8 — Reuse across the organization

Adopt the model in other Cha0sCollective repositories where it helps.

Do not assume every repo needs the same agents, the same proof boundary, or even the same repo topology.

Reuse generic specialists where the job is genuinely shared. Keep project-specific constraints in the project overlay.

## Phase 9 — Measure and refine

Once real workflows exist, pay attention to:

- defects/review escapes;
- rework caused by weak model routing;
- unnecessary premium-model use;
- parent-context growth;
- specialist usefulness vs noise;
- validation completeness;
- documentation drift/pollution;
- publication mistakes or over-sanitization pressure;
- owner-gate quality;
- configuration drift.

Optimize efficiency only where the observed results show quality stays the same or gets better.
