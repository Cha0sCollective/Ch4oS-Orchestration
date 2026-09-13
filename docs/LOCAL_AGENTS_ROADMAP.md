# Local-agent service roadmap

This roadmap adds a small local-worker path without replacing the cloud production
coordinator or independent review. The coordinator remains Astra/medium, normal
production starts with Sol at suitable effort, exploration with Terra/medium and
review with Sol/high. Local models must earn narrower assignments through evidence.

Status: implementation is ongoing on `codex/local-agent-service`, from base
`d52afebcdf2c721f3a1f383ee9c0f06ace950b1c`. Do not infer runtime readiness from
files present on the branch. [CURRENT_WORK.md](CURRENT_WORK.md) is the short entry
point; this document owns package order and exit boundaries.

## Service boundary

Build one Node 24 TypeScript package under `tools/local-agents/`. A shared core
backs both an MCP stdio server and a CLI so lifecycle and policy do not diverge.
The exposed operations are:

| Operation | Contract |
| --- | --- |
| `capabilities` | Report provider, model and host capabilities actually observed. |
| `start_task` | Start one bounded task from an identified snapshot and return its identity. |
| `get_task` | Return state, outputs, errors and the snapshot each result covers. |
| `cancel_task` | Request cancellation and report the observed terminal state. |
| `record_feedback` | Store review outcome tied to the exact task/model/runtime evidence. |

The local worker returns a proposed patch or file content and a concise result. It
does not apply a direct diff to the coordinator's workspace. A baseline test uses
the unchanged source snapshot. A proposed-patch test uses a separately constructed,
identified snapshot. Neither result silently transfers to the other.

Local inference is loopback-only through Ollama; separately approved remote
inference follows package 7's free-endpoint and data-consent controls. The
service must reject credentials, remote-backed Ollama models and non-loopback
endpoints rather than relying on a prompt. Prompt instructions such as "read only"
do not prove filesystem isolation.

## Active packages

### 1. Foundation and install

Establish the Node 24 TypeScript package, reproducible install/build/test commands,
ignored runtime state and concise operator documentation. Keep secrets, model
weights, task output and machine-specific paths out of Git.

Exit: a clean checkout can install, build and run focused tests; packaging exposes
only intended files and entry points.

### 2. Native host probes

Probe three paths separately because success in one does not prove another:

- direct child control from the active host;
- standalone local worker execution;
- cloud-parent to local-child routing.

Record actual identity, lifecycle, cancellation, model/runtime and permission
signals. Do not simulate native selection by pasting a role prompt.

Exit: each path has an explicit supported, unsupported or blocked result with
reproducible evidence. Unsupported paths retain a clear fallback and are not
described as ready.

### 3. Shared core, MCP stdio and CLI

Implement the five-operation lifecycle once, then expose thin MCP stdio and CLI
adapters. Bound inputs, output size, concurrency, timeouts and persisted state.
Make task identity and snapshot identity stable enough for follow-up and review.

Exit: both adapters demonstrate equivalent lifecycle behavior against the same
core, including structured failures and restart-safe task lookup where promised.

### 4. Sandbox, cancellation and failure checks

Use disposable fixtures. Demonstrate denial outside the allowed workspace as well
as allowed behavior inside it. Prove cancellation against a real running task and
verify descendants and temporary state are cleaned up. Exercise provider absence,
wrong model/digest, oversized input/output, timeout, malformed response and restart.

Named isolated commands remain unavailable until host-level denial and cancellation
evidence supports that claim. A model refusing a write because the prompt says so
is not a sandbox test.

Exit: boundaries and lifecycle behavior are observed independently; failures leave
the coordinator workspace and unrelated user state unchanged.

### 5. Qualification and independent review

Start with the candidate records under
[`agents/orchestrators/routing`](../agents/orchestrators/routing/README.md). Pin the
exact tag/digest, quantization and runtime. Qualify narrow task classes with known
defect/clean controls, output inspection and cloud review. Track false claims,
unsafe patches, missed defects, context failures, latency and resource limits.

