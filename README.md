# Ch4oS Orchestration

This repo is where Cha0sCollective designs and maintains the Codex setup we use across projects.

The goal is not to build a giant policy system. It is to give our agents the same kind of clear working environment we would want for a strong developer joining the team: enough context to do good work, clear boundaries where mistakes are expensive, and a clean way to hand work off without depending on a giant chat history.

## How we want this to feel

This is a software and modding workspace, not a policy manual.

Write like a capable developer talking to other capable developers. Be direct, practical, and specific. Use normal engineering and modding language when it helps. Explain why something matters instead of hiding the reasoning behind formal wording.

Our standards can be strict without sounding bureaucratic.

Prefer:

> Don't mix evidence from different SHAs. If the candidate changes, review the new revision again.

instead of:

> Validation artifacts must maintain revision-level provenance consistency.

That does not mean being casual about correctness. Exact revisions, evidence boundaries, compatibility rules, owner gates, and acceptance criteria are real constraints and should be stated clearly.

## Core principles

- **Quality and correctness come first.** Efficiency means avoiding waste. If saving time or usage would meaningfully reduce quality, choose quality.
- **Context is not content.** Something said in a chat to help an agent understand the work does not automatically belong in the repo.
- **Git is project memory. Chats are working memory.** Durable decisions, accepted architecture, code, tests, issues, PRs, and evidence survive. Conversation history does not need to.
- **Private continuity and public presentation are different concerns.** A private development repo may preserve useful internal project memory; a public repo is a deliberate publication surface, not a reason to sanitize the workspace continuously.
- **Production and review are separate lanes.** Consequential changes get one fresh independent review; routine edits get focused coordinator checks.
- **Build the feature and build the proof as different engineering problems.** Product code, game QA, and scientific experiment design may collaborate, but they do not silently collapse into one responsibility.
- **Be rigorous about the experiment, practical about the game.** Numerical/experimental claims may need controlled scientific methodology. Screenshots and video do not become forensic evidence unless the actual claim requires that level of proof.
- **Design seams before systems.** Leave room for an experiment specialist to become a team and for experiments to become portable artifacts later, but do not build that machinery before real work earns it.
- **Work in bounded packets.** A roadmap can be huge. A production assignment should not be.
- **A review belongs to one exact revision.** Review subsequent changes as deltas and reuse valid unchanged coverage.
- **Subagents are specialists, not personalities.** Give them a narrow job, the tools they need, and a clear way to escalate when the task outgrows them.
- **Model routing is quality-first.** Use cheaper models when they are good enough, not because cheaper is automatically better.
- **Call out expensive decisions.** If a change materially alters the development path, maintenance cost, validation burden, compatibility surface, operating burden, or implementation resources, say so before we quietly build around it.
- **Human authority stays explicit.** Some decisions still belong to the project owner.
- **Canonical config lives here; effective config lives with the project that uses it.** Distribution is deliberate, not magical.

## Where things belong

- [AGENTS.md](AGENTS.md): startup and working instructions for this repository.
- [standards/](standards/): working principles; consult only the standard relevant to the task.
- [projects/](projects/README.md): canonical instructions for Create-Ch4oS, Ch4oS-Installer and Contraption Lab.
- [agents/](agents/README.md): optional shared profiles and specialist designs.
- [docs/CURRENT_WORK.md](docs/CURRENT_WORK.md): short pointer for unfinished work.

Tool source, evaluations and raw run artifacts are maintained outside this workspace. Installed tools are not part of the normal agent workflow.

## Starting a session

> Read AGENTS.md and the current-work pointer if continuing existing work. Verify the repository and work state, then carry out the next authorized action. Read other sources only as needed.

Use the user-selected Astra Low or Sol High coordinator. Delegate only when useful; no mandatory agent chain. Effective project instruction changes require deliberate deployment, and merge/publication authority remains with the owner.
