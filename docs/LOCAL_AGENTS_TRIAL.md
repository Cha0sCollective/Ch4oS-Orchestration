# Worker rollout evidence

Trial date: 2026-09-12. Source packet: `codex/local-agent-service`, initially based
on `d52afebcdf2c721f3a1f383ee9c0f06ace950b1c`. This record distinguishes implementation,
model completion, verified answers and host isolation. See `CURRENT_WORK.md` for
the current candidate and remaining work.

## Installed local runtime

Node 24.19.0; Ollama 0.33.2; Codex CLI 0.154.0-alpha.6.2. The official Ollama
Windows archive SHA-256 matched its published release digest:
`2439cbea65310b1aadf7d8fc41d7faf5d033f920d42e00a476c58bf9bff6950e`.
Ollama runs on a dedicated loopback port with cloud disabled, one parallel
inference and one loaded model. `/api/status` confirmed cloud disabled. Candidate
weights and runtime state are outside Git and the implementation checkout.

| Model | Installed artifact | Initial settings |
| --- | --- | --- |
| qwen3.5:9b | Q4_K_M, digest `6488c96fa5faab64bb65cbd30d4289e20e6130ef535a93ef9a49f42eda893ea7` | thinking off, temperature 0.2 |
| qwen2.5-coder:14b | Q4_K_M, digest `9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849` | thinking off, temperature 0.2 |

The hardware has 32 GB system RAM and 16 GB RTX 4070 Ti SUPER VRAM. Both models
rejected oversized single-message input and oversized accumulated history with
`truncate:false`, `shift:false`, 8192 context and 2048 output tokens. This verifies
overflow behavior for the tested runtime/settings, not model task quality.

## Integration probes

| Path | Observed result | Limit |
| --- | --- | --- |
| Direct Ollama through WorkerService | Completed a bounded function summary with inspected file references | A smoke answer alone grants no qualification |
| Standalone Codex with explicit local provider | Correctly answered the synthetic strict-equality question; CLI exit 0; 5121 input / 112 output tokens | Shell tools disabled; fallback model metadata warning; no native tool or sandbox proof |
| Cloud parent to saved local child | Parent reported `spawn_agent` did not accept the requested `agent_type`; no child was spawned | Mixed-provider spawning remains unverified; this does not establish the cause of the reported bug |
| MCP stdio and newline CLI | Both exercise the same core and bounded error contracts in automated tests | Installed-host qualification is recorded separately |

The standalone probe used a process-local custom provider at the dedicated Ollama
loopback endpoint and left normal coordinator configuration unchanged. Its retained
session is `01a096da-563b-78d3-b772-843c03b7ed34`. The cloud-parent probe is
`01a096e1-4cfa-73e0-8719-f13183b33712`. Full synthetic outputs remain host-local.

## Initial quality evaluation

The version-2 prompt completed all 36 synthetic trials: two representative cases
and one ambiguity/adversarial case per task class, each repeated twice. Codex
review found material errors; no task class was promoted from this run.

- General-model exploration cited incorrect line numbers; research introduced
  unsupported claims about the failure log and overlooked visible source.
- Summaries sometimes omitted requested coverage or misdescribed a failing
  assertion. Triage incorrectly attributed a string-to-boolean result to strict
  equality instead of preserving uncertainty about the log's source revision.
- Coding-model transformations and drafts sometimes returned no proposed diff;
  malformed proposal headers were rejected by the service. A completed answer
  was not accepted as a completed transformation.
- Missing deployment/retry values generally prompted abstention. No command was
  executed and no source file was edited by these trials.

The version-3 protocol was then evaluated with the general model's thinking mode
enabled at temperature 0.6. All 24 trials completed in approximately 4.4 minutes.
Fresh independent review took approximately nine minutes and rejected all four
classes: reversed log interpretation, shifted citations and a non-applicable
proposal remained. Five of six summary trials were acceptable; the final hostile
case's citations were wrong, so summary eligibility was not granted.

