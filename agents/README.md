# Reusable agents

The initial catalog has two narrow roles. The production parent owns implementation, integration and documentation.

| Role | Routing | Responsibility |
| --- | --- | --- |
| `repo-explorer` | `gpt-5.6-terra`, medium | Find actual refs and execution paths; return source-linked facts and uncertainty without edits. |
| `independent-reviewer` | `gpt-5.6-sol`, high | Review a named immutable candidate from fresh context; report actionable correctness and coverage findings without fixing it. |

Standalone TOML files here are canonical source for the target's `.codex/agents/` copies. The parent normally uses `gpt-6-astra` at medium effort and increases effort for difficult decisions. Capability and model availability must be checked on the actual host.

Current activation status: prepared profiles; named selection was unavailable through the tested CLI session's exposed tools. Use explicit model/effort routing with bounded role instructions until selection is verified. See [the trial record](../docs/ADOPTION_TRIAL.md).

Read-only defaults express intent. The live parent permission mode can override a custom agent's sandbox setting. Reviewers must preserve candidate sources; if the client cannot enforce read-only access, record that limitation and use an isolated candidate snapshot and explicit no-edit instructions. Disposable validation output is allowed only outside candidate sources and within runtime permissions.

Use [experiment-specialist.md](experiment-specialist.md) when a scientific method needs independent attention. It is a design reference, not an installed profile. [documentation-steward.md](documentation-steward.md) and [publication-steward.md](publication-steward.md) are deferred optional designs, not required delivery gates. The parent decides which documentation must change.

Delegate useful separable work, not a roster. Give each assignment scope, source refs, expected output and escalation conditions. Review must not inherit the production conversation or approve its own changes. See [the adoption sequence](../docs/ROADMAP.md).
