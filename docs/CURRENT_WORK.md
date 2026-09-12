# Current work

The approved active packet is the local-agent service roadmap in
[LOCAL_AGENTS_ROADMAP.md](LOCAL_AGENTS_ROADMAP.md). Work is ongoing on branch
`codex/local-agent-service`, based on `d52afebcdf2c721f3a1f383ee9c0f06ace950b1c`.
Before continuing, verify the actual branch, `HEAD`, dirty state and work item;
this pointer does not assert that the implementation is complete or runtime-ready.

Delivery order is foundation/install, native host probes, shared core and MCP/CLI,
sandbox/cancellation checks, model qualification and independent review, then
reviewed adoption. On 2026-09-12 the owner additionally authorized OpenRouter
implementation for free models. Keep local-only as the default; remote work needs
explicit endpoint selection, zero-price enforcement, qualification and data consent.
The owner saved an API key in host-local environment storage; authentication was
verified. The selected NVIDIA Ultra free endpoint is blocked by the account's
Free model training privacy setting. Changing that account-wide setting awaits
the owner's choice. Only synthetic fixture data is authorized for these trials.

The Node 24 package under `tools/local-agents/` implements a shared core behind
MCP stdio and CLI. Version 0.1.0 is installed independently of this checkout and
the `ch4os-local-agents` connector is registered. Installed MCP inference,
idempotency, feedback and cancellation were exercised. Independent implementation
review passed 56 tests; evidence and exact fingerprints are in LOCAL_AGENTS_TRIAL.md.

The corrected Qwen general and coding evaluations completed 36 trials. Independent
review rejected every class for material citation/interpretation errors or invalid
diffs; neither profile is eligible for ordinary work. An earlier artifact was
mislabeled: trust recorded settings and fingerprints, not filenames. NVIDIA remains
an evaluation candidate. The owner clarified the intended use is personal modding
evaluation; inspect endpoint terms and data scope for each proposed assignment.
The sandbox command lane remains disabled after failed isolation probes; do not
resume UAC/setup trials incidentally. See LOCAL_AGENTS_TRIAL.md for evidence.

The approved scope includes preparing separately reviewed adoption changes for
Create-Ch4oS and Ch4oS-Installer after the local pilot. Use manual copying and
preserve target-local guidance and unrelated work. Merge, publication and live
operation remain subject to the existing target gates.

Next bounded action: finish the separate adoption review and, once the owner
confirms the privacy setting is saved, retry the selected NVIDIA endpoint on the
three synthetic fixture files. Do not infer permission to transmit private sources.
No issue/PR has been opened and no merge or publication has occurred in this packet.
