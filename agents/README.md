# Reusable agents

The initial catalog has two narrow saved roles. The user-facing Desktop production
coordinator receives owner input and remains accountable for scope, integration,
appropriate checks, affected documentation and delivery. It can assign bounded
implementation to task-scoped production workers and does not need to make every
change itself.

| Role | Routing | Responsibility |
| --- | --- | --- |
| `repo-explorer` | `gpt-5.6-terra`, medium | Find actual refs and execution paths; return source-linked facts and uncertainty without edits. |
| `independent-reviewer` | `gpt-5.6-sol`, high | Review a named immutable candidate from fresh context; report actionable correctness and coverage findings without fixing it. |

Standalone TOML files here are canonical source for the target's `.codex/agents/`
copies. The coordinator normally uses `gpt-6-astra` at medium effort and increases
effort for difficult integration decisions. A bounded implementation worker should
normally use Sol or another model suited to the work, with its actual host model,
effort and scoped write access verified. This worker is a task assignment, not a
third saved profile; do not claim named activation for it.

Use Desktop to coordinate retained CLI sessions on the tested Windows host. The CLI parent selects saved profiles by their native names; pasting role instructions into an ordinary agent does not verify activation. See [the retained-session workflow](../docs/RETAINED_CLI_WORKFLOW.md) and [the trial record](../docs/ADOPTION_TRIAL.md) for the tested host, evidence and outstanding readiness limits. Ephemeral sessions are outside the selected workflow.

Start independent review under a read-only parent. The live parent permission mode can override a custom agent's sandbox setting, so the profile alone does not prove enforcement. Run validation needing writes in a separate disposable workspace, then give the exact revision, command and result to the reviewer. Preserve candidate sources and report actual permission failures; do not widen the reviewer's access to accommodate a build.

Use [experiment-specialist.md](experiment-specialist.md) when a scientific method needs independent attention. It is a design reference, not an installed profile. [documentation-steward.md](documentation-steward.md) and [publication-steward.md](publication-steward.md) are deferred optional designs, not required delivery gates. The coordinator decides which documentation must change.

Delegate useful separable work, not a roster. Give each assignment scope, source
refs, expected output, write boundary and escalation conditions. The coordinator
integrates worker output and remains accountable for delivery. Independent review
must use fresh context and a separate worker; production workers do not review or
approve their own changes. See [the adoption sequence](../docs/ROADMAP.md).

Shared agents remain available according to task needs. Project overlays supply context and useful capabilities, not an agent allowlist.
