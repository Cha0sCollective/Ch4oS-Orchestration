# Project Overlays

This directory holds the project-specific orchestration details that do not belong in generic reusable agents.

A project overlay should answer the practical questions an orchestrator needs to work safely in that project:

- architecture/invariants unique to the project;
- accepted proof and validation boundaries;
- build/test commands;
- branch/promotion rules;
- owner gates;
- specialist roster;
- tool/dependency constraints;
- documentation boundaries;
- model-routing overrides when the generic defaults are not good enough;
- which reusable agents/config the project intends to consume.

## One project may have more than one repository

A project is not required to map one-to-one with a GitHub repo.

Supported shapes include:

```text
project
  -> one private development repo
```

or:

```text
project
  -> private development repo
  -> public publication repo
```

The overlay should identify each repository's role rather than assuming every repo is an equal development target.

For a private/public pair, record things such as:

- which repo is the development source of truth;
- what categories are allowed to cross into the public repo;
- where end-user documentation is authored;
- whether the public repo accepts community contributions;
- how any supported public-to-private reconciliation works;
- whether the public repo needs Codex config at all;
- publication owner gates and release validation.

See `../standards/PUBLICATION_BOUNDARY.md`.

## Desired overlay shape

A project may eventually contain:

```text
projects/<project>/
  README.md
  AGENTS.md              canonical project instruction source
  config.toml            canonical project Codex config source
  policy/                project-specific standards when needed
  manifest.toml          agent selection / repo topology / deployment metadata
```

That is a direction, not a frozen schema yet.

## Separation of concerns

Generic role behavior belongs in `agents/`.

Organization-wide working rules belong in `standards/`.

Project-specific invariants, repository topology, and deployment intent belong here.

The effective `AGENTS.md` and `.codex/` files still live in the repository they govern.

## Adoption states

Useful concepts include:

```text
DESIGNING
READY_TO_DEPLOY
DEPLOYED
DRIFTED
MIGRATION_BLOCKED
```

These are conceptual until we adopt a real manifest schema.

## No surprise deployment or publication

Editing an overlay here does not authorize changing a target repository.

Likewise, defining a public-repo topology does not authorize publishing anything. Deployment and publication remain explicit, reviewable operations.
