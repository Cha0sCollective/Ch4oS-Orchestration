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

Independent review passed source commit `b5f6d97796afc28809f2f59bd66d5867bbff0876`
and the two separate guidance-only adoption candidates:
Create `43cce26b9fb429bb0dcb226f39db66f932aec175` and Installer
`ac0079a8c904b1e325fc0a2abfe317db1bf9fb19`. Each preserves prior target guidance,
changes exactly four documentation files and records canonical/effective hashes.
Neither candidate has been merged or published.

A read-only fresh-context agent received only the startup prompt and repository
access. It recovered the actual source branch/revision/clean state, located both
adoption worktrees, correctly withheld unqualified workers and identified the
next authorized action and owner gates. It found missing adoption references in
the pointer; those references and incremental target records were then added.
The exercise establishes reconstruction from durable state, not autonomous
authorization of new product work or live issue/PR verification.

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

The owner subsequently confirmed that the privacy setting was enabled and saved,
and authorized retrying the synthetic fixtures. A live completion then reported
zero cost and the requested Ultra model. The adapter rejected the result because
router metadata names the dated serving model while the top-level response names
the public model slug. This is an adapter compatibility failure, not a model-quality
failure. Version 0.1.1 corrected the exact catalog-bound dated identity mapping.

Version 0.1.1 corrects that identity mapping, compares native provider token counts
with completion usage, and polls temporarily missing generation receipts with a
fixed 14.7-second wait schedule under the original task deadline. Inference is
never retried by that polling. Fresh independent delta review passed, and all 59
focused tests passed. The installed 0.1.1 build matches implementation fingerprint
`1a27e582a825abebef3239131150bb6d22f16a76b73b5659ae48d99e5447f4d9`.
Its MCP connection negotiated all five operations and admitted the pinned NVIDIA
endpoint's health while withholding qualification.

The first 8K summary trial hit the conservative context guard after obtaining file
evidence. That run was stopped; no qualification was granted. A fresh six-trial
summary evaluation at 16K context / 2K output completed three jobs. Independent
review accepted both log summaries, but the completed hostile-document summary
cited lines 7-9 for a claim supported by line 10. Three other trials failed with
`provider_error`. Thus only two of six trials fully passed; summary eligibility
was rejected. Provider failures do not establish inadequate model reasoning.

The retained synthetic artifact is `nvidia-summary-v011-16k.json`, SHA-256
`38ee3d04a63630ca7079fd0a432772013d4c9cae74c6d4fe43e6011562b0b1ef`;
its qualification fingerprint is
`72020bca45e753a29981855a0fe0d411bbbe3ad958f5b9327f159f8a86024c8c`.
It records six accepted generations with Nvidia provider identity and zero cost.
Raw receipt fields and failed response messages are not retained in that artifact;
receipt-validation claims rely on the fingerprint-bound adapter and its tests.
Earlier local evidence remains bound to its original 8K settings.

Version 0.1.2 adds per-profile limits and numbered evidence excerpts. Independent
source review passed, type checking passed and all 65 focused tests passed.
Its installed implementation fingerprint matches
`940ac453f9e2813f7572d61e5fe79146ac0ed4e78715f2602c6c0f09cf6a5dba`.
The installed MCP connector negotiates all five operations and reports available
health for both local models and the pinned NVIDIA endpoint, with no qualification.
The host now permits 262144 context tokens / 131072 complete serialized input
bytes for NVIDIA and retains 8192 / 16384 for both local profiles. The conservative
remote byte-to-token overflow guard remains; budgets are separate from actual
provider token counters. Changing effective limits requires qualification rather
than assuming quality transfers to smaller or larger contexts.

The 0.1.2 NVIDIA rerun produced five correct answers and one provider failure in
six trials (510156 ms total). All completed answers used correct evidence; the
failed hostile-input repetition prevents summary qualification. The six local
summary repetitions all completed, but one code summary omitted strict-boolean
acceptance and a citation for `enabled`. Neither candidate qualifies. Exact
profiles, artifact hashes and counters are in the
[summary aggregate](../agents/orchestrators/routing/qualifications/2026-09-12-summary-v012.json).
These small fixtures do not establish large-document quality. A separately
reviewed offline regression admits an input above 64KiB and rejects an input above
the serialized 128KiB ceiling before an inference POST; the focused provider suite
passes 12/12. This test-only addition leaves the installed runtime fingerprint
unchanged. The next investigation should address the observed provider failures
and omissions, without repeatedly sampling until a favorable pass appears.

No remote model is qualified, and no paid inference or account purchase is
authorized. Remote contract tests do not count as live provider qualification.

The selected endpoint's linked NVIDIA API Trial Terms restrict it to internal
testing/evaluation and prohibit confidential or personal inputs. NVIDIA may log
inputs/outputs for security and model/product improvement. This route must remain
an evaluation candidate, even if it passes synthetic cases; production suitability
requires separately established service terms. See the source-backed model record.
