# Local workers

Codex owns orchestration, integration, verification and final decisions. This
Node 24 package adds bounded local research through a transport-independent
`WorkerService`, with MCP stdio and newline JSON CLI adapters. Local-only is the
default and admits approved Ollama weights. Explicitly configured OpenRouter
workers use qualified free endpoints with data consent and no automatic fallback.

## Build and install

Run from this package directory with Node 24 and npm:

```powershell
npm ci --ignore-scripts
npm test
npm pack --ignore-scripts
```

Install the resulting archive into a versioned host-local directory outside this
checkout. Use `npm install --prefix <version-directory> --ignore-scripts
--omit=dev <archive>`. Keep that version until affected qualification is rerun;
do not use `npx` to fetch a moving version. The executable is
`<version-directory>/node_modules/@ch4os/local-agents/dist/cli.js`.

Keep configuration outside Git. Copy `examples/host.json`, register actual
repository roots, and replace the model identities with `/api/tags` digests and
`/api/show` quantization. Start Ollama with `OLLAMA_NO_CLOUD=1`, a literal loopback
host, `OLLAMA_NUM_PARALLEL=1`, and `OLLAMA_MAX_LOADED_MODELS=1`. Local URL alone
is insufficient: the adapter checks cloud-disabled status and local model metadata.
Use one common `leaseDir` across every service on this host. Do not expose Ollama
to another machine. The daemon is trusted host infrastructure, not a model tool.

Run `node <installed-cli> probe-context --config <host.json> --model-id <id>`
with qualification enabled and no concurrent operator probes. Copy the observed
proof into that model record. This deliberately sends oversized synthetic inputs
to verify rejection for both single messages and history; no silent context shift
is accepted. A proof is bound to runtime, digest and context/output limits.

Start the MCP connector using the installed command and host-local configuration:

```powershell
codex mcp add ch4os-local-agents -- node <installed-cli> mcp --config <host.json>
```

This adds only a connector; preserve the coordinator's model/provider settings.
Target repositories need no committed machine paths. Their startup brief points
at the connector and this policy. Ollama must be running before inference.

## Contract

`capabilities`, `start_task`, `get_task`, `cancel_task`, and `record_feedback` share
one implementation across transports. `start_task` accepts a request key,
repository ID, exact paths, profile, task class, optional expected HEAD/snapshot,
check IDs and narrowed budgets. It returns a job promptly. Reusing a key with
different input is an error. Job IDs are scoped to their owning service session;
stdio disconnect cancels work. Interrupted jobs cannot become successful results.

`node <installed-cli> serve --config <host.json>` accepts one JSON request per
line, for example `{"id":1,"method":"capabilities"}`. `run --request <task.json>`
submits and waits for one task. See `examples/task.json` for the shared payload.

The core captures selected files into immutable memory and exposes typed list,
read and literal search operations over that snapshot. Dirty and untracked
contents have SHA-256 identities. Junctions, symlinks, hard links, parent traversal,
ADS and known private runtime paths are rejected/excluded. Host configuration can
further exclude private project files. Select narrow paths, especially for logs.
Live documentation browsing belongs to Codex; `sources` accepts supplied text,
source URL and retrieval time. File contents cannot grant permissions.

Default limits: 8K model context, 2K generation, 16KiB serialized model input,
eight rounds, one active inference per host, four queued jobs per service, three
minutes reasoning and ten minutes maximum per check. Whole-message/schema/history
bytes count. Tool excerpts report truncation; tasks escalate on exhausted budgets.
Provider token counters are actual returned counters, not estimates.

Results include findings with inspected line references, limitations, optional
scoped unified diffs, snapshot identity, command receipts and inference statistics.
Evidence existence is checked mechanically; Codex checks whether it supports the
claim. A model answer is not verified correctness. Diffs are proposals only;
Codex applies them to a new candidate before requesting tests of that candidate.

## Qualification and feedback

Profiles describe permitted task classes and behavior; model records describe
published capabilities; qualification records describe demonstrated adequacy.
Ordinary work rejects missing/stale qualifications. Only an operator-enabled
`qualification` request can evaluate an unqualified model. Use the synthetic
suite in `fixtures/qualification/` twice per case; review every material claim,
evidence reference, abstention and proposed diff. Do not automatically approve a
profile from model completion or command exit status.

`fingerprint --profile-id <id>` prints the exact code/model/settings/profile/runtime
fingerprint. Record accepted task classes and review evidence in host config.
Code, prompt, model, runtime or relevant settings changes invalidate that record.
The coordinator records separate feedback with verdict, evidence, correction
count and verification time. Measure useful verified work, including review effort.

