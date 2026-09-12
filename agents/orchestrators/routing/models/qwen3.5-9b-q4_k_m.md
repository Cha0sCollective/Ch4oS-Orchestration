# Qwen3.5 9B Q4_K_M

Status: **candidate; not qualified**

Proposed identifier: `qwen3.5:9b` through a local Ollama server. Record and pin the
actual digest during qualification; a mutable tag alone is insufficient evidence.

## Source record

Sources retrieved 2026-09-12. Upstream license: Apache-2.0. The model card
publishes 262,144 native context tokens, optional extended context, and tool-use
examples. Thinking is enabled by default upstream. Our 8K context/2K generation
trial is deliberately much smaller than its published serving recommendations;
only observed bounded-task results can establish suitability at these limits.

Installed evaluation digest:
`6488c96fa5faab64bb65cbd30d4289e20e6130ef535a93ef9a49f42eda893ea7`.
Runtime: Ollama 0.33.2. Artifact: Q4_K_M. Keep changing trial settings and
acceptance results in qualification records rather than treating this model card
as an executable profile.

- [Qwen's model card](https://huggingface.co/Qwen/Qwen3.5-9B) identifies
  Qwen3.5-9B as a post-trained 9B causal language model with a vision encoder and
  describes tool-use serving. These are upstream claims, not our qualification.
- [Ollama's tag page](https://ollama.com/library/qwen3.5:9b) identifies the
  `qwen3.5:9b` artifact as Q4_K_M and provides its local invocation.

This record makes no claim about usable context on our hardware, throughput,
reliability, coding quality, tool correctness or fitness for a project role. The
qualification package must establish those properties for the exact local artifact
and runtime before routing work to it.
