# Working on Contraption Lab

Contraption Lab is a Minecraft test and validation tool. Start with this file and `docs/status/CURRENT_WORK.md` when continuing work; verify repository, branch, revision, dirty files and linked work state. Consult `docs/ROADMAP.md` for the active package and its exit criteria, rather than reading the whole roadmap at startup. Keep the current-work pointer concise and truthful as work changes.

## Development

Work in bounded changes on `codex/` branches. Preserve unrelated work. Continue through authorized roadmap packages once dependencies and exit criteria are met; seek input only for a new decision or a real blocker outside that authorization.

The coordinator uses the user-selected **Astra Low or Sol High** and can implement directly. It owns scope, integration, appropriate checks, affected documentation and delivery. Delegate only a bounded task that materially benefits from a separate agent; supply only relevant context, permissions, expected output and acceptance criteria. No mandatory explorer or worker chain. Set delegated model and effort deliberately; Ultra requires explicit owner approval.

Require one fresh, read-only independent **Sol High** review for substantive behavior changes, security-sensitive changes and changes to operating rules. Routine documentation and mechanical edits need focused coordinator checks. Give review the base, exact candidate (or base plus stable working diff), scope and relevant evidence. Production does not independently review its own work. Add specialists only for an identified risk. Review fixes as deltas and affected behavior, reusing valid unchanged coverage without claiming a new execution.

Verify actual permissions; a profile alone does not prove enforcement. Run validation needing writes separately in a disposable workspace. Review does not authorize merge, publication or unperformed live acceptance. Custom local and OpenRouter workers are outside normal routing; use them only when explicitly requested. Installed manual tools remain available.

Shared instructions come from Ch4oS-Orchestration through authorized manual updates. Preserve project-specific requirements; do not depend on a sibling checkout. Read other sources only when the task needs them.

## Tests and evidence

Use ordinary software engineering for application development: focused regression tests, meaningful failures and relevant integration checks. Establish that tests actually ran and retain their results. Do not require scientific measurement protocols, screenshot dossiers or cryptographic media provenance for every code or documentation change.

Inside experiments, be precise about actual observations, units, phase, validity, tolerances, expected values, controlled inputs, isolation and cleanup. Invalid or missing data cannot pass. Keep run/configuration identity and requested screenshot/video documentation. A screenshot supports a visible claim; it does not substitute for a numerical measurement.

Preserve legacy Scene readers and behavior while explicitly versioning new contracts. Separate scientific outcome, cleanup, observer and capture outcomes. Do not infer success from console text or a previous run's directory.

Current baseline is Minecraft 1.21.1, NeoForge 21.1.233 and Java 21. Use Gradle tasks and the current workflow definitions for executable validation commands; require real connected-client checks for graphical claims. Avoid rerunning unrelated checks after documentation-only edits.

## Retire instead of accumulating

Store retired work with plausible future organizational value in [Bits-of-Ch4oS](https://github.com/Cha0sCollective/Bits-of-Ch4oS); ordinary one-offs and obsolete scaffolding stay in Git history. Use a descriptive folder, brief source note and direct commit/push before active removal, respecting existing protections. No separate review or maintenance process. Preserve useful tests and keep archived workflows inert. Details: [canonical retirement policy](https://github.com/Cha0sCollective/Ch4oS-Orchestration/blob/main/standards/TOOL_RETIREMENT.md).

## Durable context

Update documents that actually change with accepted decisions or behavior. Do not turn conversational examples into product scope, policies or fixtures. Preserve useful history; keep historical restrictions out of current instructions. Cinematic direction is outside this application's scope, while existing Scene/action/capture primitives remain useful.

Reusable orchestration policy comes from Ch4oS-Orchestration; these committed files are effective local copies. Adopt changes through reviewed manual copying and record the source revision. Do not depend on sibling checkout paths or silently reverse-sync local changes.
