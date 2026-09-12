# Agent adoption trials

The September 11 results below are retained as historical evidence. The September 12 readiness trial records the selected retained-CLI workflow and its remaining gates; do not treat the initial profile-discovery limitation as a claim about every later host run.

## Initial behavioral trial

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

At that trial's conclusion the TOMLs were prepared definitions, not verified active profiles. Explicit model/effort routing with bounded role instructions was the available fallback, not proof of named activation. The instructions and archive policy could be adopted independently of that compatibility limitation.

## Windows readiness trial, September 12

Status: **the selected retained-CLI workflow is ready on this Windows host**. All required checks and fresh independent evidence/documentation review passed. Scope is Orchestration guidance and disposable fixtures; target adoption remains a separate reviewed change. Create-Ch4oS, Ch4oS-Installer, the original Contraption Lab checkout and the uncommitted pack-explorer specification are preserved. The experiment specialist remains future work.

### Identity and setup

- Host: Windows, installed `codex-cli 0.154.0-alpha.6.2`; production coordinators use `gpt-6-astra` / medium.
- Canonical specifications: Orchestration `bb8a0dacb2a033e3a01aabd0b56c70d585c434c7`, branch for this work `codex/agent-readiness-trial`. Both shared TOMLs remain byte-for-byte unchanged.
- SHA-256 `repo-explorer.toml`: `a42f7f80d18d94fd837b1f3cdd2d2e4ca489cd682208b7ff2f8a3eb0c1f875c2`.
- SHA-256 `independent-reviewer.toml`: `fc2ae40b07e207166b6a2b8e374ff66280ac2dd568ed16f56c88d91d76180c06`.
- Broken control: `0d20803f8bc00f9fbda35c934f5b64c01d84c7e2`; corrected candidate: `7737352e5122070704f49b2dd112f82747fddae8`. A local clone with independent Git objects and two disposable detached worktrees used `core.autocrlf=true` to preserve the Windows resource case. The build fixture uses an exact Git archive of the corrected revision.
- Original states: pack `19a96a10289c3b939dc4aa3a065794019de96e27` with only the untracked pack explorer TOML; installer `829fc1620cf78e4238fc559eadee2abbae2768d9` clean; Lab `31ea074ab3e1dccf34f9edaf3e41b9de5f2bd4bd` clean. Tracked-file SHA-256 inventories, Git status and the pack trial TOML hash were recorded before testing.

Local evidence is retained under `C:/Users/Parker/Documents/Repos/Ch4oS-Agent-Readiness-20260912` (control workspaces, prompt files, JSONL logs, command arrays, sanitized host metadata, independent canary read-backs and source inventories), `C:/Users/Parker/Documents/Repos/Ch4oS-Agent-Readiness-Gradle-20260912` (initial archive, scripts, isolated caches and `evidence/` logs), and `C:/Ch4oS-Agent-Readiness-Gradle-20260912` (corrected sandbox build location and receipts). These are trial locations, not repository dependencies. Session metadata receipts omit conversation instructions and credentials; third-party JARs and generated output are not committed.

### Native activation and lifecycle

Desktop launched retained CLI parents with `exec --cd <control> --sandbox read-only --json -c agents.enabled=true -c model_reasoning_effort="medium" --output-last-message <result> -`. Prompts arrived on stdin. A process-local `projects.<lowercase absolute control path>.trust_level="trusted"` override allowed the audited fixture's saved profiles to be discovered; no global trust change was made. See [the exact argument construction](RETAINED_CLI_WORKFLOW.md).

The initial new-fixture parents `01a094c4-a720-7db2-8cff-56a64d71cb26` and `01a094c5-7b47-78f2-b303-b453f7c6524e` exposed no native selector and stopped without substitutes. Incorrectly quoting the trust-key path also failed (`01a094c6-d654-7b00-9d40-0b6a66b81e82`); enabling `multi_agent_v2` did not repair discovery (`01a094c8-9f4c-7340-b408-4426796f536b`). Correcting the dotted-key syntax restored selection without that feature override or wider sandbox permissions. Those failed runs remain in the evidence.

