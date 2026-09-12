# Create: Ch4oS overlay

[Create: Ch4oS](https://github.com/Cha0sCollective/Create-Ch4oS) is the independently maintained Minecraft modpack. It owns gameplay, Packwiz dependencies and configuration, runtime requirements, redistribution decisions and the exact installer revision selected for a release. Its product charter, dependency policy, baseline and current release inputs remain authoritative for those decisions.

[Ch4oS-Installer](../ch4os-installer/README.md) is a separate collaborating product with equal authority over its own setup, removal, deployment and tooling implementation. These are two development repositories connected by a package contract and the pack's installer pin. Coordinate interface changes with linked PRs; installer development does not automatically update the pack, and this overlay does not transfer either project's authority.

## Canonical source and adoption

This overlay starts from the pack's effective guidance at [`19a96a10289c3b939dc4aa3a065794019de96e27`](https://github.com/Cha0sCollective/Create-Ch4oS/tree/19a96a10289c3b939dc4aa3a065794019de96e27). It preserves the product boundaries and adds the shared production, exploration and independent-review process. Relative project links in [AGENTS.md](AGENTS.md) are written for the target repository root, where the file will be consumed.

The canonical files are prepared for a future reviewed adoption change. This overlay does not install configuration or change pack content, functionality, runtime, dependencies, installer selection or release status.

Use manual reviewed copying with this mapping:

| Canonical source | Effective Create: Ch4oS path |
| --- | --- |
| `projects/create-ch4os/AGENTS.md` | `AGENTS.md` |
| `agents/repo-explorer.toml` | `.codex/agents/repo-explorer.toml` |
| `agents/independent-reviewer.toml` | `.codex/agents/independent-reviewer.toml` |

Record the Orchestration source revision, target base revision, copied file hashes, intended process changes, target-local exceptions and actual validation in the adoption change. Reconcile newer target guidance explicitly before copying; do not overwrite unrelated work. No sibling checkout dependency, symlink, submodule or automatic synchronization layer is needed. Adoption is complete only after its target change is reviewed and merged under the existing owner gates.

## Working process

The production parent owns integration and affected documentation. Use the shared named explorer and a fresh independent reviewer, following the [retained CLI workflow](../../docs/RETAINED_CLI_WORKFLOW.md) and its [readiness evidence](../../docs/ADOPTION_TRIAL.md). Review uses a read-only parent; executable validation that needs writes runs separately in a disposable workspace. Native activation, host model/effort and effective permissions must be verified rather than inferred from profile text.

The two initial TOMLs are useful defaults, not a restriction on shared agents. Any shared capability that helps a bounded task remains available. The experiment specialist is still a [design reference](../../agents/experiment-specialist.md), not an installed executable role. Match experimental rigor to numerical claims and use ordinary focused checks for ordinary pack changes.

Product checks continue to follow the pack's contributor and distribution guides. Keep current runtime and content decisions, permanent quest retirement, dependency licensing rules, exact installer pins, isolated world testing, owner-deferred observations and release approval boundaries intact. Orchestration validation does not establish gameplay behavior or authorize production migration.
