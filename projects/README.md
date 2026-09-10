# Project Overlays

This directory contains project-specific orchestration policy, adoption state, and deployment intent.

A project overlay answers questions that should not be baked into generic reusable agents, such as:

- architectural invariants unique to the project;
- accepted proof and validation boundaries;
- branch/promotion rules;
- required specialist reviewers;
- owner-only gates;
- local build/test commands;
- project-specific constraints on tools, dependencies, or destructive behavior;
- which canonical reusable agents the project intends to consume.

## Target layout

Each project may eventually contain:

```text
projects/<project>/
  README.md
  AGENTS.md              canonical project instruction source
  config.toml            canonical project Codex configuration source
  policy/                project-specific detailed standards if needed
  manifest.toml          reusable-agent selection and deployment metadata
```

This is a desired structure, not yet a frozen schema.

## Separation of concerns

Generic role behavior belongs in `agents/`.

Organization-wide operating rules belong in `standards/`.

Project-specific invariants and deployment intent belong here.

The target project's committed `AGENTS.md` and `.codex/` files are effective copies created through an explicit adoption/synchronization change.

## Adoption states

A project overlay should clearly identify its migration state. Suggested concepts:

```text
DESIGNING
READY_TO_DEPLOY
DEPLOYED
DRIFTED
MIGRATION_BLOCKED
```

These labels are conceptual until a manifest schema is adopted.

## No surprise deployment

Editing a project overlay here does not authorize changing that target repository. Deployment is always a separate explicit operation and should normally produce a reviewable target-repository change.
