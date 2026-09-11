# Initial adoption trial

2026-09-11. These are behavioral checks of the initial roles; configuration discovery and acceptance are separate.

| Trial | Result |
| --- | --- |
| Terra/medium explorer, fresh context | Located the design on `orchestration/foundation` at `341ebfd`, distinguished the substantive design at `f6ed1d7` from the later user-added `test` file, and identified stale pre-Phase-3 adoption instructions. No source edits. |
| Sol/high reviewer, fresh context | Independently reproduced the accepted-base CRLF catalog mismatch and found no functional defect in candidate `7737352e5122070704f49b2dd112f82747fddae8`. Executed the candidate regression class with JDK 21 against the actual Windows resource; accepted LF/CRLF and rejected content/format drift. |
| Wrong-revision validation control | Reviewer rejected successful run `34639689202` at base `0d20803` as proof of descendant `7737352`; the base Linux workflow also did not exercise the Windows CRLF case. |
| Documentation reconstruction | Reviewer found current-status claims still describing already-merged Phase 3 as unapproved. Those need updating during Lab adoption/remediation. |
| Permissions | The delegated runtime inherited workspace-write. No-edit behavior was instruction-enforced; ignored disposable build output was created, tracked source remained unchanged. A custom read-only default must not be described as enforced under a parent override. |

The known broken base serves as the defect control, and the corrected candidate as the clean control. This small trial establishes useful behavior, not a general model-quality certification. The reviewer could not initialize Gradle's Windows native DLL in its sandbox and used direct Java regression execution instead; full candidate CI is still needed.

Canonical custom agent format was checked against [the official subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents) and installed CLI help. Model identifiers were available on the host and exercised by these trials.

## Installed profile discovery limitation

A bounded fresh run of installed `codex-cli 0.153.4`, with the project files present and a read-only parent, could not select either custom agent: its exposed spawning interface had no custom-profile selector. It stopped without substituting built-in agents or injecting profile instructions. This does not establish whether the underlying configuration parser loaded the files; it establishes that named activation was unavailable through that session's tools.

The TOMLs are prepared definitions, not verified active profiles. Continue using explicit model/effort routing and bounded role instructions as demonstrated above. Do not claim named-profile adoption complete until the installed host can select them and its effective behavior is checked. The instructions and archive policy can be adopted independently; this compatibility limitation does not require changing application behavior or expanding permissions.
