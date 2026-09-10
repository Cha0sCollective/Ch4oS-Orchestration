# Configuration Distribution

## Purpose

`Ch4oS-Orchestration` is the canonical design source for reusable agent definitions and project-specific Codex policy. Target repositories still need their effective configuration committed locally so Codex can consume it for the exact revision being worked on.

This standard defines the boundary between canonical configuration here and effective configuration in target projects.

## Canonical versus effective configuration

Canonical sources live here:

```text
Ch4oS-Orchestration/
  agents/
  standards/
  projects/<project>/
```

Effective target files live in the project they govern, for example:

```text
contraption-lab/
  AGENTS.md
  .codex/
    config.toml
    agents/
      ...
```

A target project does not automatically inherit configuration from this repository merely because both repositories are available on the same machine.

## One-way authority

The intended flow is:

```text
canonical design
      |
      v
project overlay
      |
      v
render / synchronize
      |
      v
effective target files
```

The orchestration repository is authoritative for shared designs and declared project overlays. Effective target copies are authoritative only for what Codex executes at that target revision.

Do not silently reverse-sync target edits into canonical definitions. If a useful target-local change is discovered, propose it deliberately in this repository, review it, then redeploy.

## Deployment as a reviewable change

Adopting or updating orchestration policy in a target project should normally be its own bounded pull request or commit set, separate from unrelated product behavior.

A deployment should identify:

- orchestration source revision;
- target base revision;
- project overlay used;
- files created/updated;
- intended agent/policy behavior change;
- validation performed;
- any target-local exception.

This preserves the ability to reconstruct which orchestration policy governed any target revision.

## Drift detection

Future tooling should compare canonical rendered output with the target project's effective files and report drift without modifying either side by default.

Expected states:

```text
IN SYNC
TARGET DRIFT
CANONICAL UPDATE AVAILABLE
PROJECT OVERLAY INVALID
```

A drift tool should be safe to run repeatedly and should not require credentials beyond ordinary repository access.

## No implicit filesystem coupling

Do not depend on sibling-repository relative paths at runtime. Avoid making target Codex behavior depend on the orchestration checkout being present at a particular Windows filesystem location.

The effective target configuration should remain usable from a clean clone of the target repository by itself.

## Symlinks and submodules

Do not use symlinks or Git submodules as the initial distribution mechanism for `.codex` configuration. They complicate Windows behavior, worktrees, clean-clone expectations, and exact-revision provenance.

Prefer deterministic rendered/copied files plus drift verification.

## Future project manifest

Once the reusable agent catalog is stable, each project may define a manifest describing which shared agents and policies it consumes. Example shape only:

```toml
project = "contraption-lab"

production_agents = [
  "repo-explorer",
  "implementation-engineer",
  "ci-investigator"
]

review_agents = [
  "architecture-reviewer",
  "evidence-reviewer",
  "adversarial-test-reviewer",
  "contract-reviewer"
]
```

The manifest format is not yet an executable contract. It will be designed and validated before synchronization tooling depends on it.

## Target-repository ownership

A target repository may need project-specific `AGENTS.md` rules that are intentionally not reusable. Those rules belong in its project overlay here and its generated/effective copy there, not in a generic agent definition.

## Adoption gate

No target project is considered migrated to this orchestration model until an explicit adoption change is reviewed and merged in that target project.
