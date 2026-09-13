# Model Routing

## The rule that matters

**Quality and correctness come first. Efficiency is secondary.**

The local-worker directory is [agents/orchestrators/routing](../agents/orchestrators/routing/README.md).
Published capabilities guide candidate selection. Use the task classes in
`availableTaskClasses` for assignment and inspect `qualificationRequired` before
interpreting `qualifiedTaskClasses`, which remains evidence rather than the general
eligibility field. Inspect connector capabilities before use and verify every
result. Missing adequacy escalates to the existing cloud production route. Local
workers are not final reviewers.
Local-only inference remains the default. The owner has authorized OpenRouter
implementation for free models. The exact
`nvidia/nemotron-3-ultra-550b-a55b:free` route does not require qualification;
other model profiles retain their qualification requirements. Remote work still
requires a registered zero-price endpoint, current suitable service terms, host
data permission and explicit per-task consent; paid inference and automatic
provider fallback remain disabled.
The separately authorized web-search capability uses a distinct key and a $5
non-resetting budget. It does not authorize paid model inference, GUI auxiliary
requests or unrestricted worker browsing.

Use a cheaper model or lower reasoning effort when there is good reason to believe it will do the job just as well. Do not downgrade because saving usage feels virtuous.

If the task is ambiguous, high-consequence, architecture-sensitive, or a weaker pass leaves material uncertainty, escalate.

The goal is not to spend as little as possible. The goal is to avoid wasting premium reasoning on work that does not need it while protecting the quality of the work that does.

## How to think about routing

### Collect cheaply, decide strongly

Large searches, file inventories, log extraction, and routine comparisons are good candidates for cheaper specialists when their output is easy to verify.

Architecture, acceptance, ambiguous debugging, cross-system design, and final synthesis deserve stronger reasoning.

### Don't downgrade through optimism

A cheaper model should get a task because the work is genuinely routine or tightly bounded, not because we hope it will probably be fine.

### Escalate uncertainty instead of hiding it

A specialist that reaches the edge of its reliable capability should say so. A bounded uncertain answer plus an escalation is better than a confident guess.

### Protect review quality

Review exists to catch what production missed. Do not weaken that layer just to save usage.

### Prefer one good pass over repeated weak passes

Rework caused by an underpowered model is worse for both quality and efficiency.

## Current role classes

These are starting points, not ceilings.

| Role | Starting capability | Typical effort | Good fit |
| --- | --- | --- | --- |
| Coordinator | Astra-class | Medium, High when warranted | Receive owner input, decompose, delegate, reconcile, decide and integrate |
| Production worker | Sol-class by default | Medium/High | Bounded implementation, focused testing and implementation documentation |
| Deep specialist | Sol-class | Medium/High | Architecture, evidence reasoning and difficult specialist analysis |
| High-volume analyst | Terra-class | Medium | Repo exploration, CI/log analysis, broad docs/contract comparison |
| Mechanical worker | Luna-class | Low/Medium | Search, extraction, cataloguing, straightforward repetitive edits |

If a Terra-class investigation turns into an architecture decision, escalate it. If a Luna-class extraction starts requiring interpretation, escalate rather than guess.

Verify exact executable model identifiers against the current Codex installation before putting them in TOML.

## Production

The user-facing Desktop production coordinator should normally use the strongest
practical orchestration model. Its job is to own the packet and integrate the
result; it need not personally implement the change. Route bounded implementation
to a Sol-class worker by default, or another model when the task's difficulty and
verifiability make that model a better fit. Verify the selected model and effort on
the actual host rather than inferring them from a prompt or role label.

A healthy pattern looks like:

```text
coordinator
  -> repo explorer maps the affected area
  -> production worker implements within scoped write access
  -> specialist handles a hard design or evidence question
  -> CI investigator works through validation noise
  -> coordinator integrates the work and keeps affected documentation true
  -> coordinator verifies important claims and decides what happens next
```

Do not spawn agents just to make the graph look busy. Delegate when the work is separable, noisy, independently verifiable, or genuinely benefits from a second reasoning perspective.

A task-scoped implementation worker does not need a saved named profile. Do not
claim that such a profile exists or was activated. Record the worker's actual host
model, effort and scoped write permissions. Keep the candidate's independent review
in a separate fresh context; a worker does not review or accept its own changes.

## Review

The review orchestrator must be strong enough to reconcile disagreement and protect the exact proof boundary.

Useful starting points:

- architecture review: Sol-class, High for cross-system changes;
- evidence/provenance review: Sol-class, High when acceptance claims are subtle;
- adversarial testing: Sol-class, Medium/High;
- contract review: Terra-class by default, escalating when contract implications are ambiguous;
- mechanical diff inventory: Terra/Luna-class with source references preserved;
- documentation review: use the documentation steward or a reviewer with equivalent project context when the change affects durable docs.

For release, promotion, evidence, security, destructive behavior, or other high-consequence gates, choose stronger review over usage savings.

## When to raise reasoning effort

Escalate when:

- several subsystems interact in ways that are easy to miss;
- evidence or acceptance boundaries are ambiguous;
- specialists materially disagree;
- a failure is nondeterministic or resists ordinary debugging;
- the change affects security, data integrity, destructive behavior, or governance;
- a reviewer is deciding whether a milestone/release claim is justified;
- the cost of a false positive or false negative is high.

Do not use maximum reasoning just because something is important. Collect the facts efficiently, then spend the deeper reasoning on the part that actually needs it.

## Context efficiency

Ultra reasoning for delegated agents requires explicit owner approval. Set the
model and effort for each bounded assignment instead of inheriting the coordinator's
settings. Give a fresh worker only its assignment, relevant sources, permissions
and acceptance criteria; do not copy the full conversation by default.

Strong models should receive distilled findings when practical, but important decisions must stay traceable to primary sources.

Compression is useful. Hiding uncertainty, failed checks, contradictory evidence, or proof-boundary details is not.

## Tune from real outcomes

As we get real usage data, track things like reviewer escapes, rework from weak routing, unnecessary premium-model use, escalation frequency, and validation quality.

A routing change is successful only if quality is maintained or improved. Lower usage by itself is not a win.
