# Routing records

Routing has three separate layers:

- A **model record** identifies a model artifact or provider tag and the primary
  sources for the facts we rely on.
- A **profile** combines instructions, a routing choice and requested runtime
  defaults. It does not prove the selected model or enforce permissions.
- A **qualification** is project evidence that one exact model/runtime combination
  is adequate for a bounded task class. Qualification does not transfer silently
  to another quantization, provider, fallback or role.

Current cloud routing follows [MODEL_ROUTING.md](../../../standards/MODEL_ROUTING.md):
Astra/medium coordinates, Sol at suitable effort handles production, Terra/medium
explores and Sol/high reviews. Host inspection must confirm the executable model,
effort and effective permissions.

Local candidates:

The reusable [profile definitions](../../../tools/local-agents/catalog/profiles.json)
declare task classes and output responsibilities. Host-local configuration binds
them to approved installed model identities and limits. Empty qualification means
evaluation only; it does not permit ordinary work.

| Record | Proposed use | State |
| --- | --- | --- |
| [Qwen3.5 9B Q4_K_M](models/qwen3.5-9b-q4_k_m.md) | Small bounded local tasks | Candidate; not qualified |
| [Qwen2.5-Coder 14B Q4_K_M](models/qwen2.5-coder-14b-q4_k_m.md) | Draft code or patch proposals | Candidate; not qualified |

The [reviewed local evaluation aggregate](qualifications/2026-09-12-local.json)
records exact identities, settings, token counters, elapsed time and rejected
task classes. The [trial report](../../../docs/LOCAL_AGENTS_TRIAL.md) explains
the material failures. Completion counts are not correctness counts.
The [reviewed NVIDIA summary evaluation](qualifications/2026-09-12-nvidia.json)
records two correct results out of six trials, including provider failures and
one evidence error. It grants no eligibility.
The [0.1.2 summary rerun](qualifications/2026-09-12-summary-v012.json) records
the larger remote budget and numbered evidence. Both candidates still miss the
summary acceptance requirement; neither is eligible for ordinary work.

No local candidate may replace the cloud coordinator or independent reviewer on
the strength of a vendor card or one successful task. Qualification must name the
exact tag and digest, quantization, Ollama/runtime version, prompt/task class,
context settings, hardware-relevant limits, tests, reviewer and observed failures.

The owner authorized OpenRouter implementation on 2026-09-12 for free models.
Local-only remains the default. Remote qualification identifies the exact model,
underlying endpoint, catalog fingerprint and fallback policy. Require zero-price
routing, host data permission and per-task consent; credentials stay host-local.
No random free router or silent fallback is accepted. Remote model contents cannot
be pinned like local weight digests, so changed endpoint identity or settings
require renewed qualification. Optional explicit expiry remains supported.
See [the OpenRouter record](models/openrouter-free.md) and the
[additional trial candidates](models/additional-candidates.md).
