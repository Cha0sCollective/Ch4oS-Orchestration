# Model playground

This directory records a reproducible Windows setup for two host-local tools:

- Cherry Studio 2.0.14 for manual model comparison;
- ComfyUI 0.35.0 with FLUX.2 Klein 4B for a manual image pilot.

For everyday use, start with [Make an image locally](../../docs/LOCAL_IMAGES.md).
`Open-Local-Images.cmd` opens the installed local interface without Codex.
`flux-klein-ui.json` is the matching visual workflow; `flux-klein-api.json` is for
programmatic requests. Neither requires a cloud image service.

The applications, model weights, credentials, generated images, and routine
history stay outside Git. `releases.json` pins the installers and image-model
files used by this setup. Portability here means another host can repeat the
install from those pins; it does not mean copying an installed runtime or its
user profile.

## Install and launch

Choose a host-tools directory outside any Git worktree and use the same value for
`InstallRoot` in later commands. The install scripts download only the releases
and weights listed in `releases.json`, verify SHA-256 hashes, and refuse to
overwrite an existing target.

```powershell
$installRoot = Read-Host 'Host tools directory'
.\tools\model-playground\Install-Playground.ps1 -InstallRoot $installRoot -Application Cherry
.\tools\model-playground\Install-Playground.ps1 -InstallRoot $installRoot -Application Comfy

$models = Join-Path $installRoot 'comfy\0.35.0\ComfyUI_windows_portable\ComfyUI\models'
.\tools\model-playground\Install-ImageModels.ps1 -ModelsRoot $models
```

The launcher performs no downloads or elevation. Cherry opens as a normal
desktop application. ComfyUI starts as a hidden background process, listens only
on `127.0.0.1:8188`, passes `--disable-all-custom-nodes`, and writes stdout,
stderr, and its PID beneath `<host-tools>\state`.

```powershell
.\tools\model-playground\Start-Playground.ps1 -InstallRoot $installRoot -Application Cherry
.\tools\model-playground\Start-Playground.ps1 -InstallRoot $installRoot -Application Comfy
# Existing Ollama installation (no download):
.\tools\model-playground\Start-Playground.ps1 -InstallRoot $installRoot -Application Ollama
```

After starting ComfyUI, open `http://127.0.0.1:8188` in a browser. Keep ComfyUI
image generation separate from local LLM workloads: stop or idle Ollama model
jobs before a FLUX run and do not use image-pilot results as text-worker
qualification evidence.

## Cherry Studio manual configuration

Cherry Studio 2.0.14 configuration remains a manual UI task. Store credentials
only in Cherry's host-local UI or the user's host credential storage; never put
keys or an exported Cherry profile in this repository.

Configure and inspect these settings in the UI:

For Cherry's initial model selectors, use:

| Selector | Provider and model |
| --- | --- |
| Assistant/default model | Ollama — `gemma4:12b` |
| Quick model / Quick Assistant | Ollama — `qwen3.5:9b` |
| Translate model | Ollama — `qwen3.5:9b` |

These are manual-use starting choices, not qualification claims. In particular,
translation quality has not been evaluated. Refresh the Ollama model list if the
selectors are empty. No API key is needed for the local Ollama connection.

1. Add the local Ollama provider at `http://127.0.0.1:11435`. Keep Cherry Cloud
   disabled, and disable every other remote provider except the explicit
   OpenRouter comparison preset below.
2. Add an OpenRouter preset whose model is exactly
   `nvidia/nemotron-3-ultra-550b-a55b:free`. Do not use an automatic model alias,
   fallback list, or automatic routing.
3. Set Quick Assistant, topic naming, and translation to an explicitly selected
   local Ollama model. Check each auxiliary selector after changing the primary
   chat model; none may silently inherit the remote model.
4. Leave GUI web search disabled. The separately approved paid web-search key and
   budget do not authorize paid GUI inference or auxiliary calls, and no Cherry
   web-search configuration has been reviewed yet.

Before relying on this configuration, manually audit a clean session and record
screenshots or equivalent evidence for the selected provider/model and every
auxiliary selector. The following claims are still pending and must not be
inferred from installation alone:

- that direct GUI requests are constrained to the exact free endpoint;
- that credentials and provider settings persist in an acceptable host-local
  store;
- that the setup can be reproduced from these instructions on another host.

Cherry's optional MCP support may later expose a local outer-model tool, but that
path has not been tested and is not part of this setup.

## ComfyUI FLUX.2 Klein pilot

`flux-klein-api.json` is an API-format preset for the pinned FLUX.2 Klein model,
text encoder, and VAE. It uses the built-in nodes only, four Euler steps, CFG 1,
a 1024-by-1024 latent, seed 42, and a sample icon prompt. Copy it to a scratch
location or alter the parsed object in memory for each run; keep generated output
and run records outside Git.

The API preset can be queued after the local server is ready:

```powershell
$prompt = Get-Content -Raw .\tools\model-playground\flux-klein-api.json | ConvertFrom-Json
$prompt.'74'.inputs.text = '<prompt>'
$prompt.'73'.inputs.noise_seed = 42
$body = @{ prompt = $prompt } | ConvertTo-Json -Depth 100
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8188/prompt' -ContentType 'application/json' -Body $body
```

This committed preset records a starting point, not a validated visual workflow.
For each candidate, retain the ComfyUI version, preset revision, model hashes,
prompt, dimensions, sampling settings, seed, and output. Inspect the image at its
actual game size and on a visible pixel grid. Check the alpha channel directly;
a background that looks transparent is not proof of transparency. For tileable
assets, repeat the image in at least a 3-by-3 grid and inspect every horizontal
and vertical seam. Review readability, silhouette, palette, and unwanted text
before accepting an icon or texture.

Installation and launcher parsing can be automated, but visual acceptance,
transparency, pixel-grid quality, and seamless tiling remain manual checks.