The retained synthetic artifact SHA-256 is
`80088ea4646eeea19ddf6da2e34062d665fd78f0dcefe79a41ca0424425a26b9`.
Its implementation fingerprint is
`4ca53e7655652efad268d5f5eeb388ef9d5ec44b494d1ad5f3217c9fc010babb`
and profile qualification fingerprint is
`e2696030d64f8c21a6820fb85a0817c04a7d2068390694f1df2b447053e6e7c3`.
Those identities, not filenames or completion status, establish what was tested.

An intermediate artifact was mislabeled as thinking-enabled; its recorded settings
showed thinking off. A host setup error had applied thinking to the unsupported
coding model instead, producing HTTP 400 failures before inference. The host was
corrected by model ID. These runs grant no eligibility and are not counted as
capability failures of a correctly configured coding model.

The corrected coding model completed 12 version-3 trials in approximately 1.2
minutes, with thinking off and temperature 0.2. Independent verification took
approximately three minutes. Both transformation and draft classes were rejected:
all eight positive proposals failed applicability checks (wrong scoped headers,
hunk counts or hunk content). The four unknown-value cases appropriately abstained.
Artifact SHA-256:
`6d96351e101c4de4c8daec5fb7f37e01faab4db9e30653de92b91352472ad1c4`.
Profile fingerprint:
`186354dabdfe62119f241153ce4535eff04ae4e1ccc766d8256fd4ba97be353a`.
Both candidate profiles remain ineligible; no useful-work savings are claimed.

## Package and interface verification

Fresh independent review passed type checking and all 56 focused automated tests.
The versioned 0.1.0 package is installed outside the source checkout. Its built
implementation fingerprint matches the reviewed fingerprint above. The installed
MCP launcher negotiated successfully and exposed exactly the five worker operations;
its health report correctly withheld unqualified profiles and the command lane.
The launcher reads the owner's saved key from host-local environment storage;
no credential value appears in repository or connector configuration.

A synthetic inference task also completed through that installed MCP connection.
Duplicate submission returned the same job ID. Codex corrected one source-line
reference and recorded that assessment through `record_feedback`; model completion
was not treated as correctness. A second task was cancelled, and repeated
cancellation returned the same cancelled state. This proves the installed transport
path, not profile eligibility. The thinking-enabled general model separately
reconfirmed rejection of oversized single-message and accumulated-history input.

## Windows command boundary

The live canary permitted scratch writes and denied source/outside writes, but
allowed an outside-file read and a loopback connection. **The command runner is
unqualified and disabled.** No installer checks have been qualified through it.

Investigation found Codex sandbox users/group and installed firewall registry
entries, but the firewall API did not establish active enforcement. Windows
Sandbox payload files also exist; that does not prove they are the Codex backend.
The experimental `windows_sandbox_service` feature is disabled on this CLI.

Repeated setup prompts came with ephemeral runner state. The implementation now
retains a dedicated runner home, rejects unreviewed base configuration, denies
root reads in its template and requests network denial explicitly. These code
changes have unit coverage but have not passed another live canary. Ambient
managed configuration is not yet bound into runner qualification; that remains a
blocker before enabling commands. Do not resume setup/UAC trials or copy private
sandbox credentials as incidental testing.

## OpenRouter

The owner authorized free-model implementation during this packet and selected
`nvidia/nemotron-3-ultra-550b-a55b:free`. The public endpoint reports a one-million
token context and supports forced function calls, but not the JSON-schema response
mode used by some other candidates. The adapter supports both protocols behind
the same worker API and pins the endpoint's observed capabilities and zero pricing.

The owner saved a key in host-local environment storage; authentication succeeded.
Two synthetic smoke trials were blocked before inference by OpenRouter's account
privacy policy: no endpoint matched the Free model training setting. No account
privacy setting was changed. Only the three synthetic fixture files are on the
remote repository allowlist; supplied source transmission is disabled.

No remote model is qualified, and no paid inference or account purchase is
authorized. Remote contract tests do not count as live provider qualification.

The selected endpoint's linked NVIDIA API Trial Terms restrict it to internal
testing/evaluation and prohibit confidential or personal inputs. NVIDIA may log
inputs/outputs for security and model/product improvement. This route must remain
an evaluation candidate, even if it passes synthetic cases; production suitability
requires separately established service terms. See the source-backed model record.
