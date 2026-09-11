# Review Protocol

Independent review is its own lane. The reviewer is there to challenge the candidate, not to keep building it under a different prompt.

## Start fresh

Review begins in a fresh parent chat/session at an exact candidate revision.

The reviewer can read previous GitHub findings, but it should reconstruct the candidate from durable state instead of depending on production-chat memory.

At minimum, review should know:

- the repository;
- base revision;
- exact candidate revision;
- linked issue/PR;
- applicable project instructions and accepted design records;
- validation/evidence attached to that candidate.

## Read-only by default

Review orchestrators and review subagents should be read-only unless a narrowly authorized tool needs write access to post the final review.

If review finds a bug, describe it clearly and return control to production. Do not "helpfully" fix the candidate in the review worktree.

## A review belongs to one SHA

If code or configuration changes, review the new candidate again.

Old findings are still useful history. They are not approval of the descendant.

## Quality is the reason review exists

Review is not the place to save usage by accepting a weaker answer.

Use cheaper agents for mechanical inventory when their work is easy to verify. Escalate architecture, evidence, adversarial, security, acceptance, or other high-consequence reasoning when uncertainty matters.

## Useful specialist views

Not every candidate needs every reviewer. Spawn the ones that match the risk.

### Architecture reviewer

Trace the real execution path and look for changes that work locally but damage authority boundaries, lifecycle, coupling, compatibility, or the shape of the system.

### Evidence reviewer

Check whether the claimed validation actually proves this exact candidate. Look closely at provenance, artifact identity, proof boundaries, and acceptance language.

### Adversarial test reviewer

Try to find false-pass paths, weak negative cases, incomplete failure handling, races, cleanup holes, or tests that accidentally share the implementation's assumptions.

### Contract reviewer

Check public contracts, schemas, compatibility promises, status claims, and externally meaningful behavior against the implementation.

### Documentation steward

Check whether existing durable docs remain true. It should not preserve chat context or brainstorm new project history just because it learned something useful during review.

## Review the code, not the sales pitch

Production summaries are navigation aids, not proof.

When relevant:

1. establish base/head;
2. inventory the changed files and claims;
3. trace behavior outside the diff when needed;
4. inspect tests and independent validators;
5. inspect current CI/artifacts for this candidate;
6. compare behavior against accepted project invariants;
7. reconcile duplicate or conflicting specialist findings;
8. say clearly what remains unproven.

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
- combine passing checks from different candidate revisions unless the project explicitly allows it;
- substitute headless or synthetic proof for live proof when the claim requires live behavior;
- assume a current candidate is proven because an ancestor was accepted.

## What REVIEW PASS means

`REVIEW PASS` means review found no blocking issue in the exact candidate under the requested scope.

It does not grant owner-only merge/promotion authority and it does not invent manual/live evidence that has not happened.
