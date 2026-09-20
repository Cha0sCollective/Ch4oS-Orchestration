# Operating model

**Chat context should be disposable; project state should be reconstructable.**

The owner sets priorities, resolves genuine ambiguity and retains project-specific approval gates. The user-facing coordinator owns scope, implementation or integration, appropriate checks, affected documentation and delivery. It can do the work directly.

## Start small

Read the project's AGENTS.md and its short current-work pointer when continuing work. Verify the actual repository, branch, revision, dirty files and linked work state. Read further sources only as needed. A stale pointer is not authorization for new work.

Use the user-selected Astra Low or Sol High. Delegate only a bounded task that materially benefits from another agent; supply relevant sources, expected output, permissions and stop conditions, not the full chat. No standing team or mandatory explorer/worker chain. See [MODEL_ROUTING.md](MODEL_ROUTING.md).

## Production and review

Work on one bounded assignment and preserve unrelated work. An approved roadmap can authorize its next dependent package; do not request the same permission again or invent unrelated work.

Require one fresh, read-only independent Sol High review for substantive behavior changes, security-sensitive changes and operating-rule changes. Routine documentation and mechanical changes receive focused coordinator checks. Production and independent review stay separate. Review follow-ups inspect the delta and affected behavior; extra specialists need an identified risk. See [REVIEW_PROTOCOL.md](REVIEW_PROTOCOL.md).

Use separate worktrees when concurrent work or writable validation needs isolation, not merely because more agents exist. Experimental assurance is optional when a scientific claim needs specialist methodology; it is part of production and does not replace independent review. See [EXPERIMENTAL_ASSURANCE.md](EXPERIMENTAL_ASSURANCE.md).

## Durable state

Keep code, accepted decisions and evidence in their authoritative locations. Update affected documentation; do not transcribe the conversation or duplicate Git/CI history. At handoff, keep the current-work pointer short: current assignment, work references, unresolved findings, authority and next action. Use “no active packet” when appropriate.

See [CONTEXT_AND_DOCUMENTATION.md](CONTEXT_AND_DOCUMENTATION.md) and [WORK_PACKET_PROTOCOL.md](WORK_PACKET_PROTOCOL.md). Issues and PRs are useful handoff records when the project uses them, not prerequisites for every small edit.

## Owner gates

Check existing authorization before asking again. Retain explicit approval for merge/promotion where required, publication, live acceptance, destructive repository administration, secrets, billing, permission expansion and material changes to accepted proof or long-term maintenance obligations. Ultra requires explicit approval.

Explain the concrete decision needed at a gate. Do not fill the wait with unrelated work. Private development and public publication remain separate under [PUBLICATION_BOUNDARY.md](PUBLICATION_BOUNDARY.md).
