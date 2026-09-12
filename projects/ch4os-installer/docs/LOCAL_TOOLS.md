# Local tools

The host has optional local text and image tools. The `ch4os-local-agents` MCP
connector runs worker service 0.1.4. No worker profile is currently qualified, and
host qualification and commands are disabled. Do not assign ordinary work
automatically. An earlier local Gemma summary run scored 6/6; that is historical
evidence, not a new qualification for the installed service.

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
