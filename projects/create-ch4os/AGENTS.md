# Repository guidance

Create: Ch4oS is an independent modpack. `main` contains the owner-accepted P0 Packwiz baseline and subsequent accepted changes; preserve the current maintained state rather than restoring the historical P0 versions.

## Context

Start with this file and `docs/CURRENT_WORK.md` if it exists and you are continuing work. Verify repository, branch, revision, dirty files and linked work state. Consult the [product charter](docs/PRODUCT-CHARTER.md), [accepted P0 baseline](docs/P0-BASELINE.md), [dependency policy](docs/DEPENDENCY-INCLUSION-POLICY.md), [contributor guide](docs/CONTRIBUTING.md), [engineering principles](docs/ENGINEERING-PRINCIPLES.md) and [installation instructions](install/README.md) as relevant to the task. Read [research](assessment/2026-09-07/README.md) only as needed; do not restart obsolete handoff assignments.

## Working conventions

- Start focused work on a separate `codex/` branch from `main`; the repository split is merged. Keep maintained pack files under `pack/`; use ordinary Packwiz metadata and run `packwiz refresh` there after changes. Build using `distribution/Build-Candidate.ps1` with the exact Ch4oS-Installer revision in `distribution/installer.json`, preferably in a dedicated installer build worktree as documented in `distribution/README.md`. No repository-wide test runner exists; run checks appropriate to the change and report actual commands/results.
- Create: Ch4oS owns gameplay, dependency/runtime requirements, redistribution decisions and the installer pin. [Ch4oS-Installer](https://github.com/Cha0sCollective/Ch4oS-Installer) owns setup/removal/deployment code and installer tools. Keep implementation out of this repository's documentation-only `install/` directory. Installation commands referencing `install/*.ps1` run from the composed candidate ZIP, not this checkout. Coordinate interface changes with linked PRs; neither project silently changes the other's inputs.
- Reuse source/provider/dependency evidence. Preserve the known runtime and active mod baseline; get owner approval for consequential version, gameplay, or saved-state changes.
- Keep captures and production untouched. Test only in isolated staging with a disposable world copy. Keep worlds, credentials, private player data, generated instances, and third-party mod JARs out of commits.
- Preserve unrelated work. Review the diff before committing on the implementation branch. Merging, public publication, hosting/DNS changes, and production cutover need separate approval.

## Shared agent workflow

The coordinator uses the user-selected **Astra Low or Sol High** and can implement directly. It owns scope, integration, appropriate checks, affected documentation and delivery. Delegate only a bounded task that materially benefits from a separate agent; supply only relevant context, permissions, expected output and acceptance criteria. No mandatory explorer or worker chain. Set delegated model and effort deliberately; Ultra requires explicit owner approval.

Require one fresh, read-only independent **Sol High** review for substantive behavior changes, security-sensitive changes and changes to operating rules. Routine documentation and mechanical edits need focused coordinator checks. Give review the base, exact candidate (or base plus stable working diff), scope and relevant evidence. Production does not independently review its own work. Add specialists only for an identified risk. Review fixes as deltas and affected behavior, reusing valid unchanged coverage without claiming a new execution.

Verify actual permissions; a profile alone does not prove enforcement. Run validation needing writes separately in a disposable workspace. Review does not authorize merge, publication or unperformed live acceptance. Custom local and OpenRouter workers are outside normal routing; use them only when explicitly requested. Installed manual tools remain available.

Shared instructions come from Ch4oS-Orchestration through authorized manual updates. Preserve project-specific requirements; do not depend on a sibling checkout. Read other sources only when the task needs them.

## Completion

P0 is owner-accepted with recorded deferrals. Keep unperformed checks owner-deferred, not passed, and do not require a broad mod-by-mod walkthrough to continue work. Preserve permanent quest retirement and the documented distribution decisions. For new changes, report the actual revision, relevant checks, owner observations and unresolved impacts. For composed candidates, record both exact source revisions and the tested artifact. Prefer existing tools and focused observations over new verification infrastructure. A startup log or an old candidate's result is not proof of changed gameplay behavior. Keep missing validation separate from a source finding; review does not grant merge or release approval.

## Documentation

Human-facing documentation should address users or contributors directly and
describe the current system. Keep task instructions and approval boundaries here,
implementation discussion in PRs, and dated validation in the baseline or release
notes. Preserve useful research and known limits without repeating agent handoffs
or conversation history in README and usage guides.
