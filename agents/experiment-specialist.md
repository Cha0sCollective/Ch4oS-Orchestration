# Experiment Specialist — design record

Status: **planned, not executable yet**

This is the first planned reusable role for experimental-assurance work. It is intentionally broad enough to bootstrap the capability, but the interfaces should let it split into a team later without forcing a redesign of every project.

## What problem it solves

Some projects need more than ordinary QA. They need to design and evaluate controlled in-game experiments with meaningful numerical observations.

The experiment specialist helps make those experiments trustworthy without turning the whole development process into a forensic evidence system.

## When to call it

Use this role when a work packet includes a meaningful experimental claim, for example:

- numerical behavior from a modded system;
- power, thermal, kinetic, fluid, logistics, or reactor measurements;
- repeatability/stability questions;
- controlled comparisons between implementations or mod versions;
- deciding whether an existing fixture/measurement setup can support a claim.

Do not invoke it just because a feature has tests.

## Initial responsibilities

The first version should be able to:

- help state the claim or hypothesis clearly;
- separate controlled inputs, observed outputs, and confounding variables;
- propose the smallest valid experimental setup;
- define observations, units, timing/sampling, tolerances, and unavailable states;
- identify setup/cleanup requirements that affect validity;
- decide whether existing verification infrastructure is enough;
- recommend stronger methodology when the claim actually requires it;
- review experimental results for overclaiming or missing context;
- surface when a future portable experiment definition would be valuable.

## What it should not do

It should not:

- automatically design new generalized infrastructure for every experiment;
- treat screenshots/video as forensic evidence by default;
- redefine product requirements to make an experiment easier;
- approve its own experiment as the final independent reviewer;
- freeze a portable experiment schema before we have enough real examples;
- turn brainstorming about future experiments into roadmap commitments without authorization.

## Expansion seam

If one specialist becomes overloaded or we discover recurring expertise boundaries, the role may split into a small experimental team.

Possible future specialists include:

```text
experiment designer
fixture/environment specialist
measurement/instrumentation specialist
experiment runner
analysis/statistics specialist
```

The parent experimental-assurance lead would coordinate them and keep one coherent claim/proof boundary.

We are deliberately **not** creating those agents yet.

## Portable experiment artifacts

The role should be able to move toward versioned, portable experiment definitions later.

For now, preserve the conceptual separation between:

- the experiment definition: what is being tested and what observations matter;
- the execution adapter/harness: how this specific Minecraft/mod/runtime performs the setup and measurements;
- the result record: what actually happened in a particular run.

Do not require a specific file format yet. Real Contraption Lab experiments should drive that design.

## Relationship to other roles

### Production engineer

Builds the game/mod behavior. May collaborate on fixture/runtime hooks, but does not own the experimental method by default.

### Game QA / CI

Checks software and integration behavior. Experimental assurance only takes over where the claim depends on controlled measurement or scientific interpretation.

### Evidence reviewer

Independently checks whether the claimed evidence actually supports the exact candidate/result. The experiment specialist can produce or interpret evidence but should not be its final independent reviewer.

### Adversarial reviewer

Looks for false-pass paths, shared assumptions, missing negative cases, and ways the experimental setup could lie to us.

### Production parent

Owns affected documentation and decides which experiment designs/results deserve durable project memory. A documentation helper is optional. The experiment specialist should not dump every design conversation into docs.

## Starting model / permissions

Initial methodology routing is `gpt-5.6-sol` with high reasoning effort. This remains a role design; no executable profile is required until its first bounded experiment trial.

This role will likely need a strong reasoning model for methodology design and interpretation. Mechanical fixture inventory or result extraction may later delegate to cheaper specialists where quality is preserved.

Write permissions should depend on the task. A design-only invocation can be read-only. A packet explicitly authorizing experiment/fixture implementation may grant bounded write access.

## Escalation conditions

Escalate when:

- the claim requires domain expertise the role cannot establish confidently;
- units, instrumentation, sampling, or simulation semantics are unclear;
- experimental and implementation constraints conflict materially;
- a proposed method would add substantial reusable infrastructure;
- specialists disagree about whether the experiment is valid;
- the project is about to treat a result as an acceptance/release boundary;
- the experiment needs a new portable format or cross-version execution contract.

## First dry-run target

Contraption Lab's early Create observation/measurement work is a good candidate once its orchestration cutover is complete.

A useful dry run should ask the role to design a small RPM/direction experiment from an accepted project contract, while explicitly challenging it not to overbuild the harness or evidence system.
