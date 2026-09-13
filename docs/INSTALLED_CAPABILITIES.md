# Installed tools: quick guide

Updated 2026-09-12. Trials are paused at the owner's request. These tools are
installed on this PC; applications, weights, keys and personal history stay outside Git.

| Installed | Access | What it does / current status |
| --- | --- | --- |
| **Ollama 0.33.2** | Cherry Studio, Ollama CLI, or `http://127.0.0.1:11435` | Runs local text models. Cloud use is disabled. |
| **Qwen3.5 9B** and **Qwen2.5-Coder 14B**, Q4_K_M | Select `qwen3.5:9b` or `qwen2.5-coder:14b` in Ollama/Cherry | General research/summaries and code explanations/drafts, respectively. Available through the CLI, MCP and Cherry. |
| **Gemma 4 12B**, Q4_K_M | Select `gemma4:12b` | Local summaries and source understanding. Passed the earlier summary cases; no qualification is required to use it. |
| **GPT-OSS 20B**, MXFP4 | Installed as `gpt-oss:20b` | Local reasoning model. Latest small CLI task succeeded; an earlier run had a CUDA startup failure. |
| **Worker service 0.1.7** | Codex MCP connector **`ch4os-local-agents`**, or its CLI | Scoped file listing, reading/search, summaries, comparisons, triage and proposed changes. Returns cited structured results; never applies patches. Commands are disabled. |
| **OpenRouter / NVIDIA Nemotron 3 Ultra free** | Worker service; manual Cherry preset `nvidia/nemotron-3-ultra-550b-a55b:free` | The exact pinned model can do configured ordinary work without qualification. Free-only endpoint checks, repository scope, explicit data consent, limits and result verification remain required. The configured Lightning and remote Gemma profiles also require no qualification. No automatic fallback is used. |
| **Cherry Studio 2.0.14** | Windows Start menu or launcher below | Chat with local/OpenRouter models yourself. Provider setup is still manual: Ollama endpoint above, existing inference key for OpenRouter, exact free model IDs, local naming/translation helpers. Direct chats do not inherit worker scope or price enforcement. |
| **ComfyUI 0.35.0 + FLUX.2 Klein 4B FP8** | Launcher below, then `http://127.0.0.1:8188` | Local image generation and reference-image edits for icons, item/block concepts and pack artwork. Generation/editing worked. Inspect pixel size, transparency and seams before game use. |
| **Bounded web search** | Separate **`ch4os-web-search`** MCP/CLI; connector currently **disabled** | One Exa search per explicit request, separate key, $5 non-resetting cap. Two smoke attempts failed; last checked actual spend $0.007. No automatic paid retries. |

For a click-by-click image walkthrough, see **[Make an image locally](LOCAL_IMAGES.md)**.

## Open the applications

From this repository's root in PowerShell, this PC's host-tools folder is the
sibling `.ch4os-tools` directory:

```powershell
$tools = Join-Path (Split-Path (Get-Location).Path -Parent) '.ch4os-tools'
.\tools\model-playground\Start-Playground.ps1 -InstallRoot $tools -Application Ollama
.\tools\model-playground\Start-Playground.ps1 -InstallRoot $tools -Application Cherry
# For images, idle local text-model jobs first:
.\tools\model-playground\Start-Playground.ps1 -InstallRoot $tools -Application Comfy
```

The [playground instructions](../tools/model-playground/README.md) cover Cherry
settings and queuing the supplied FLUX preset. Image files are under
`<host-tools>/comfy/0.35.0/ComfyUI_windows_portable/ComfyUI/output`.
Reproducible setup is provided; full application-data portability is not established.

## Cherry's first-run model choices

Set **Assistant/default** to **Ollama → `gemma4:12b`**; set both **Quick model**
and **Translate model** to **Ollama → `qwen3.5:9b`**. These are manual-use choices;
translation has not been evaluated. Refresh Ollama's model list if they are absent.
Use NVIDIA only when you explicitly select its OpenRouter chat preset.

## Using the workers from Codex

For tested Nemotron commands, credential loading, a runnable task and failure
diagnosis, see **[Use Nemotron](NEMOTRON.md)**.

Ask Codex to inspect `ch4os-local-agents` capabilities before delegation. Its five
operations are **capabilities**, **start_task**, **get_task**, **cancel_task**, and
**record_feedback**. Codex supplies scope and budgets, checks evidence, and decides
what to integrate. Use `availableTaskClasses` to select work and inspect
`qualificationRequired`; `qualifiedTaskClasses` reports evidence only. The current
Nemotron profiles are `remote-analyst` for `summary` and `remote-comparison` for
`research`. Submit either in ordinary `work` mode with bounded paths and
`remoteDataConsent: true`. Both report `qualificationRequired: false`; missing,
stale, expired or withdrawn qualification records do not affect their eligibility.
The endpoint remains free-only and pinned, and every result still needs Codex
verification. All installed model profiles are available without qualification; provider availability and actual runtime errors are reported separately.

Jobs and results for the installed models have no age-based expiry. Count and storage-size bounds still apply.

Create-Ch4oS and Installer have refreshed **prepared adoption changes**, not merged
deployment. Their main checkouts retain their existing guidance. Trials, further
qualification for other models, supervised pilots and search activation are
paused; nothing here authorizes a merge or changes the coordinator/reviewer roles.

## Use the other installed models

Use the same CLI setup and task example in [NEMOTRON.md](NEMOTRON.md), changing
`profileId` and `taskClass` as below. Use `mode: "work"` and select a registered
repository plus the files for the assignment. Local tasks need no OpenRouter key
or remote consent; OpenRouter tasks use the existing key and `remoteDataConsent: true`.

| Model | Profile | Task class |
| --- | --- | --- |
| Qwen3.5 9B | `local-analyst` | `exploration`, `research`, `summary`, `triage` |
| Qwen3.5 9B (summary only) | `local-summary` | `summary` |
| Qwen2.5-Coder 14B | `local-drafter` | `draft`, `transformation` |
| Gemma4 12B local | `gemma-summary` | `summary` |
| GPT-OSS 20B local | `gptoss-summary` | `summary` |
| Nemotron Lightning free | `lightning-comparison` | `research` |
| Gemma4 31B free | `gemma-comparison` | `research` |

From MCP: `start_task` with those fields, then `get_task` using its job ID. From CLI:
`node $workerCli run --config $hostConfig --request $requestPath`. The linked setup
shows how to create that JSON request. No qualification runs or renewal steps are
needed. Draft workers return proposed diffs; Codex or you applies them.

For direct local chat, set `$env:OLLAMA_HOST = "http://127.0.0.1:11435"` and run
`& (Join-Path $hostTools "ollama/0.33.2/ollama.exe") run gemma4:12b` (substitute any
installed local model name). Cherry provides the same manual model selection.
Latest one-task CLI check: Qwen3.5 passed (13s), Qwen2.5-Coder passed (9s),
local Gemma passed (13s), GPT-OSS passed (31s), and Lightning passed (20s, $0).
Remote Gemma reached OpenRouter but returned HTTP 429. No automatic retries were
made. These are connectivity/task-completion checks, not general quality claims.