`qwen3.5:9b` Q4_K_M is a general local candidate. `qwen2.5-coder:14b` Q4_K_M is a
candidate for draft code or patch proposals. Neither is currently qualified.

Exit: independent Sol/high review decides which exact model/runtime/task classes,
if any, are adequate and records limitations. No passing result promotes a local
worker into final independent review.

### 6. Reviewed adoption

Prepare a configuration-only, reviewable adoption proposal for each target. Record
the Orchestration revision, target base, copied files, behavior change, exceptions
and validation. A clean target clone must stand alone. Do not reverse-sync drift or
depend on this sibling checkout.

Exit: independent review has accepted the adoption candidate and the owner has
approved the target adoption gate. Merge, release and publication remain governed
by the target.

## Package 7: approved free OpenRouter integration

The owner activated this implementation package on 2026-09-12 after requesting
access to capable free models. Preserve the local-only default and implement the
real OpenRouter adapter through the same worker contracts. Require explicit
model/endpoint selection, current zero pricing, no provider/model fallback,
structured-output support, bounded context and real provider statistics.

Remote dispatch needs host-approved repository data and per-task consent. Keep
credentials in host-local environment storage. Qualify each endpoint/profile and
record provider/catalog identity, observed cost and correction effort. Remote
model revisions are less reproducible than local digests; verify each pilot answer
and rerun qualification after relevant changes or material quality failures.
Missing credentials or suitable endpoints are explicit failures. Paid inference
and account purchases are outside this authorization.

## Approved workflow rollout

Improve the shared service before ordinary adoption: safe failure diagnostics and
partial counters, discoverable repository scope, task-specific actions, required-item
coverage and optional bounded initial excerpts. Qualification is change-triggered;
explicit expiry remains supported, with no mandatory 24-hour eligibility window.

Start with local evidence summaries and NVIDIA source comparison using two real-work
cases plus one ambiguity/adversarial case, each twice. Retain every attempt; at most
two operational-failure replacements per campaign are permitted. Incorrect or
malformed answers are not replacement candidates. Independent review precedes five
supervised pilot attempts. Codex takes over when an opportunistic remote job fails.
No passing run automatically promotes a model or changes independent review routing.

Minecraft project source is owner-approved nonconfidential material within registered
scope. Codex may supply reviewed documentation sources and sets task consent under
that standing authorization. Keys and unrelated private runtime data remain excluded.

Install Cherry Studio as a host-local personal model playground, with explicit free
OpenRouter presets and audited auxiliary routing. Add a separate ComfyUI/FLUX.2 Klein
4B manual image pilot. Keep installs, weights, credentials and routine history outside
Git; commit reproducible setup records and reviewed findings. Evaluate additional
models sequentially. Do not build an image worker API in this packet.

Refresh the prepared Create-Ch4oS and Installer adoption changes with actual revisions
and validation. Sandbox commands remain disabled; no incidental UAC/setup retries.
Existing merge, publication and live acceptance gates remain unchanged.

## Current closeout boundary

The owner removed the qualification requirement for the exact
`nvidia/nemotron-3-ultra-550b-a55b:free` route in worker service 0.1.6. Its configured
task classes are available in ordinary `work` mode regardless of missing, stale,
expired or withdrawn qualification records. This exception does not weaken
free-endpoint pinning, repository scope, per-task data consent, limits, result
verification or service-term checks, and it does not apply to another model.
Nemotron Ultra jobs and results also have no age-based expiry; count and
storage-size bounds still apply. Other models retain the 24-hour lifetime.

Further trials remain paused. Do not resume qualification for other models,
supervised pilots, image trials, paid searches or sandbox experiments
automatically. Manual use of installed Cherry Studio and ComfyUI remains available. See
[installed capabilities](INSTALLED_CAPABILITIES.md) and [local images](LOCAL_IMAGES.md).
The separately authorized $5 search integration remains disabled after provider
failures. Commands remain disabled.
