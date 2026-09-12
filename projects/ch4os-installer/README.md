# Ch4oS-Installer overlay

Target: [Cha0sCollective/Ch4oS-Installer](https://github.com/Cha0sCollective/Ch4oS-Installer).
This overlay was prepared against clean `main` at
`829fc1620cf78e4238fc559eadee2abbae2768d9`. It preserves that revision's project
instructions and adds the shared production, exploration and independent-review
process. It changes no installer behavior, dependencies or supported contract.

## Collaborating projects

Ch4oS-Installer and [Create: Ch4oS](../create-ch4os/README.md) are separate,
collaborating products. The installer owns setup/removal UI and workers, installer
tool pins, candidate composition, Prism integration and Windows local/SFTP
deployment. The pack owns its mods, gameplay/configuration, runtime requirements,
bundled dependency rights and exact installer revision selection.

The package contract remains in the installer repository. Cross-contract changes
use linked consumer and installer PRs with both source revisions in integration
evidence. Installer `main` is not a substitute for the pack's selected commit.
Neither overlay authorizes one project to change the other's inputs or makes
either checkout depend on a sibling filesystem path.

## Planned effective configuration

Target adoption remains a separate reviewed change. Prepare these files by
manual copying from one recorded Orchestration revision:

| Canonical source | Effective installer path |
| --- | --- |
| `projects/ch4os-installer/AGENTS.md` | `AGENTS.md` |
| `agents/repo-explorer.toml` | `.codex/agents/repo-explorer.toml` |
| `agents/independent-reviewer.toml` | `.codex/agents/independent-reviewer.toml` |

Compare the copies, record source revision, target base, copied hashes and any
reviewed exceptions, and check discovery/model/permissions on the target host.
Reconcile target changes deliberately before adoption; do not overwrite local
work or silently reverse-sync it. No symlinks, submodules, automatic distribution
framework or broader permissions are part of this overlay. See
[configuration distribution](../../standards/CONFIG_DISTRIBUTION.md).

The production parent owns scope, integration, validation and affected
documentation. Use the named `repo-explorer` and a fresh `independent-reviewer`
where useful. All shared agents remain available according to the assignment;
this initial copy set is not a repository allowlist. The shared experiment
specialist is currently a design reference, not an executable profile or a
required installer role.

Use [retained CLI coordination](../../docs/RETAINED_CLI_WORKFLOW.md) when Desktop
cannot select native saved roles directly. Start independent review under a
read-only parent and run writable validation separately in a disposable workspace.
Return exact installer/consumer revision evidence to review. The
[readiness trial](../../docs/ADOPTION_TRIAL.md) establishes the selected host
workflow, not adoption in this target or proof of installer behavior.

## Validation and authorization

Preserve the installer contributor guide's focused Windows PowerShell 5.1,
C# compilation, package, UI, removal and local/SFTP checks. Documentation-only
changes need relevant link, anchor, command and diff checks. Product changes use
the checks appropriate to their behavior; no broad pack gameplay test or new
verification framework is imposed by adoption.

Tests use new disposable directories and preserve real installations, accounts,
worlds and operator state. Existing owner-only merge, publication, delivery,
hosting and production-operation boundaries remain in the effective instructions.
Infrastructure readiness does not grant any of those approvals.