Jobs/results expire after 24 hours. Compact metrics expire after 30 days and are
capped at 100MB across service sessions. Routine prompts/source excerpts are not
persisted; transient results may contain proposed source changes. Keep runtime
storage private and ignored. Deliberately retain only reviewed synthetic/sanitized
evidence outside the temporary job store. Commit aggregate findings and regression
cases, not routine task transcripts.

## Opt-in OpenRouter evaluation

Local-only remains the shipped default. Enabling OpenRouter requires
`inferencePolicy: "approved-free-providers"` and an explicit `openrouter` block:

```json
{
  "apiKeyEnv": "OPENROUTER_API_KEY",
  "maxCostUsd": 0,
  "allowedRepositories": ["synthetic-fixtures"],
  "allowSuppliedSources": false,
  "dataCollection": "deny"
}
```

Register that repository ID with an exact fixture-file allowlist. Broader source
access is a separate owner decision. Each task also requires
`remoteDataConsent: true`; the qualification CLI requires the explicit
`--remote-data-consent true` flag. Neither consent grants access beyond host scope.

Use `examples/discover-openrouter.mjs <author/model:free>` from the installed
package for anonymous catalog discovery. Register a model with `provider:
"openrouter"`, a chosen `id`, and the returned `model`, `endpointId`,
`providerSlug`, `providerName`, `catalogFingerprint`, `contextTokens`, `outputMode`,
plus an explicit `temperature`. Add a profile referencing that ID. Discovery never
qualifies the model. Run with `--profile-id` when task classes overlap profiles.

The adapter checks exact endpoint identity, supported parameters and all advertised
prices before inference. Requests pin one provider with fallback disabled and zero
price ceilings. Returned usage and a generation receipt must establish zero cost
and the selected model/provider. Unknown pricing, missing proof or unavailable
routes fail; there is no paid or alternative-model fallback. Remote qualifications
expire within 24 hours and must be renewed after verification.

Create a key in the provider account, then set the configured environment variable
on the host. On Windows, this prompts without echoing the key or putting its value
in shell history:

```powershell
$workerKey = Read-Host "OpenRouter API key" -AsSecureString
[Environment]::SetEnvironmentVariable('OPENROUTER_API_KEY',
  [System.Net.NetworkCredential]::new('', $workerKey).Password, 'User')
Remove-Variable workerKey
```

User environment storage is not a credential vault. Restart the process launching
the connector so it inherits the value, or have a host-local launcher load it from
the User environment. Never copy the key into repository files, MCP arguments or
task payloads. The service reads only the named variable and does not log it.

Account privacy controls can block free endpoints even with a valid key. Review
the selected provider's terms before changing them; enabling free-model training
permits providers that may retain/train on inputs and outputs. OpenRouter's own
logging and product-improvement settings are separate. A denial must remain a
failure, never a reason for the service to weaken policy automatically.

NVIDIA Ultra's free endpoint is currently evaluation-only under its linked trial
terms; use synthetic non-confidential inputs. Successful evaluation does not
authorize using that trial endpoint or its outputs in production. Consult the
source-backed model record in `agents/orchestrators/routing/models/` in the
Orchestration repository before proposing adoption.

References, retrieved 2026-09-12:
[OpenRouter routing](https://openrouter.ai/docs/guides/routing/provider-selection),
[provider privacy](https://openrouter.ai/docs/guides/privacy/provider-logging),
[NVIDIA endpoint notice](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b:free).

## Commands and native integration

The isolated command adapter uses fixed reviewed executable/argument recipes,
an immutable snapshot copy and a scratch directory. No arbitrary model shell,
dependency installer, or recipe edits are exposed. Commands stay unavailable
until the exact runner fingerprint has passed real outside-read/write denial,
network denial, allowed scratch writes, deadlines and descendant cleanup probes.
Missing dependencies fail rather than trigger downloads. See
`examples/runner-permissions.toml`; this template is not proof of enforcement.

The runner retains a dedicated Codex state directory to avoid repeating setup.
Do not launch repeated elevated setup trials or copy the user's private sandbox
secrets. A preinstalled third-party testing sandbox is not automatically compatible
with Codex's runner. Keep commands disabled if enforcement or setup is unresolved.

Native standalone Ollama and mixed cloud-parent/local-child spawning are separate
compatibility experiments. Neither replaces MCP until it preserves the worker
contract and controls. No speculative provider shim is included.

Official references, retrieved 2026-09-12:
[MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli),
[Ollama Codex](https://docs.ollama.com/integrations/codex),
[Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox),
[permission profiles](https://learn.chatgpt.com/docs/permissions#common-profiles).
