# Configuration Distribution

`Ch4oS-Orchestration` is the canonical design source for reusable agent definitions and project-specific Codex policy.

The repositories where agents actually work still need their effective configuration committed locally so Codex can consume the right instructions for that exact revision.

## Canonical versus effective config

Canonical sources live here:

```text
Ch4oS-Orchestration/
  agents/
  standards/
  projects/<project>/
```

Effective files live in the repository they govern, for example:

```text
private-development-repo/
  AGENTS.md
  .codex/
    config.toml
    agents/
      ...
```

A repo does not inherit config just because Ch4oS-Orchestration is checked out somewhere else on the same machine.

## One project may have multiple target repos

A project overlay may describe more than one repository.

For example:

```text
project
  private development repo  -> full production/review config
  public publication repo   -> no Codex config, or a smaller publication-specific config
```

Do not blindly deploy the same agent bundle to both.

A public publication repo should only receive orchestration config when agents actually work there and the exposed instructions are appropriate for a public surface.

See `PUBLICATION_BOUNDARY.md`.

## One-way authority for orchestration config

The intended config flow is:

```text
canonical design
      |
      v
project overlay
      |
      v
reviewed manual copy
      |
      v
effective files in the repo they govern
```

Do not silently reverse-sync target edits into canonical definitions. If a target-local improvement is worth keeping, propose it deliberately here, review it, then redistribute it.

## Deployment should be reviewable

Adopting or updating orchestration policy in a target repo should normally be its own bounded change, separate from unrelated product behavior.

A deployment should make it possible to reconstruct:

- orchestration source revision;
- target repo and target base revision;
- project overlay used;
- files created/updated;
- intended behavior change;
- validation performed;
- target-local exceptions.

## Drift detection

Future tooling should compare canonical rendered output with target effective files and report drift without modifying anything by default.

Useful states:

```text
IN SYNC
TARGET DRIFT
CANONICAL UPDATE AVAILABLE
PROJECT OVERLAY INVALID
```

A drift tool should be safe to run repeatedly.

## No implicit filesystem coupling

Do not make a target repo depend on Ch4oS-Orchestration being checked out at a particular Windows path.

A clean clone of the target should have the effective config it needs to operate.

## No symlink/submodule dependency for initial distribution

Avoid symlinks or Git submodules as the initial `.codex` distribution mechanism. They add friction around Windows, worktrees, clean clones, and exact-revision reasoning.

Initially use reviewed manual copies and an ordinary file comparison. A deployment framework, project manifest and automated drift verification are deferred, not prerequisites for adoption.

## Future project manifest

Once the catalog stabilizes, a project manifest may describe both agent selection and repository topology.

Conceptual example only:

```toml
project = "example-project"

development_repo = "Cha0sCollective/example-private"
public_repo = "Cha0sCollective/example-public"

production_agents = [
  "repo-explorer",
  "documentation-steward",
  "implementation-engineer",
  "ci-investigator"
]

review_agents = [
  "architecture-reviewer",
  "evidence-reviewer",
  "adversarial-test-reviewer",
  "contract-reviewer"
]

publication_agent = "publication-steward"
```

This is not an executable schema yet.

## Target-specific rules still belong to the target

A project may need `AGENTS.md` rules that are not reusable. Those belong in its overlay here and its effective copy in the repo they govern, not in a generic agent definition.

## Adoption gate

No target repo is considered migrated until an explicit adoption change is reviewed and merged there.

No public repo is considered a publication target until its publication boundary is explicitly defined and approved.
