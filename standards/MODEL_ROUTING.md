# Model Routing

## Governing rule

**Quality and correctness are primary. Efficiency is secondary.**

Use the least expensive model and reasoning effort only when there is good reason to believe they will preserve the required quality. If adequacy is uncertain, the task is high-consequence, or a weaker pass leaves material ambiguity, escalate to the stronger model or higher reasoning effort.

The goal is not to minimize usage. The goal is to avoid wasting premium reasoning on work that a cheaper model can perform equally well, while protecting the quality of decisions, implementation, validation, and review.

## Routing principles

1. **Do not downgrade through optimism.** A cheaper model should be selected because the task is demonstrably routine or bounded, not because saving usage is desirable.
2. **Collect cheaply, decide strongly.** High-volume scanning, extraction, and routine inspection can be delegated downward when the results remain verifiable. Architecture, acceptance, ambiguous debugging, and synthesis stay with stronger models.
3. **Escalate on uncertainty.** If a specialist cannot resolve an issue cleanly, return the uncertainty and escalate rather than forcing a low-confidence answer.
4. **Protect reviewer quality.** Independent review is an error-catching layer; it should not be weakened simply to reduce usage.
5. **Prefer one strong pass over repeated weak passes.** Rework caused by underpowered reasoning is both lower quality and less efficient.

## Current role classes

The intended hierarchy is:

| Role class | Preferred capability tier | Typical effort | Typical work |
| --- | --- | --- | --- |
| Orchestrator | Astra-class | Medium by default; High when warranted | Decompose, delegate, reconcile, decide, integrate |
| Deep specialist | Sol-class | Medium/High | Architecture, evidence reasoning, difficult implementation, adversarial analysis |
| High-volume analyst | Terra-class | Medium | Repository exploration, CI/log analysis, documentation/contract comparison |
| Mechanical worker | Luna-class | Low/Medium | Search, extraction, cataloguing, straightforward repetitive edits |

These are starting policies, not hard ceilings. A Terra-class task that becomes architecture-sensitive should escalate; a Luna-class extraction that requires interpretation should escalate rather than guess.

Exact executable model identifiers must be verified against the current Codex installation before they are placed in TOML configuration.

## Production routing

The production orchestrator should normally use the strongest orchestration-capable model available and delegate high-volume work where quality is preserved.

Typical pattern:

```text
orchestrator
  -> repo explorer: map affected files and symbols
  -> specialist: design or implement the difficult portion
  -> CI investigator: run/inspect validation and summarize failures
  -> orchestrator: verify important claims, integrate findings, decide next action
```

Do not spawn specialists merely to maximize parallelism. Delegate when the task is separable, noisy, independently verifiable, or benefits from a second reasoning perspective.

## Review routing

The review orchestrator should be strong enough to resolve disagreements between reviewers and maintain the exact proof boundary.

Suggested starting policy:

- architecture review: Sol-class, High for cross-system changes;
- evidence/provenance review: Sol-class, High when acceptance claims are subtle;
- adversarial testing review: Sol-class, Medium/High;
- contracts/documentation review: Terra-class, Medium by default, escalating when contract implications are ambiguous;
- mechanical diff inventory: Terra/Luna-class before deeper review, with source references preserved.

For release, promotion, evidence, security, safety, destructive behavior, or other high-consequence gates, prefer stronger review over usage savings.

Review children should default to read-only operation.

## Reasoning-effort escalation

Start at an effort level appropriate to the task, not reflexively at minimum or maximum. Escalate when one or more of these are true:

- the task spans multiple subsystems with hidden coupling;
- evidence or acceptance boundaries are ambiguous;
- independent specialists disagree materially;
- a failure is nondeterministic or resists ordinary debugging;
- the change affects security, data integrity, destructive behavior, or project governance;
- a reviewer is deciding whether a milestone or release claim is justified;
- the cost of a false positive or false negative is high.

Do not use maximum reasoning merely because a task is important. Prefer a bounded higher-effort pass on the difficult decision after appropriate specialists collect the relevant facts.

## Context-efficiency rule

The strongest model should consume distilled outputs where practical, but important decisions must remain traceable to primary sources. Large logs, generated files, broad searches, and mechanical inventories may be processed by an appropriate specialist, with file paths, commands, revisions, and evidence references preserved so the orchestrator can verify material claims.

Compression must not erase uncertainty, contradictory evidence, failed checks, or proof-boundary details.

## Evaluation and tuning

Future revisions may record per-role usage, escalation frequency, reviewer escapes, regressions, rework, and acceptance quality. Model assignments should be tuned from observed outcomes.

A routing change is successful only if it maintains or improves quality. Reduced usage alone is not a sufficient success criterion.
