# Additional evaluation candidates

Sources checked 2026-09-12. These records guide experiments, not ordinary routing.
Record the installed digest/quantization or exact endpoint/catalog identity and
effective settings with every run. Model capability does not imply worker eligibility.

| Candidate | Intended comparison | Published interface / license |
| --- | --- | --- |
| Ollama `gemma4:12b`, Q4_K_M | First local alternative for evidence summaries | 11.9B, 7.6GB artifact; tools, thinking and image input; Apache-2.0. [Ollama](https://ollama.com/library/gemma4:12b) |
| Ollama `gpt-oss:20b` | Second local alternative for bounded reasoning/triage | Open-weight MoE; Apache-2.0. Requires `think: low/medium/high`, not a boolean. Start at medium, 8K context/2K output; qualify separately. [OpenAI](https://openai.com/index/introducing-gpt-oss/), [Ollama reasoning](https://docs.ollama.com/capabilities/thinking) |
| OpenRouter `nvidia/nemotron-3.5-lightning:free` | First remote alternative for turnaround time | 30B total/3B active, 1M context, tools/tool_choice; no response_format. Verify exact model license and NVIDIA endpoint terms before registration. [OpenRouter](https://openrouter.ai/nvidia/nemotron-3.5-lightning:free) |
| OpenRouter `google/gemma-4-31b-it:free` | Different-family source comparison | 30.7B dense, 256K context, text/image input, text output, tools; Apache-2.0. [OpenRouter](https://openrouter.ai/google/gemma-4-31b-it:free) |
| OpenRouter `cohere/north-mini-code:free` | Later explanations and proposed patches | Coding-oriented MoE, tool calls; validate endpoint parameters and upstream license before registration. [OpenRouter](https://openrouter.ai/cohere/north-mini-code:free) |

Download size is not working memory. Measure each local configuration on the host;
temporary game memory usage is not a model suitability finding. Preserve vendor
reasoning and sampling recommendations as source material, then record chosen
settings explicitly rather than applying Qwen settings to every model.

Use the same real-work cases for meaningful comparisons. A GUI answer does not
qualify a worker profile. Free availability and supported parameters can change;
the service must verify them rather than relying on this dated table.

## Local image candidate

FLUX.2 Klein 4B distilled supports text-to-image and reference-image editing,
is Apache-2.0, and publishes approximately 13GB VRAM requirements. Evaluate through
the official ComfyUI workflow, separately from Ollama jobs. Record the ComfyUI
build, workflow, all model files, sampling settings and seed. Judge useful concepts,
icons and artwork visually; inspect pixel grids, alpha and tiling separately before
game use. This is a manual image pilot, not a text-worker qualification.

[Model card](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B),
[official workflow](https://docs.comfy.org/tutorials/flux/flux-2-klein).