Native review parent: `01a094c9-fd12-7963-853e-11fe87f18cbc`. Its native `spawn_agent` records select exact saved `agent_type` names with `fork_turns="none"`. Explorer child `01a094ca-1b48-7e72-b349-6b474bf80d5d` (`/root/catalog_map`) has host-recorded `repo-explorer`, Terra/medium and read-only runtime. It identified the actual candidate and regression entry point. A bounded follow-up to that same child verified `com.chaosarbiter.contraptionlab.capability.CapabilityCatalogValidationTest`; a subsequent running follow-up was interrupted, recorded `turn_aborted` / `interrupted`, and a final follow-up completed. Final child enumeration and host terminal events confirm all three children completed; the retained parent exited 0.

| Fresh named reviewer | Checked scope | Result |
| --- | --- | --- |
| `01a094cc-47fe-7ab2-a3b3-34f1a6f21026` / `candidate_a_review` | Broken control, bootstrap/resource validation | P1 finding at `CapabilityCatalogValidation.java:59`: the real 347-line CRLF resource fails equality against LF-generated JSON, reached during mod construction. The reviewer traced Gradle resource handling and reported startup as unexecuted, not passed. |
| `01a094ce-d78c-7140-b4ed-90ca176cd486` / `candidate_b_review` | Corrected candidate diff and evidence claim | No correctness/compatibility finding. CRLF normalization preserves rejection of substantive changes. Successful run `34639689202`, supplied as candidate evidence, was rejected because its recorded SHA is the base and its platform Linux. Missing candidate execution was reported separately from source correctness. |

Both reviewers have host-recorded `independent-reviewer`, Sol/high, read-only runtime and the same parent identity. Each reconstructed its actual Git revision, assigned scope and acceptance from the durable handoff, inspected real resource bytes and execution paths, and made no source edits. Neither inherited production conversation history (`fork_turns="none"`). Desktop inspected their command/result records as well as the coordinator's summary. These bounded controls support this workflow; they are not a general model-quality certification.

The earlier retained pack-specific explorer trial also remains useful: parent `01a094a4-9833-7640-8372-4dca15139a82`, child `01a094a4-bd36-73b3-af69-6b3bcaf24228`, native `create-ch4os-explorer`. The ephemeral trial failed with `no thread with id: 01a094a3-ed78-7343-89b7-c1c1ad63d5a5`. It has not been retested or fixed, and ephemeral sessions are not part of the selected workflow.

### Effective permissions

A temporary fixture-only `permission-probe` role (SHA-256 `fa54b2569f4ba6ff729d7191f08ad8de657a96323b97ebb8a407b1420db33c91`) used a read-only default and explicit authorization for two disposable canary writes. The production reviewer specification was unchanged. Both children actually ran `Set-Content -LiteralPath <canary> -Value <marker> -ErrorAction Stop` inside separate try/catch blocks, then read the files; no escalation was requested.

| Parent / child | Host runtime | Inside control canary | Sibling outside canary |
| --- | --- | --- | --- |
| `01a094ca-8f41-7ba1-ac30-8a4c3485bca5` / `01a094ca-baff-77d1-bbe7-cc79dcd0d417` | read-only | Access denied; unchanged | Access denied; unchanged |
| `01a094cc-45ff-7c50-bae6-ac670ea90baa` / `01a094cc-6ff4-7a90-88e0-1f5a9e477b7a` | workspace-write | Write succeeded; marker verified | Access denied; unchanged |
| Root build parent `01a094d6-4188-76d1-82e7-676da3856e16` / `01a094d6-6601-7040-97f5-6e06d6554c43` | workspace-write at root-level build fixture | `ROOT_PROBE_INSIDE` verified | Same external control canary denied; unchanged |

