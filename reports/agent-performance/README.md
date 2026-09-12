# Agent-performance reports

This directory keeps small, privacy-safe usage snapshots that may help us understand how work was routed across projects. It is reporting data, not orchestration policy and not a scorecard for agents or people.

Each snapshot retains only aggregate or per-request token metrics, the reported model and reasoning effort, request counts when the source recorded them, and UTC timestamps. Input tokens include cached input; cached input is therefore a subset of input. Reasoning tokens are a subset of output. Totals count repeated supplied context once for every request, so they are not unique words of work.

Do not infer dollar cost, account-limit consumption, quality, productivity, or avoidability from this telemetry alone. Reports must not contain prompts, tool output, command text, session or turn identifiers, credentials, local paths, sandbox details, or raw sessions.

## Project indexes

- [Create: Ch4oS](create-ch4os/README.md) contains the canonical cross-project snapshots for pack work and coordinated installer work.
- [Ch4oS-Installer](ch4os-installer/README.md) links to the applicable canonical snapshot. It does not copy shared coordinator work, so totals are not double-counted.

`sanitize-agent-usage.ps1` is a deliberately small allowlist transformer for the two recorded source shapes. Use it only to make a reviewed sanitized snapshot; it is not a reporting framework. Check the generated diff before adding a new snapshot.
