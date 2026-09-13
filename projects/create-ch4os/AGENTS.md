# Repository guidance

Create: Ch4oS is an independent modpack. `main` contains the owner-accepted P0 Packwiz baseline and subsequent accepted changes; preserve the current maintained state rather than restoring the historical P0 versions.

## Context

Read the [product charter](docs/PRODUCT-CHARTER.md), [accepted P0 baseline](docs/P0-BASELINE.md), [dependency policy](docs/DEPENDENCY-INCLUSION-POLICY.md), and [contributor guide](docs/CONTRIBUTING.md) before implementation. Consult [engineering principles](docs/ENGINEERING-PRINCIPLES.md) for tradeoffs and [installation instructions](install/README.md) for supported commands. Read [research](assessment/2026-09-07/README.md) only as needed; do not restart obsolete handoff assignments.

## Working conventions

- Start focused work on a separate `codex/` branch from `main`; the repository split is merged. Keep maintained pack files under `pack/`; use ordinary Packwiz metadata and run `packwiz refresh` there after changes. Build using `distribution/Build-Candidate.ps1` with the exact Ch4oS-Installer revision in `distribution/installer.json`, preferably in a dedicated installer build worktree as documented in `distribution/README.md`. No repository-wide test runner exists; run checks appropriate to the change and report actual commands/results.
- Create: Ch4oS owns gameplay, dependency/runtime requirements, redistribution decisions and the installer pin. [Ch4oS-Installer](https://github.com/Cha0sCollective/Ch4oS-Installer) owns setup/removal/deployment code and installer tools. Keep implementation out of this repository's documentation-only `install/` directory. Installation commands referencing `install/*.ps1` run from the composed candidate ZIP, not this checkout. Coordinate interface changes with linked PRs; neither project silently changes the other's inputs.
- Reuse source/provider/dependency evidence. Preserve the known runtime and active mod baseline; get owner approval for consequential version, gameplay, or saved-state changes.
- Keep captures and production untouched. Test only in isolated staging with a disposable world copy. Keep worlds, credentials, private player data, generated instances, and third-party mod JARs out of commits.
- Preserve unrelated work. Review the diff before committing on the implementation branch. Merging, public publication, hosting/DNS changes, and production cutover need separate approval.

## Shared agent workflow

The user-facing Desktop production coordinator receives owner input and owns the bounded scope, integration, suitable validation, affected documentation and delivery. It may assign implementation to bounded production workers and need not make every change itself. Use the saved `repo-explorer` for useful fact gathering and a fresh `independent-reviewer` for consequential completed candidates. The coordinator normally uses Astra/medium, a production worker uses Sol or another model suited to the task, the explorer uses Terra/medium and the reviewer uses Sol/high; escalate when reasoning warrants it. Verify a production worker's actual host model, effort and scoped write access without claiming it is a saved named profile. Shared named agents remain available according to task needs; this overlay provides project context, not an agent allowlist. The shared experiment specialist is currently a design, not an installed profile. Numerical experiments may warrant specialist methodology; ordinary pack checks do not require an experiment framework.

When Desktop cannot select saved native roles, coordinate retained CLI sessions that can. Verify profile discovery, native role selection, host model/effort and effective permissions. Pasting a role prompt does not establish named activation; report unavailable capabilities. Receive child results, direct bounded follow-ups to the returned identity, and finish or explicitly stop active work. Ephemeral sessions are outside the selected workflow. Details are in the [retained CLI workflow](https://github.com/Cha0sCollective/Ch4oS-Orchestration/blob/main/docs/RETAINED_CLI_WORKFLOW.md).

Start independent review under a read-only parent with fresh context, supplying the repository, exact base and candidate revisions, bounded scope, applicable project records and validation evidence. Do not edit reviewed source. Run validation requiring writes in a separate disposable workspace under scoped workspace-write permissions and return its exact revisions, commands and results. A profile's read-only default does not prove the effective sandbox; diagnose tooling and cache failures separately without expanding reviewer access. Review follow-ups as deltas and affected behavior, reusing valid unchanged coverage without claiming a new execution. Routine low-impact edits need no separate review lane. When review is needed, use a fresh separate reviewer; a production worker does not review or accept its own changes.

Reusable orchestration policy comes from Ch4oS-Orchestration. Update effective local instructions and profiles through reviewed manual copying with the source revision recorded. A clean clone must stand on its own; do not depend on a sibling checkout or silently reverse-sync local changes into the shared catalog.

## Completion

P0 is owner-accepted with recorded deferrals. Keep unperformed checks owner-deferred, not passed, and do not require a broad mod-by-mod walkthrough to continue work. Preserve permanent quest retirement and the documented distribution decisions. For new changes, report the actual revision, relevant checks, owner observations and unresolved impacts. For composed candidates, record both exact source revisions and the tested artifact. Prefer existing tools and focused observations over new verification infrastructure. A startup log or an old candidate's result is not proof of changed gameplay behavior. Keep missing validation separate from a source finding; review does not grant merge or release approval.

## Documentation

Human-facing documentation should address users or contributors directly and
describe the current system. Keep task instructions and approval boundaries here,
implementation discussion in PRs, and dated validation in the baseline or release
notes. Preserve useful research and known limits without repeating agent handoffs
or conversation history in README and usage guides.

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
