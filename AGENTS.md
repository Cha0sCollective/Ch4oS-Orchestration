# Instructions for Codex

Start with this file and `docs/CURRENT_WORK.md` when continuing existing work. Verify the actual repository, branch, revision and dirty files before acting. Read other documents only when relevant to the task. Keep the current-work pointer short and replace obsolete content at handoff.

You are working on the system that shapes how other Cha0sCollective agents work. Treat changes here with the same care you would give production code, but don't turn the repo into a rulebook for its own sake.

## Work like a strong developer

Write and reason naturally. Be direct, specific, and practical. Use the language a good modding/software team would actually use. Strict rules should be strict because they are clear and important, not because they sound formal.

If something is risky, say why. If a simpler path is better, explain it. If you are unsure, say what is uncertain and what would resolve it.

Do not manufacture personality or camaraderie. The goal is good collaboration, not roleplay.

## Quality comes first

Quality and correctness are the priority. Optimize cost, usage, and latency only where doing so does not meaningfully reduce reasoning, implementation, validation, or review quality.

If it is unclear whether a cheaper model, lower reasoning effort, narrower validation, or faster path is good enough, choose the stronger option and explain the escalation when it matters.

## Context is not content

Treat conversation context as working context unless the task explicitly calls for preserving it.

Background, examples, brainstorming, future ideas, and explanations from the owner are there to help you understand the work. Do not turn them into repo docs, comments, TODOs, roadmaps, abstractions, or policy just because they seem useful.

If something from the conversation looks genuinely worth preserving, call it out in the handoff and explain why. Do not silently promote it into project memory.

This does not mean ignoring documentation that legitimately changes with the code. Keep existing docs truthful when implementation or accepted project decisions make them stale.

See `standards/CONTEXT_AND_DOCUMENTATION.md`.

## Private workspaces do not need to read like public repos

Some projects may have a private development repo and a separate public publication repo.

Do not sanitize the private workspace continuously just because a public surface may exist later. Useful internal continuity is allowed and often valuable when it is genuinely durable project knowledge.

Public release material crosses that boundary deliberately. Do not publish internal notes, developer-only context, private artifacts, or orchestration config unless the project explicitly intends to expose them.

See `standards/PUBLICATION_BOUNDARY.md`.

## Treat experimental claims differently from ordinary game QA

Some projects run real in-game experiments with numerical state worth measuring carefully.

Be rigorous where the claim is experimental: controlled setup, units, sampling, tolerances, repeatability, cleanup, and result interpretation may all matter.

Do not spread that burden to every artifact around the experiment. A screenshot or video proving a player-visible behavior does not need cryptographic provenance just because the underlying numerical experiment is rigorous.

Match the evidence to the claim.

Leave room for experimental assurance to expand from one specialist into a team, and for repeated experiments to become portable files later. Do not build the team, DSL, runner, or schema before real experiments demonstrate the need.

See `standards/EXPERIMENTAL_ASSURANCE.md`.

## Stay inside this repo's job

This repo holds our working principles, concise agent guidance and canonical project instructions. Tool development, evaluations and routine run artifacts belong outside this workspace.

Do not modify target repositories from here unless the owner explicitly asks for a deployment or synchronization action. A design in this repo is not automatically deployed anywhere.

Do not add secrets, tokens, credentials, machine-specific paths, or private runtime artifacts.

## Source of truth

- `agents/` is the reusable agent catalog.
- `projects/<project>/` holds project-specific orchestration policy and deployment intent.
- Target repos hold the effective `AGENTS.md` and `.codex/` files Codex actually consumes for that revision.
- Distribution flows from this repo to target repos unless we deliberately define a reconciliation process later.
- Do not silently absorb target-project drift back into the canonical source.

## Agent design

Prefer narrow jobs over broad personas.

Review agents should be read-only by default and should not fix what they review. Production and review must remain separable even when both use the same GitHub identity.

Experimental-assurance agents may be write-capable when a packet explicitly authorizes fixture, measurement, or experiment implementation, but they should not become the final independent reviewers of their own work.

Use least privilege. Route models by demonstrated adequacy. Verify current Codex/model support before writing executable configuration when product support matters.

## Call out changes with a long tail

If a proposed change materially alters the development path, maintenance complexity, compatibility surface, validation burden, operational burden, or implementation resources, say so clearly before treating it as a routine implementation detail.

Explain the likely downstream tradeoffs and follow-on obligations. Significant path-changing decisions belong in explicit review, not buried inside an otherwise ordinary change.

That includes verification infrastructure. A new generalized harness, portable experiment format, cross-version adapter, or experiment team structure may be the right move, but it should be justified by real recurring needs rather than added preemptively.

## Keep changes bounded

When changing an operating rule, update the affected standard, examples, and project overlays in the same change where practical.

When changing reusable agent behavior, explain what problem the change solves, what behavior should improve, and what could regress.

Use reviewed manual copying for initial adoption. Automatic distribution and drift tooling are deferred until repeated work justifies them.

The coordinator can implement directly, using the user-selected Astra Low or Sol High. Delegate only bounded work that materially benefits from a separate agent, with only the context it needs. No mandatory explorer or worker chain. Require one fresh, read-only Sol High review for substantive behavior changes, security-sensitive changes or changes to operating rules; routine documentation and mechanical edits need focused coordinator checks. Review follow-ups cover the delta and its effects. Add specialists only for an identified risk. Ultra requires explicit owner approval. Do not route ordinary work through custom local or OpenRouter workers; they remain available for manual use when requested.

Archive retired work with plausible future organizational value under `standards/TOOL_RETIREMENT.md`.

## Owner gates

Existing explicit authorization remains valid across bounded packages in an approved roadmap. Check whether an action is already covered before asking again; the list below does not revoke prior approval.

The owner keeps authority over:

- adopting new orchestration policy in a target project;
- target-repo promotion and merge rules;
- destructive repository administration;
- secrets and credentials;
- live/manual acceptance that automation cannot establish;
- major permission or autonomous-write expansion;
- changes that materially redefine a project's accepted proof or governance boundary;
- publishing new categories of internal material to a public repo;
- committing a project to a materially heavier experimental/verification architecture, portable experiment format, or long-lived infrastructure layer when that changes the project's maintenance/resources significantly.

Consult the relevant standard when a task touches its subject; do not load every standard at startup. Model and review details are in `standards/MODEL_ROUTING.md` and `standards/REVIEW_PROTOCOL.md`.
