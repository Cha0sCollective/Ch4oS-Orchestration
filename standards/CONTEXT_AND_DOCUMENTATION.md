# Context and Documentation

## Context is not content

Chats are working memory. Repositories are project memory.

Something said in a conversation can be important for doing the work without being something we want to preserve forever.

Treat owner-provided background, examples, brainstorming, future ideas, preferences, and explanations as working context unless the task or an accepted project decision makes them durable.

Do not write conversation context into the repo just because it seems valuable.

## Three useful buckets

### Working context

Information that helps with the current task but is not an accepted part of the project.

Examples:

- "We might support Fabric later, so don't make that unnecessarily difficult."
- "I'm not sure whether we want this exposed publicly yet."
- a speculative future architecture;
- a debugging theory;
- an example the owner used to explain intent.

Use it to reason. Do not automatically create docs, TODOs, abstractions, issues, or roadmap commitments from it.

### Task requirements

Things the current work actually needs to satisfy.

Examples:

- keep the server authoritative;
- add the regression test;
- preserve an existing public contract;
- update a README section that the code change would otherwise make false.

Implement the requirement. Preserve it as documentation only when future work genuinely needs the durable record.

### Durable project knowledge

Information the team has intentionally decided should survive the conversation.

Examples:

- accepted architecture or ADRs;
- supported compatibility boundaries;
- contributor/build instructions;
- public behavior and contracts;
- accepted project workflow;
- limitations future contributors need to know;
- decisions that materially constrain future implementation.

This belongs in the appropriate durable artifact.

## Don't record the conversation

Avoid repo pollution such as:

- meeting-note style summaries of chats;
- "future ideas" docs created from casual discussion;
- comments explaining temporary agent reasoning;
- TODOs added only because an idea came up;
- speculative abstractions implemented to preserve optional future paths;
- status documents that duplicate GitHub and go stale immediately.

If a piece of working context seems important enough to preserve, mention it in the handoff and recommend where it might belong. Let the project decide whether it becomes durable.

## Keep existing docs true

The other failure mode is refusing to touch docs because the task did not literally say "update documentation."

If an implementation changes behavior that existing documentation describes, keeping that documentation truthful is part of finishing the work.

The rule is not "never write docs unless asked." The rule is **maintain the project; don't transcribe the conversation.**

## Documentation should earn its maintenance cost

Every durable document creates future work. Someone has to keep it correct.

Before adding a new doc, ask:

- Does future work need this information?
- Is there already a better home for it?
- Is this a stable decision or temporary context?
- Will the document still make sense without this chat?
- Who or what should keep it current?

Prefer improving an existing authoritative document over creating a new overlapping one.

## Documentation stewardship

A dedicated documentation steward can help decide what actually belongs in project memory.

Its job is not to generate more documentation. Its job is to keep durable docs useful, accurate, non-duplicative, and aligned with accepted project state.

The steward should be especially suspicious of prose that exists mainly because an agent wanted to preserve its own context.

See `../agents/documentation-steward.md`.

## Writing style

Write for capable developers, modders, maintainers, and future agents.

Use direct language. Say what is true, why it matters, and what someone needs to do with that information.

Strict rules do not need legal language to be strict.

Prefer:

> If the candidate SHA changes, the old review doesn't cover it anymore.

instead of:

> A revision mutation invalidates prior candidate-level review authorization.

Machine-consumed structures can stay machine-like. Human-facing project knowledge should read like a strong team explaining its own work.
