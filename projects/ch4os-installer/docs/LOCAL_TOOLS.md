# Local tools

The host has optional local text and image tools. The `ch4os-local-agents` MCP
connector runs worker service 0.1.6. Host qualification and commands are disabled.
The exact NVIDIA Nemotron 3 Ultra free profiles need no qualification:
`remote-analyst` handles summaries and `remote-comparison` handles research in
ordinary `work` mode when those task classes appear in `availableTaskClasses`.
Remote repository scope, explicit data consent, free-only pinning, limits and Codex
verification remain required. Nemotron Ultra jobs/results have no age-based expiry
but retain count and storage-size bounds. Other profiles still require qualification
and keep the 24-hour job/result lifetime. An
earlier local Gemma summary run scored 6/6; that is historical evidence only.

Cherry Studio 2.0.14 provides manual chat without Codex. Its initial selectors use
`gemma4:12b` by default and `qwen3.5:9b` for Quick Assistant and translation through
local Ollama. ComfyUI 0.35.0 with FLUX.2 Klein 4B FP8 generates and edits local
images without Codex. Inspect dimensions, transparency and seams before game use.

The paid-search MCP is registered but disabled after failed smoke attempts. Do not
retry it automatically. Trials and further qualification are paused.

For launch instructions, exact model names, access routes, limits and current
status, open `docs/INSTALLED_CAPABILITIES.md` in the Ch4oS-Orchestration repository.
For the no-Codex image workflow, open `docs/LOCAL_IMAGES.md` there and use
`tools/model-playground/flux-klein-ui.json`. Those canonical guides own the details;
this portable copy intentionally contains no machine-specific paths.
