# Reusable Agent Catalog

This directory is where we design the reusable specialists that Codex Desktop can load across Cha0sCollective projects.

We are intentionally not dumping a pile of executable TOML into the repo yet. Each agent should earn its place by solving a real recurring problem and behaving well in dry runs.

## What makes a good reusable agent

A useful specialist should have:

- a narrow job the orchestrator can recognize;
- clear non-responsibilities;
- the least privilege it actually needs;
- a sensible default model/effort level;
- an escalation path when the task outgrows it;
- concise, source-linked output;
- behavior that survives across projects where the job is genuinely the same.

Avoid broad personas like "senior engineer" when what we actually need is "trace this execution path and look for authority-boundary damage."

## Planned production-side roles

```text
repo-explorer
documentation-steward
implementation-engineer
ci-investigator
api-researcher
```

The documentation steward appears early on purpose. Good documentation hygiene is part of keeping context small and preventing conversation history from leaking into project memory.

## Planned experimental-assurance capability

Start with one expandable role:

```text
experiment-specialist
```

This role is for controlled in-game experiments whose claims depend on measurement, methodology, units, sampling, tolerances, or repeatability—not ordinary feature QA.

If real work later proves that one role is too broad, the capability may split into specialists such as:

```text
experiment-designer
fixture-environment-specialist
measurement-instrumentation-specialist
experiment-runner
analysis-statistics-specialist
```

Those are extension points, not agents we need to create now.

The experiment capability should also leave room for portable experiment definitions: versioned files that describe what is being tested independently from the version-specific code that executes the experiment. Do not freeze a schema until repeated experiments tell us what actually belongs in it.

See `experiment-specialist.md` and `../standards/EXPERIMENTAL_ASSURANCE.md`.

## Planned review-side roles

```text
architecture-reviewer
evidence-reviewer
adversarial-test-reviewer
contract-reviewer
```

Review specialists should be read-only by default.

The documentation steward may also be asked to inspect a candidate from the review lane, but its job is different from contract review: it asks whether durable docs remain accurate and whether new prose actually deserves to exist.

For experimental work, review should independently challenge the method and interpretation. The specialist that designed an experiment should not be the final judge of whether its evidence proves the claim.

## Planned publication-side role

```text
publication-steward
```

This role becomes useful for projects that separate a private development repo from a public release/documentation repo.

Its job is to prepare and verify the deliberate public surface, not to sanitize the private workspace. It should prefer explicit allowlists/manifests, produce a reviewable public diff, and stop when it is unclear whether something is intended for publication.

## Generic specialist + project knowledge

Do not clone a new agent for every repo unless the job really changes.

Prefer:

```text
generic architecture reviewer
        +
project-specific invariants
        =
project architecture review
```

The same idea applies to experiments: keep generic methodology skills reusable, while the project overlay supplies the mod/runtime/claim-specific constraints.

Create a project-specific agent only when it truly needs different tools, permissions, expertise, or decision logic.

## Before an agent becomes executable

Write down:

- what problem it solves;
- when the orchestrator should call it;
- what information it needs;
- what a useful answer looks like;
- what it must not decide or change;
- permissions/tools;
- starting model class and reasoning effort;
- when it should escalate;
- how it should report uncertainty;
- at least one dry-run scenario.

Then test it.

## Quality and escalation

A cheaper specialist should never hide uncertainty to avoid escalation.

We save usage by routing routine work intelligently, not by forcing hard reasoning through a model that is clearly struggling.

If an agent design consistently needs a stronger model than expected, fix the routing assumption. Do not train the agent to sound confident enough that nobody notices.

## Documentation is not a dumping ground

Any agent may discover useful context. That does not give it permission to preserve everything it learned.

The documentation steward exists partly to protect this boundary. See `documentation-steward.md` and `../standards/CONTEXT_AND_DOCUMENTATION.md`.

## Private work is not public work

A private repo may intentionally keep useful internal continuity that would never belong in an end-user repository.

Do not make every agent police the private workspace as though it were public. Publication is a separate, deliberate step with its own specialist and review boundary. See `../standards/PUBLICATION_BOUNDARY.md`.
