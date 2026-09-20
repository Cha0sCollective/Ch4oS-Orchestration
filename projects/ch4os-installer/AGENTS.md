# Ch4oS Installer agent guidance

Start with this file and `docs/CURRENT_WORK.md` if it exists and you are continuing work. Verify repository, branch, revision, dirty files and linked work state. Read README.md, docs/ARCHITECTURE.md, docs/PACKAGE-CONTRACT.md, docs/CONTRIBUTING.md and docs/STATUS.md as relevant to the task; consult install/SERVER.md for server changes. Reuse revision-specific evidence; do not restart the AOCA reconstruction or broad pack gameplay testing.

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

The coordinator uses the user-selected **Astra Low or Sol High** and can implement directly. It owns scope, integration, appropriate checks, affected documentation and delivery. Delegate only a bounded task that materially benefits from a separate agent; supply only relevant context, permissions, expected output and acceptance criteria. No mandatory explorer or worker chain. Set delegated model and effort deliberately; Ultra requires explicit owner approval.

Require one fresh, read-only independent **Sol High** review for substantive behavior changes, security-sensitive changes and changes to operating rules. Routine documentation and mechanical edits need focused coordinator checks. Give review the base, exact candidate (or base plus stable working diff), scope and relevant evidence. Production does not independently review its own work. Add specialists only for an identified risk. Review fixes as deltas and affected behavior, reusing valid unchanged coverage without claiming a new execution.

Verify actual permissions; a profile alone does not prove enforcement. Run validation needing writes separately in a disposable workspace. Review does not authorize merge, publication or unperformed live acceptance. Custom local and OpenRouter workers are outside normal routing; use them only when explicitly requested. Installed manual tools remain available.

Shared instructions come from Ch4oS-Orchestration through authorized manual updates. Preserve project-specific requirements; do not depend on a sibling checkout. Read other sources only when the task needs them.

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