Desktop independently inspected actual child command outputs and compared file contents/SHA-256 values before and after each parent. All diagnostic children and parents completed. This demonstrates enforcement for the probed paths and confirms a live workspace-write parent supersedes the role's read-only default. It does not certify every filesystem path or remove the platform's temporary-directory allowances. No global permission, ACL or safe-directory setting was changed; Git ownership exceptions used per-command `-c safe.directory=<exact disposable repo>`.

### Windows Gradle execution

Java selection was process-local: `JAVA_HOME=C:/Program Files/Eclipse Adoptium/jdk-21.0.12.8-hotspot`, Java `21.0.12+8-LTS`; executable `C:/Gradle/gradle-8.14.4/bin/gradle.bat`. The ordinary PATH selected Java 11 before this setup. `GRADLE_USER_HOME`, `TEMP`, `TMP`, Java `user.home` / `java.io.tmpdir`, project cache and build output were redirected into disposable material. Candidate source was not edited.

Actual Gradle arguments were `--no-daemon --console=plain --info --stacktrace --max-workers=4 --gradle-user-home <fixture>/gradle-user-home --project-cache-dir <fixture>/project-cache --project-dir <fixture>/project --init-script <fixture>/isolate-build.gradle testCapabilityCatalog --rerun-tasks`; warmed-cache runs also used `--offline`.

| Attempt | Outcome and proof boundary |
| --- | --- |
| `01-sandbox-version` | Exit 0: Gradle 8.14.4 Windows native and Jansi initialization succeeded. |
| `02-sandbox-regression` | Exit 1: restricted network blocked plugin resolution (`getsockopt`). |
| `03-scoped-network-regression` | Scoped fixed-command escalation, exit 0: 27 tasks executed, including production/test compilation and the actual regression. |
| `04-sandbox-offline-regression` | Exit 1: JDK zipfs cleanup during `compileJava` raised `AccessDeniedException` for a cache JAR. |
| `05`–`07` focused Java probes | Java could read/hash the same JAR, but `Path.toRealPath()` failed first at the `Documents` ancestor. Shortening the JAR path did not fix it. |
| `08-scoped-offline-regression-and-legacy` | Scoped fixed-command escalation, exit 0: production/test compilation and the regression executed; 10 tasks executed / 18 cached. Supplemental replay of the old comparison rejected CRLF, while corrected validation accepted it. This supplemental check is not a full build of the broken revision. |
| `09-narrow-cli-offline-regression` | Retained workspace-write parent `01a094cc-7c25-7d90-b8bf-6f4ed95e9c58`, exact fixture root, no added roots/elevation: exit 1 with the same zipfs error. `testCapabilityCatalog` did not execute. |
| `10` temp-location probe | Java could read/hash a disposable JAR under host Temp but `toRealPath()` failed at `AppData`; no full-cache copy or build was attempted there. |
| `11-narrow-cli-root-path-probe` | New root-level fixture `C:/Ch4oS-Agent-Readiness-Gradle-20260912`, retained workspace-write parent `01a094d2-8f47-7270-afbe-d790265a546f`: Java read/hash/path resolution/ZIP close all passed under `CodexSandboxOffline`, without elevation. |
| `12` root setup | Setup-only scoped copy of exact archive/scripts and downloaded caches; fresh project/build outputs. No build ran during setup. |
| `13-narrow-cli-root-offline-regression` | Root-level workspace-write canary boundary passed. Gradle initialized, then failed because fresh project-local Minecraft metadata was missing offline. Regression did not execute; source-preservation checks passed. |
| `14` downloaded-cache correction | Copied five project-local Minecraft cache files, with matching SHA-256 and provider SHA-1 where available. No old execution metadata, application source edits or build execution. |
| `15-narrow-cli-root-offline-regression` | **PASS**, exit 0 in 1m 29s under `CodexSandboxOffline`. Gradle initialized, `compileJava`, `compileTestJava` and `testCapabilityCatalog` executed; 9 tasks executed / 18 reused. The forced regression accepted LF/CRLF, retained the catalog hash and rejected content/formatting drift. |

