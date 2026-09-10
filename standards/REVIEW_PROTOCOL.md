# Review Protocol

## Purpose

Independent review is a separate execution lane. Its job is to evaluate a candidate, not to continue production work with a different prompt.

## Fresh-context requirement

Start review in a fresh parent chat/session. The reviewer may read prior GitHub findings, but must reconstruct the candidate from durable state rather than relying on production-chat memory.

The minimum review identity is:

- repository;
- base revision;
- exact candidate revision;
- linked issue/PR;
- applicable project instructions and design records;
- validation/evidence attached to that candidate.

## Read-only default

Review orchestrators and their subagents should operate read-only unless a separately authorized review tool requires write access to post the final review. They do not implement fixes in the candidate worktree.

If review discovers a defect, describe it precisely and return control to production.

## Review invalidation

A review decision belongs to the exact candidate revision it names. Any code or configuration change produces a new candidate requiring a fresh review decision.

Previous review findings remain useful historical evidence. They are not automatically approval of descendants.

## Quality floor

Review is an error-catching layer and is not the place to trade away meaningful quality for speed or usage savings. Use cheaper specialists for mechanical inventory only when their output remains reliable and verifiable. Escalate architecture, evidence, adversarial, or acceptance reasoning whenever the lower-cost path introduces material uncertainty.

## Recommended specialist decomposition

A project may customize the roster, but a complex software candidate commonly benefits from:

### Architecture reviewer

Trace changed execution paths and check architectural invariants, boundaries, authority, lifecycle, and coupling.

### Evidence/provenance reviewer

Check whether claimed validation actually proves the exact candidate and whether evidence identity, provenance, artifact handling, and acceptance statements are sound.

### Adversarial test reviewer

Look for false-pass paths, missing negative cases, incomplete cleanup/failure handling, races, ambiguity, and tests that share assumptions with the implementation.

### Contract/documentation reviewer

Check public contracts, schemas, user/operator guidance, limitations, and status claims against actual behavior and proof.

Additional specialists should be spawned only when the candidate warrants them.

## Review method

Review the actual diff and affected execution paths. Do not accept a production summary as proof.

Where relevant:

1. identify the base/head relation;
2. inventory changed files and claims;
3. trace behavior beyond changed lines when necessary;
4. inspect tests and independent validators;
5. inspect current CI/artifacts for the exact candidate;
6. compare implementation with documented invariants;
7. synthesize duplicate or conflicting specialist findings;
8. state the remaining proof boundary.

## Review handoff

Recommended format:

```text
[review-agent] REVIEW

Issue: #<issue>
PR: #<pr>
Base: <exact revision>
Head reviewed: <exact candidate revision>

Blocking findings:
- ...

Significant non-blocking findings:
- ...

Evidence / acceptance gaps:
- ...

Reviewer disagreements or uncertainty:
- ...

Decision:
- CHANGES REQUESTED | REVIEW PASS | OWNER GATE

Next action:
- ...
```

An empty findings section is not sufficient by itself; the reviewer must still state what was inspected and what remains unproven.

## CI and evidence

CI is inspected by reference. Do not rely on copied status snapshots when current workflow state is available.

Never:

- treat cancelled work as successful validation;
- combine successful checks from different candidate revisions without an explicit project rule permitting it;
- substitute headless/synthetic proof for live proof when the claim requires live behavior;
- infer current proof merely because an ancestor was accepted.

## Passing review

`REVIEW PASS` means no blocking review finding remains for the exact candidate under the requested review scope. It does not silently grant owner-only merge/promotion authority or establish manual/live evidence that has not occurred.
