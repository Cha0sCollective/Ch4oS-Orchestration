# Ch4oS Installer agent guidance

Read README.md, docs/ARCHITECTURE.md, docs/PACKAGE-CONTRACT.md,
docs/CONTRIBUTING.md and docs/STATUS.md before implementation. For server changes
also read install/SERVER.md. Reuse the revision-specific evidence; do not restart
the AOCA reconstruction or broad pack gameplay testing.

## Ownership

This repository owns installation/removal UI and workers, upstream tool pins,
candidate composition, Prism integration and Windows local/SFTP deployment.
Create: Ch4oS owns pack/, gameplay/configuration, runtime requirements, bundled dependency
rights and its exact installer revision selection. Do not alter the pack from
this project or add a duplicate mod list here. Contract changes need a coordinated
consumer PR; do not silently read the sibling checkout or a moving branch at run time.

Start focused work on a codex/ branch from main. The extraction PR is merged and
main contains the installer implementation and maintained documentation. Preserve
unrelated work. Review the diff before commits. Consumer builds require their
exact installer pin; use a separate build worktree instead of moving an active
development checkout. Runtime installation commands run from a composed candidate,
not a bare source checkout that lacks the consumer profile/pack.
Merging, public release publication, sending packages to people, hosting changes
and production operations need separate authorization.

## Shared development process

The user-facing Desktop production coordinator receives owner input and owns scope,
integration, appropriate checks, affected documentation and the final handoff. It
may assign implementation to bounded production workers and need not make every
change itself. Use the named `repo-explorer` for
bounded fact gathering and a fresh `independent-reviewer` for consequential
completed candidates. The normal starting points are Astra/medium for coordination,
Sol at suitable effort for implementation, Terra/medium for exploration and Sol/high
for review; route by task suitability and escalate when uncertainty warrants it.
Verify a production worker's actual model, effort and scoped write access; it is a
task-scoped assignment, not a saved named profile. Delegate other useful separable work by task needs. Shared agents are
available across projects; these starting roles are not an allowlist or a required
standing team. The shared experiment specialist remains a design reference until
an executable profile is available.

When Desktop cannot select saved native role names, coordinate retained CLI
parents using the [shared workflow](https://github.com/Cha0sCollective/Ch4oS-Orchestration/blob/main/docs/RETAINED_CLI_WORKFLOW.md).
Verify profile discovery, selected model/effort and effective permissions on the
host. Native name selection is required to claim profile activation; pasted
instructions do not establish it. Ephemeral sessions are outside the selected
workflow. Receive results, address bounded follow-ups to the returned child
identity and confirm completion or interruption before delivery.

Start independent review under a read-only parent with fresh context, exact base
and candidate revisions, bounded scope and durable evidence. Do not edit reviewed
source. Run validation requiring writes in a separate new disposable workspace
under scoped workspace-write permissions; supply the exact installer and pack
revisions, commands, results and limitations to review. A role's read-only TOML
default does not prove its effective permissions. Diagnose runtime, cache and
sandbox failures separately rather than expanding reviewer access.

Review follow-ups as deltas and inspect affected behavior. Reuse valid unchanged
coverage without calling it a new execution; an ancestor's success does not prove
the candidate was tested. Distinguish missing validation from a source defect.
Routine low-impact edits need no separate review lane. Review does not authorize
owner-only actions or establish unperformed live acceptance. When review is needed,
use a fresh separate reviewer; a production worker does not review or accept its own
changes.

Reusable orchestration policy comes from Ch4oS-Orchestration. Effective local
files are adopted through reviewed manual copying with the source revision
recorded. Do not depend on sibling checkout paths or silently reverse-sync local
configuration changes.

## Implementation and evidence

Use Packwiz for dependencies, official Prism/NeoForge installation, and WinSCP for
SFTP. Prefer established setup tooling when it reduces maintenance, but no new UI
framework is selected yet. Arbitrary mod selection and provider browsing are not
required: a documented customization route through Prism/Packwiz is sufficient.
Do not add generalized extension systems ahead of a concrete supported use case.

Tests operate only on NEW disposable directories outside source checkouts.
Never run uninstall fixtures against real user installations. Preserve accounts,
other Prism instances, worlds and operator files. Do not start an inherited world,
accept EULAs, control AMP or change host/network settings as incidental testing.
Keep binaries, generated payloads, logs containing private state and credentials
out of Git. Log results with both installer and pack commits. Run the focused
checks in docs/CONTRIBUTING.md appropriate to the change; old results do not prove
new behavior. Unperformed checks remain unperformed or owner-deferred, not passed.

## Documentation

Human-facing documentation should address users or contributors directly and
describe the current system. Keep task instructions and approval boundaries here,
implementation discussion in PRs, and dated validation in docs/STATUS.md. Preserve
useful evidence and known limits without repeating agent handoffs or conversation
history in README and usage guides.

## Fresh coordinator sessions and local workers

Read `docs/ORCHESTRATOR.md` and `docs/CURRENT_WORK.md` at startup, then verify
actual Git and linked work state. Refresh the short current-work pointer at
packet boundaries and before ending a session. Keep detailed evidence in its
authoritative records. Use the installed `ch4os-local-agents` MCP connector only
for task classes listed in `availableTaskClasses`, and inspect
`qualificationRequired` for the profile. Give bounded paths and
budgets, verify every answer and integrate proposals yourself. Local workers do
not replace the coordinator or independent review. The exact NVIDIA Nemotron 3
Ultra free route requires no qualification; use ordinary `work` mode. OpenRouter
still requires current endpoint terms suitable for the assignment, an approved
free endpoint, host data permission and per-task consent. Qualification status
does not authorize private data transmission. Existing project authority still applies.
