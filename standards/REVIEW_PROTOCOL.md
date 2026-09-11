# Review Protocol

Independent review is its own lane. The reviewer is there to challenge the candidate, not to keep building it under a different prompt.

## Start fresh

Initial review begins in fresh context at a named candidate revision. Use an independent subagent when available; a separate user-facing task is not required.

The reviewer can read previous GitHub findings, but it should reconstruct the candidate from durable state instead of depending on production-chat memory.

At minimum, review should know:

- the repository;
- base revision;
- exact candidate revision;
- linked issue/PR;
- applicable project instructions and accepted design records;
- validation/evidence attached to that candidate;
- any experimental claim and method the candidate relies on.

## Read-only by default

Review orchestrators and review subagents should be read-only unless a narrowly authorized tool needs write access to post the final review.

If review finds a bug, describe it clearly and return control to production. Do not "helpfully" fix the candidate in the review worktree.

## Follow-up review

Record which revision was reviewed. For a follow-up, inspect the delta and its effects, retaining earlier findings and valid checks for unchanged behavior. Expand the review when the change crosses boundaries or invalidates earlier assumptions; do not reconstruct the whole review for every commit. Documentation-only corrections normally need a documentation check, not another application review or full test run.

Do not describe an old result as a new execution. State what was rerun and what unchanged coverage was reused. Routine low-impact edits do not require an independent review lane.

## Quality is the reason review exists

Review is not the place to save usage by accepting a weaker answer.

Use cheaper agents for mechanical inventory when their work is easy to verify. Escalate architecture, experimental methodology, evidence, adversarial, security, acceptance, or other high-consequence reasoning when uncertainty matters.

## Useful specialist views

Not every candidate needs every reviewer. Spawn the ones that match the risk.

### Architecture reviewer

Trace the real execution path and look for changes that work locally but damage authority boundaries, lifecycle, coupling, compatibility, or the shape of the system.

### Experimental-method reviewer

Use this when the candidate makes a scientific/numerical claim.

Challenge the experiment independently:

- are the controlled variables actually controlled?
- are the measurements/units/sampling meaningful?
- are tolerances or stability criteria justified?
- can setup/cleanup contaminate the result?
- does the conclusion go beyond the data?
- did the experiment design share an assumption with the implementation that could hide a false pass?

This can be a dedicated reviewer later or a responsibility delegated to a strong existing specialist. We do not need to create a permanent agent for it before the workload justifies one.

### Evidence reviewer

Check whether the claimed validation actually proves this exact candidate. Look closely at provenance, artifact identity, proof boundaries, and acceptance language.

For experimental results, make sure the run identity and result record are strong enough for the claim. Do not demand forensic media provenance when the claim only needs ordinary graphical confirmation.

### Adversarial test reviewer

Try to find false-pass paths, weak negative cases, incomplete failure handling, races, cleanup holes, or tests that accidentally share the implementation's assumptions.

### Contract reviewer

Check public contracts, schemas, compatibility promises, status claims, and externally meaningful behavior against the implementation.

### Documentation steward

Check whether existing durable docs remain true. It should not preserve chat context or brainstorm new project history just because it learned something useful during review.

## Review the code and experiment, not the sales pitch

Production summaries are navigation aids, not proof.

When relevant:

1. establish base/head;
2. inventory the changed files and claims;
3. trace behavior outside the diff when needed;
4. inspect tests and independent validators;
5. inspect the experiment design/method when a scientific claim is made;
6. inspect current CI/artifacts/results for this candidate;
7. compare behavior against accepted project invariants;
8. reconcile duplicate or conflicting specialist findings;
9. say clearly what remains unproven.

## Handoff

A review handoff should be structured enough to find the important facts but still read like a developer explaining the result.

```text
[review-agent] REVIEW

Issue: #<issue>
PR: #<pr>
Base: <exact revision>
Head reviewed: <exact candidate revision>

Blocking:
- ...

Worth fixing / watching:
- ...

Experimental-method concerns (if applicable):
- ...

Evidence or acceptance still missing:
- ...

Uncertainty / reviewer disagreement:
- ...

Decision:
- CHANGES REQUESTED | REVIEW PASS | OWNER GATE

Next step:
- ...
```

If there are no findings, still say what was inspected and what remains outside the review's proof boundary.

## CI and evidence

Inspect CI by reference when current state is available. Do not rely on stale copied snapshots.

Never:

- count cancelled work as successful validation;
- assemble unrelated passing checks into a claim that a new candidate ran them all;
- substitute headless or synthetic proof for live proof when the claim requires live behavior;
- demand forensic-grade media proof when ordinary game-development graphical evidence is enough for the claim;
- assume a current candidate is proven because an ancestor was accepted;
- accept a numerical conclusion just because the game visibly looked right.

## What REVIEW PASS means

`REVIEW PASS` means review found no blocking issue in the exact candidate under the requested scope.

It does not grant owner-only merge/promotion authority and it does not invent manual/live evidence that has not happened.

For experimental work, it also does not mean "science proved forever." It means the method, evidence, and conclusion are adequate for the specific claim and acceptance boundary being reviewed.
