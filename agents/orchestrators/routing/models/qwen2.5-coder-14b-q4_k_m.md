# Qwen2.5-Coder 14B Q4_K_M

Status: **candidate; not qualified**

Proposed identifier: `qwen2.5-coder:14b` through a local Ollama server. Record and
pin the actual digest during qualification; a mutable tag alone is insufficient
evidence.

## Source record

Sources retrieved 2026-09-12. Upstream license: Apache-2.0. The model card
publishes a 131,072-token context ceiling with additional long-context serving
configuration; this does not establish that context on the installed runtime.
The worker uses an explicit JSON action protocol rather than assuming native
function calling works. The active trial is limited to 8K context/2K generation.

Installed evaluation digest:
`9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849`.
Runtime: Ollama 0.33.2. Artifact: Q4_K_M. Qualification is separate from this
published capability record.

- [Qwen's instruction-model card](https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct)
  identifies the instruction-tuned 14B family member and describes code generation,
  reasoning and fixing as intended capabilities. These are upstream claims, not
  our qualification.
- [Ollama's tag page](https://ollama.com/library/qwen2.5-coder:14b) identifies the
  `qwen2.5-coder:14b` artifact as Q4_K_M and provides its local invocation.

The candidate is limited initially to draft code or patch proposals that a cloud
production coordinator can inspect and test. This record makes no claim about
usable context, throughput, correctness or role fitness on our hardware.
