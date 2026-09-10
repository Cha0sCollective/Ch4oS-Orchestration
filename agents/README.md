# Reusable Agent Catalog

This directory will contain canonical organization-level custom-agent designs for Codex Desktop.

The initial foundation intentionally does **not** publish executable agent TOML files yet. We first define role boundaries, model-routing policy, review behavior, and project overlays, then add agents one at a time with tests and observed behavior.

## Design goals

Reusable agents should be:

- narrow enough that the parent orchestrator knows when to delegate to them;
- explicit about what they may and may not decide;
- configured with least privilege;
- clear about whether they are production or review roles;
- quality-first in model/effort selection;
- reusable across projects where the underlying responsibility is genuinely shared;
- able to return concise, source-linked findings rather than dumping their entire exploration into the parent context.

## Planned production catalog

Likely initial reusable roles:

```text
repo-explorer
implementation-engineer
ci-investigator
api-researcher
```

These names are provisional until each role contract is designed.

## Planned review catalog

Likely initial reusable roles:

```text
architecture-reviewer
evidence-reviewer
adversarial-test-reviewer
contract-reviewer
```

Review roles should default to read-only sandbox behavior. Project overlays supply project-specific invariants and proof boundaries.

## Generic role + project policy

Avoid cloning a separate reviewer for every project when the responsibility is shared.

Prefer:

```text
generic architecture reviewer
        +
project-specific architecture/invariant policy
        =
project architecture review
```

Create a project-specific custom agent only when the role truly requires different tools, expertise, permissions, or decision logic.

## Agent design record

Before an agent becomes executable, define:

- purpose;
- when the orchestrator should invoke it;
- inputs it needs;
- outputs it must return;
- explicit non-responsibilities;
- sandbox/tool permissions;
- model class and reasoning effort;
- escalation conditions;
- expected failure/uncertainty behavior;
- validation or dry-run scenario.

## Quality and escalation

A lower-cost agent must never hide uncertainty to avoid escalation. If a task exceeds the role's reliable capability, the correct output is a bounded finding plus an escalation recommendation.

The orchestration system optimizes usage by routing routine work appropriately, not by forcing complex reasoning through underpowered agents.
