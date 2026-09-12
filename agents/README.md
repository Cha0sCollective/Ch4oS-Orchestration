# Reusable agents

The initial catalog has two narrow roles. The production parent owns implementation, integration and documentation.

| Role | Routing | Responsibility |
| --- | --- | --- |
| `repo-explorer` | `gpt-5.6-terra`, medium | Find actual refs and execution paths; return source-linked facts and uncertainty without edits. |
| `independent-reviewer` | `gpt-5.6-sol`, high | Review a named immutable candidate from fresh context; report actionable correctness and coverage findings without fixing it. |

Standalone TOML files here are canonical source for the target's `.codex/agents/` copies. The parent normally uses `gpt-6-astra` at medium effort and increases effort for difficult decisions. Capability and model availability must be checked on the actual host.

Use Desktop to coordinate retained CLI sessions on the tested Windows host. The CLI parent selects saved profiles by their native names; pasting role instructions into an ordinary agent does not verify activation. See [the retained-session workflow](../docs/RETAINED_CLI_WORKFLOW.md) and [the trial record](../docs/ADOPTION_TRIAL.md) for the tested host, evidence and outstanding readiness limits. Ephemeral sessions are outside the selected workflow.

Start independent review under a read-only parent. The live parent permission mode can override a custom agent's sandbox setting, so the profile alone does not prove enforcement. Run validation needing writes in a separate disposable workspace, then give the exact revision, command and result to the reviewer. Preserve candidate sources and report actual permission failures; do not widen the reviewer's access to accommodate a build.

Use [experiment-specialist.md](experiment-specialist.md) when a scientific method needs independent attention. It is a design reference, not an installed profile. [documentation-steward.md](documentation-steward.md) and [publication-steward.md](publication-steward.md) are deferred optional designs, not required delivery gates. The parent decides which documentation must change.

Delegate useful separable work, not a roster. Give each assignment scope, source refs, expected output and escalation conditions. Review must not inherit the production conversation or approve its own changes. See [the adoption sequence](../docs/ROADMAP.md).

Shared agents remain available according to task needs. Project overlays supply context and useful capabilities, not an agent allowlist.
