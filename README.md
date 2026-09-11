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
- **Production and review are separate lanes.** A write-capable production session does not approve its own candidate. Review starts fresh at an exact revision.
- **Build the feature and build the proof as different engineering problems.** Product code, game QA, and scientific experiment design may collaborate, but they do not silently collapse into one responsibility.
- **Be rigorous about the experiment, practical about the game.** Numerical/experimental claims may need controlled scientific methodology. Screenshots and video do not become forensic evidence unless the actual claim requires that level of proof.
- **Design seams before systems.** Leave room for an experiment specialist to become a team and for experiments to become portable artifacts later, but do not build that machinery before real work earns it.
- **Work in bounded packets.** A roadmap can be huge. A production assignment should not be.
- **A review belongs to one exact revision.** Change the candidate and the old review becomes history.
- **Subagents are specialists, not personalities.** Give them a narrow job, the tools they need, and a clear way to escalate when the task outgrows them.
- **Model routing is quality-first.** Use cheaper models when they are good enough, not because cheaper is automatically better.
- **Call out expensive decisions.** If a change materially alters the development path, maintenance cost, validation burden, compatibility surface, operating burden, or implementation resources, say so before we quietly build around it.
- **Human authority stays explicit.** Some decisions still belong to the project owner.
- **Canonical config lives here; effective config lives with the project that uses it.** Distribution is deliberate, not magical.

## Repository layout

```text
AGENTS.md                         how Codex should work in this repo
standards/
  OPERATING_MODEL.md              production, review, handoffs, owner gates
  MODEL_ROUTING.md                how we choose models and reasoning effort
  WORK_PACKET_PROTOCOL.md         how production work stays bounded
  REVIEW_PROTOCOL.md              how independent review works
  CONTEXT_AND_DOCUMENTATION.md    what belongs in project memory and what does not
  EXPERIMENTAL_ASSURANCE.md       scientific experiment rigor without over-proving the game
  PUBLICATION_BOUNDARY.md         private development vs public publication repos
  CONFIG_DISTRIBUTION.md          how canonical config reaches target projects
agents/
  README.md                       reusable agent catalog conventions
  documentation-steward.md        dedicated documentation role design
  experiment-specialist.md        expandable experimental-assurance role design
  publication-steward.md          private-to-public publication role design
projects/
  README.md                       project overlay conventions
  contraption-lab/
    README.md                     Contraption Lab adoption staging area
docs/
  ROADMAP.md                      rollout plan
```

## Current phase

We are still designing the foundation. That is intentional.

We want the working style, authority boundaries, context rules, experimental-assurance model, publication boundary, and review model to feel right before we turn them into executable custom-agent TOML or deployment tooling.

Nothing in this repo is considered deployed to another project until that project gets an explicit config change.

## Local workflow

The expected working environment is Codex Desktop on Windows with local Git checkouts and worktrees where they make sense. This repo should eventually manage its own agent catalog and project overlays using the same orchestration system it defines.

Start with `standards/OPERATING_MODEL.md`, `standards/CONTEXT_AND_DOCUMENTATION.md`, `standards/EXPERIMENTAL_ASSURANCE.md`, and `standards/PUBLICATION_BOUNDARY.md`.
