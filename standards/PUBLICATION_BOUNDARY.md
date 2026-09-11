# Development and Publication Repositories

Some Cha0sCollective projects may use two repositories for one project:

- a **private development repository** where the real work happens;
- a **public publication repository** that carries only the parts we intentionally ship or expose, such as releases, end-user documentation, changelogs, installers, or selected source/artifacts.

This is a supported project shape, not an exception we should improvise later.

## Why keep the boundary

A healthy development workspace needs continuity.

Private project memory may legitimately include architecture notes, accepted internal decisions, detailed roadmaps, experiment records, debugging history, developer-facing documentation, issue discussions, and other context that helps future work pick up where the last session stopped.

We do **not** want every internal contribution written as though it will be published to end users tomorrow. That pressure encourages shallow documentation, lost reasoning, and agents that spend too much effort policing tone instead of doing engineering work.

The public repository has a different job: present a clean, intentional surface to users and the wider community.

## Private does not mean "write everything down"

The `Context is not content` rule still applies inside the private repo.

Useful continuity is worth preserving when it is genuinely durable project knowledge. Chat transcripts, speculative thoughts, temporary debugging theories, and agent scratch work still do not become project memory automatically.

The distinction is:

- **private durability can optimize for future development continuity**;
- **public durability must also pass a publication decision**.

## Default authority flow

Unless a project overlay says otherwise, prefer this shape:

```text
private development repo
  code / internal docs / accepted project state
              |
              | deliberate publication
              v
public publication repo
  releases / public docs / changelog / selected artifacts
```

Publication is one-way by default. Do not silently copy public-repo edits back into the private source of truth.

If a public repo later accepts community contributions, define an explicit reconciliation path instead of creating hidden bidirectional sync.

## Publication is a transformation, not a mirror

Do not assume the public repo should be a filtered clone of the private repo.

A publication step may:

- select only approved files;
- render or rewrite docs for end users;
- package binaries or release artifacts;
- generate a public changelog from accepted release information;
- omit internal architecture, planning, evidence, CI internals, private tooling, or developer-only instructions;
- remove references that only make sense inside the private workspace.

The public result should stand on its own.

## Nothing crosses the boundary by accident

Before publishing, check that the outgoing change contains only material intended for the public surface.

Never publish:

- secrets, credentials, private endpoints, local paths, or private runtime data;
- internal-only artifacts merely because they are adjacent to a release;
- conversation context or internal notes that were never approved as public documentation;
- private issue/PR references that would confuse or expose information to public readers;
- generated bundles whose contents have not been inspected or deterministically defined.

## Public documentation and internal documentation are different products

Internal docs help developers make the next good decision.

Public docs help users install, configure, understand, troubleshoot, or evaluate what we intentionally released.

They may share source material, but they do not have to share wording, structure, or even the same set of documents.

A project may choose to author public-facing docs in the private repo and publish them outward. That is the preferred default because documentation can then change alongside the implementation that makes it true.

If a project instead wants the public repo to be canonical for some public documentation, record that explicitly in the project overlay and define how those changes flow back into development.

## Orchestration config belongs with the workspace it governs

A private development repo should carry the effective Codex configuration needed for production/review work there.

A public publication repo should only carry Codex configuration if agents actually work in that repo and there is a clear reason for it. Do not expose internal agent prompts or project policy just because the public repo exists.

The project overlay should describe each repository's role and which orchestration configuration, if any, belongs there.

## Planned publication specialist

A future `publication-steward` or `release-publisher` agent may help prepare and verify public changes.

Its job should be to enforce the publication boundary, not to sanitize the private development workspace.

It should work from an explicit allowlist/manifest or clearly defined publication task wherever practical, produce a reviewable public diff, and stop rather than guess when it is unclear whether material is meant to be public.

Publication should remain reviewable and owner-gated until we have enough real experience to automate more of it safely.
