# Experimental Assurance

Some Cha0sCollective projects do more than check whether a game feature "seems to work." They may use Minecraft as a controlled environment for experiments involving systems such as power grids, reactors, kinetics, fluids, logistics, or other mods that expose meaningful numerical state.

When we make an experimental claim, the experiment deserves scientific care. That does **not** mean every artifact around the experiment needs forensic-grade proof.

A good shorthand is:

> **Be rigorous about the experiment, practical about the game.**

## Match the rigor to the claim

Different claims need different kinds of confidence.

### Experimental claims

Examples:

- a rotational ratio settles at the expected value;
- a simulated power network reaches a measured voltage/current relationship;
- a reactor behaves within a defined operating envelope;
- an observed transfer rate changes predictably under controlled inputs.

These can require strong experimental discipline:

- known starting conditions;
- controlled variables and explicit inputs;
- correct fixture/setup;
- well-defined units and sampling phase;
- tolerances and stability windows;
- valid/unavailable states rather than invented values;
- repeatability where the claim needs it;
- structured results tied to the tested code/mod/configuration;
- cleanup/reset sufficient to keep later runs trustworthy;
- conclusions that do not claim more than the measurements establish.

### Game and integration claims

Examples:

- the right Minecraft/mod versions loaded;
- client/server behavior is wired correctly;
- the fixture actually built and executed in the intended environment;
- cleanup works in the real game lifecycle;
- player-visible behavior matches the implemented feature.

These need strong software/game QA, but not automatically the same methodology as a numerical experiment.

### Graphical / human-observation claims

Examples:

- the contraption visibly rotates in the connected client;
- an effect renders correctly;
- an interaction feels or looks right;
- a captured run gives a human reviewer confidence that the real game behaved as expected.

Screenshots, video, and manual observation can be perfectly adequate here. Do not invent cryptographic media pipelines, chain-of-custody systems, or forensic attestation unless the actual project claim needs them.

### Release claims

Release confidence comes from the normal combination of build/test matrices, compatibility checks, regression coverage, user-facing QA, and any project-specific acceptance gates.

Do not automatically promote every release check into an experimental-science problem.

## Build the feature and design the experiment as different problems

Product engineering asks:

> How do we make this behavior work correctly?

Experimental assurance asks:

> What experiment would let us trust the claim we want to make about that behavior?

Those questions can be worked by separate specialists even when they ultimately share code, fixtures, or test infrastructure.

The experiment side may challenge assumptions in the implementation. The implementation side may expose practical constraints the experiment design needs to account for. Neither side should quietly redefine the other's success criteria just to make the work easier.

## Start small, leave room to grow

We do **not** need a full virtual laboratory team on day one.

A project may start with one `experiment-specialist` or experimental-assurance lead that can:

- help define the experimental claim;
- propose a valid setup and measurement plan;
- identify what needs to be controlled;
- evaluate whether existing test infrastructure is enough;
- review the resulting measurements and limitations.

The orchestration model must leave room for that role to expand later into a small team when the experiments justify it.

A future team might separate responsibilities such as:

```text
experimental-assurance lead
  -> experiment designer
  -> fixture/environment specialist
  -> measurement/instrumentation specialist
  -> experiment runner
  -> analysis/statistics specialist
```

These are capability seams, not roles we need to instantiate now.

## Portable experiment definitions

We want the option for mature experiments to become portable, versioned project artifacts rather than one-off agent instructions.

A portable experiment definition might eventually describe things such as:

- experiment identity and purpose;
- claim/hypothesis being tested;
- compatible game/mod/runtime versions;
- fixture/setup requirements;
- controlled inputs and initial conditions;
- execution procedure;
- observations to collect;
- units and sampling semantics;
- tolerances/stability rules;
- expected assertions or result interpretation;
- cleanup/reset requirements;
- expected result/artifact shape;
- metadata needed to tie a run back to the relevant code/configuration.

That does **not** mean we should design a DSL or freeze a schema now.

Let real experiments teach us which fields are stable and reusable. Start with ordinary files and clear contracts where needed. Extract a portable format only when repeated work demonstrates that portability buys us something.

The important architectural rule is that current code should not make this future path unnecessarily difficult.

## Experiment definitions should not be implementation scripts in disguise

A portable experiment should describe the experiment strongly enough to reproduce and evaluate it without hard-coding every implementation detail of one runner.

Runtime adapters, fixtures, or harnesses may translate the definition into version-specific game actions later.

Keep a useful boundary between:

```text
what experiment are we running?
        vs
how does this Minecraft/mod version execute it?
```

That boundary is especially valuable when one experiment needs to run across multiple mod versions or compatibility adapters.

## Verification infrastructure must earn its weight

Scientific rigor does not justify building infrastructure for its own sake.

Before adding a generalized harness, evidence format, fixture framework, or measurement subsystem, ask:

- Does the current claim actually need it?
- Will more than one experiment benefit?
- Is the existing approach failing in a concrete way?
- Does the new layer improve validity/repeatability enough to justify its maintenance cost?
- Are we solving a recurring experimental problem, or future-proofing an imaginary one?

Use the simplest method that establishes the required confidence without hiding meaningful risk.

If a heavier system is genuinely needed, build it deliberately and call out the downstream maintenance, compatibility, validation, and resource cost.

## Experimental assurance is not independent review

Experiment specialists may help design or implement fixtures, measurement code, portable experiment files, and analysis tooling. That makes them part of the work, not the final independent judge of their own system.

Independent review can still ask:

- Was the experimental method valid?
- Are the measurements meaningful?
- Does the conclusion follow from the data?
- Did the verifier share an assumption with the implementation that could create a false pass?
- Is the strength of the evidence appropriate for the claim?

## Keep results useful

Experimental results should be structured enough that later work can understand what happened without replaying the chat that produced them.

Preserve the information needed to interpret the run. Do not preserve every intermediate thought from the agents that designed or executed it.

This standard works alongside `CONTEXT_AND_DOCUMENTATION.md`: scientific continuity can be valuable durable project knowledge, but conversation history is still not automatically project content.
