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
verified. The owner confirmed the Free model training privacy setting is enabled
and saved, and explicitly requested retrying the synthetic fixtures. Host data
collection permission is enabled only behind the synthetic repository allowlist;
supplied source transmission remains disabled. NVIDIA's latest summary evaluation
produced five correct answers and one provider failure; no eligibility was granted.

The Node 24 package under `tools/local-agents/` implements a shared core behind
MCP stdio and CLI. Version 0.1.2 is installed independently of this checkout and
the `ch4os-local-agents` connector is registered. Installed MCP inference,
idempotency, feedback and cancellation were exercised. Independent implementation
review passed; 65 tests pass. Evidence and exact fingerprints are in
LOCAL_AGENTS_TRIAL.md. Remote profile limits are 256K context / 128KiB serialized
input; local profiles retain their verified 8K / 16KiB limits.

The original corrected Qwen evaluations rejected every tested class. With numbered
evidence in 0.1.2, the local summary rerun still omitted a required behavior and
citation in one answer. No profile is eligible for ordinary work. Reviewed
aggregates and artifact identities are under agents/orchestrators/routing/qualifications.
Trust recorded settings and fingerprints, not filenames. NVIDIA remains
an evaluation candidate. The owner clarified the intended use is personal modding
evaluation; inspect endpoint terms and data scope for each proposed assignment.
The sandbox command lane remains disabled after failed isolation probes; do not
resume UAC/setup trials incidentally. See LOCAL_AGENTS_TRIAL.md for evidence.

The approved scope includes preparing separately reviewed adoption changes for
Create-Ch4oS and Ch4oS-Installer after the local pilot. Use manual copying and
preserve target-local guidance and unrelated work. Merge, publication and live
operation remain subject to the existing target gates.

Prepared adoption worktrees live under the host tools directory's
`adoption/Create-Ch4oS` and `adoption/Ch4oS-Installer`, both on
`codex/local-worker-adoption`. Create candidate: `43cce26b9fb429bb0dcb226f39db66f932aec175`;
Installer: `ac0079a8c904b1e325fc0a2abfe317db1bf9fb19`. Their incremental adoption
records pin canonical source `b5f6d97796afc28809f2f59bd66d5867bbff0876`.

Both adoption commits passed independent review; their merge/publication gates
remain with the owner. The OpenRouter dated endpoint/native-token receipt mismatch
is fixed. Source candidate `d1998fa54e3a22668fe0ab8409a8af8e7b7721fa` passed
independent review. Next bounded action: investigate NVIDIA's missing completion
responses and local summary omissions, then rerun affected cases after a justified
change. Keep ordinary workers unavailable until qualification passes; repeated
sampling alone does not establish reliability.
Do not infer permission to transmit private sources.
No issue/PR has been opened and no merge or publication has occurred in this packet.