Attempt 15's retained parent is `01a094da-1cd0-7573-aab7-806c8f6a0b35`, host-recorded Astra/medium with workspace-write, restricted network and no added writable roots. It ran `Run-GradleReadiness.ps1 -Stage regression -Attempt 15-narrow-cli-root-offline-regression -Offline`, then `Verify-Preservation.ps1`, both exit 0. The preceding root-level canary test covers the unchanged permission configuration; it was not claimed as rerun in attempt 15. No build command inside either root-level CLI parent was elevated. Non-Git fixture parents used `--skip-git-repo-check`; this does not bypass sandboxing.

The successful scoped commands remain separate diagnostic evidence. Attempt 15 closes the sandbox Gradle gate with actual task execution. The correction is an isolated build location with accessible ancestors plus complete offline caches, not wider access to `Documents` or `AppData`. Those user-folder path-resolution failures remain known host limitations. Setup-only copying used scoped authorization; no ACL/global permission changes, unrestricted agent mode, direct-Java substitution or application changes were used to make the final build pass.

### Preservation and decision

Independent post-test inventories match every original tracked file, Git state, both review candidates and the uncommitted pack trial specification. The final build preservation check at 09:03:42 UTC additionally matched 260 archived source files and 255 original Lab tracked files. Intentional project writes are limited to disposable test material and this Orchestration branch; no game installation, world, installer input or product source was changed.

| Required check | Demonstrated result |
| --- | --- |
| Named activation | Saved explorer and reviewer names selected; host model/effort and parent/child identities verified. |
| Coordination | Result receipt, bounded same-child follow-up, interruption while running and final completion. |
| Fresh context | Separate reviewer children, no production-history fork, exact revisions/scope reconstructed from durable inputs. |
| Review quality | Concrete broken-control finding; no invented corrected-control blocker. |
| Evidence handling | Ancestor CI result rejected as candidate proof; source correctness distinguished from missing execution. |
| Effective permissions | Actual inside/outside probes and independent read-back under read-only and workspace-write parents, including corrected build location. |
| Windows build tooling | Exact corrected source, Java 21, Gradle 8.14.4 native initialization, compilation and forced regression passed inside the final sandbox. |
| Source preservation | Original Git/file inventories, both review worktrees and archive sources unchanged; pack trial retained. |

Fresh evidence reviewer `01a094e0-29a6-71a3-926f-668d2c613671`, native `independent-reviewer` (Sol/high), reviewed exact Orchestration candidate `bc6e5dfaf3b73e7162eb29bcfd0cf4ae671ae27a` against `bb8a0dacb2a033e3a01aabd0b56c70d585c434c7` under read-only parent `01a094df-c538-7283-8dc5-94f1dd77314d`, with `fork_turns="none"`. It reported **no findings** and **no unmet selected-workflow readiness gate**, independently checking the evidence, source hashes, documentation links and `git diff --check`. Parent and child completed without edits or builds.

The production readiness decision is **READY for the selected workflow**, not universal host/client support. Remaining limits are the known user-folder path issue, offline cache prerequisites, unverified direct Desktop activation and ephemeral sessions, other hosts/filesystem paths, and gameplay/live behavior outside this infrastructure scope. Historical pack-trial session IDs are retained records; their primary receipts were not included in the final review's scoped evidence and were not used to close current gates.

The linked [Create: Ch4oS](../projects/create-ch4os/README.md) and [Ch4oS-Installer](../projects/ch4os-installer/README.md) overlays are now prepared as canonical process-only proposals. Shared agents remain available by task need; overlays supply context rather than restrict the catalog. Changing target effective files, merging and publication are not performed by this trial.
