# Instructions for Codex

This repository defines the Codex operating model used across Cha0sCollective projects. Changes here affect how future agents reason, delegate, review, and modify other repositories, so treat configuration and policy changes as production code.

## Primary quality rule

Quality and correctness are the priority. Optimize usage and latency only where doing so does not meaningfully reduce reasoning, implementation, validation, or review quality. If it is unclear whether a cheaper model, lower reasoning effort, narrower validation, or faster path is adequate, prefer the higher-quality option and document the escalation rationale when it is material.

## Scope

- Work only on orchestration policy, reusable agent designs, project overlays, validation, and synchronization tooling.
- Do not modify target project repositories from this repository unless the owner explicitly requests a deployment or synchronization action.
- Do not treat a canonical design in this repository as already deployed to any project.
- Do not add secrets, tokens, credentials, local machine paths, or private runtime artifacts.

## Source-of-truth rules

- `agents/` contains reusable organization-level agent designs.
- `projects/<project>/` contains project-specific policy and deployment intent.
- Target repositories contain the effective files Codex actually consumes for that target revision.
- Synchronization is one-way from this repository to target repositories unless a deliberate reconciliation process is defined later.
- Never silently import target-project drift back into the canonical source.

## Design rules

- Prefer narrow, explicit agent responsibilities over broad personas.
- Reviewer agents should default to read-only behavior and must not implement fixes during review.
- Production and review responsibilities must remain separable even when they use the same GitHub identity.
- Durable state belongs in Git/GitHub artifacts, not in assumptions about prior chat memory.
- Any review or acceptance statement must identify the exact revision it applies to.
- Use least privilege for tools and sandbox permissions.
- Route models by demonstrated adequacy. Cost and speed are secondary constraints; do not downgrade a role merely to reduce usage when that introduces a meaningful quality risk.
- Do not hard-code a model identifier or Codex feature solely from memory when current product support is material; verify before introducing executable configuration.

## Change discipline

Keep changes bounded and reviewable. When changing an operating rule, update the relevant standard and any affected examples or project overlays in the same change. When changing reusable agent behavior, state the reason, expected effect, and possible regression risk.

Do not introduce automated deployment until the canonical/effective-copy contract and drift checks are defined and tested.

## Owner gates

The owner retains authority over:

- adoption of a new orchestration policy by a target project;
- promotion or merge rules for target repositories;
- destructive repository administration;
- secrets and credentials;
- live/manual acceptance steps that cannot be established by automated evidence;
- significant increases in agent permissions or autonomous write scope.

See `standards/OPERATING_MODEL.md`, `standards/MODEL_ROUTING.md`, `standards/REVIEW_PROTOCOL.md`, and `standards/CONFIG_DISTRIBUTION.md` before making structural changes.
