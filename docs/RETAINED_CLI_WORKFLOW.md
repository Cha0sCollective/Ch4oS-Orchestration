# Retained CLI coordination

The user-facing Desktop chat coordinates production and receives owner input while
retained CLI parents and task-scoped workers carry out bounded assignments. The
Desktop coordinator remains accountable for scope, integration, appropriate checks,
affected documentation and delivery; it need not personally implement every change.
Independent review has its own read-only parent and fresh children. See [the
adoption trial](ADOPTION_TRIAL.md) for the tested versions, results and current
readiness decision.

## Production implementation workers

Assign bounded implementation to a Sol worker by default, or another model suited
to the task. A production worker may use scoped workspace-write access to edit and
run appropriate checks. Supply the repository/worktree, bounded scope, acceptance
criteria, source references, validation expectations, write boundary and escalation
conditions. Record the worker's actual host model, effort and permission fields.

This is a task-scoped worker, not a saved named profile in the shared catalog. Do
not claim profile activation for it or simulate one by pasting the instructions for
another role. The Desktop coordinator must inspect and integrate its output. When
independent review is required, use the saved reviewer from a fresh read-only parent;
the implementation worker cannot review or accept its own candidate.

## Start and verify

1. Review the project instructions and effective `.codex/agents/*.toml` copies. Record the canonical revision and copied file hashes. Use the installed CLI and record `codex --version`.
2. Start a retained `codex exec --sandbox read-only --json` parent in the review/control workspace. Do not use `--ephemeral`. Save its JSONL output, last message and exit status outside reviewed source. Keep normal authentication in the host; do not copy credentials into fixtures.
3. Activate `agent_type="repo-explorer"` or `agent_type="independent-reviewer"` using the native spawn API and `fork_turns="none"`. Supply repository, exact revision/base, bounded scope, acceptance criteria and durable evidence. Do not paste the profile instructions as a substitute for native selection.
4. Record the native call, child identity and host session model/effort/permission fields. Role self-report alone is insufficient. Use the returned child identity for bounded follow-ups; receive completion before delivery. If work is interrupted, confirm the running child was interrupted and subsequently finishes or is explicitly stopped.

The tested CLI invocation uses `-c agents.enabled=true -c model_reasoning_effort="medium"`. A new disposable project also needs its audited project configuration recognized as trusted. This is project discovery, not a sandbox permission expansion. Prefer existing host trust configuration. For a process-local override, the tested Python argument construction is:

```python
workspace = Path(disposable_workspace).resolve()
trust_override = f'projects.{str(workspace).lower()}.trust_level="trusted"'
args = [codex_executable, "exec", "--cd", str(workspace),
        "--sandbox", "read-only", "--json",
        "-c", "agents.enabled=true", "-c", 'model_reasoning_effort="medium"',
        "-c", trust_override,
        "--output-last-message", str(result_file), "-"]
subprocess.run(args, cwd=workspace, input=prompt.encode("utf-8"), check=True)
```

Here `Path` and `subprocess` are Python standard-library imports; paths and the bounded prompt are supplied by the coordinator. Keep quotes around the TOML value, not around the path component of this CLI dotted key. In this host trial, quoting that key left native selection unavailable. This example is the verified Windows fixture invocation, not a cross-platform configuration generator. Do not change global trust or permissions to make a trial pass.

## Review and executable validation

Keep the review parent read-only. Its child's read-only TOML default can be superseded by a live workspace-write parent. When changing host or permission configuration, prove enforcement with actual disposable canary writes and independent read-back; an agent declining to write is not a sandbox test. Use a temporary diagnostic role for deliberate write probes, preserving production reviewers' no-edit instructions.

Run builds in a separate disposable workspace with an explicit workspace-write parent. Set Java, caches, temp and output directories only for that process, outside candidate sources. Record the selected runtime, exact command, exit status and tasks that executed. Inspect the precise failure layer before retrying. An elevated-command success does not demonstrate sandbox execution, and a direct Java test does not demonstrate a Gradle task ran. Preserve those distinctions in the evidence.

On the tested Windows host, Java could read cache JARs under `Documents` and host Temp but failed `Path.toRealPath()` at their `Documents`/`AppData` ancestors. A dedicated root-level disposable build workspace passed both the path probe and the real Gradle task under a workspace-write sandbox. Use a verified accessible build location instead of granting broad access to those ancestors. For offline NeoGradle validation, preserve downloaded caches in both Gradle user home and the disposable project's `.gradle/caches/minecraft`; a fresh cache missing version metadata fails before compilation. Keep source and generated execution state separate when preparing the fixture. The [trial record](ADOPTION_TRIAL.md) identifies the exact successful layout and remaining host limits.

Supply build results back to the reviewer as durable evidence. Successful validation of an ancestor does not establish validation of a descendant. Keep missing execution evidence separate from a source-code finding.

CLI completion and test completion are different results: a successful Codex turn can report a failed build and still exit 0. Check the actual build command's exit code and task output before counting validation as passed.

## Scope of support

The shared experiment specialist remains a design reference and is outside this readiness trial. Native named activation is verified per host and interface; direct Desktop spawning and ephemeral CLI sessions must not inherit a passing result from a retained CLI test. Product adoption remains a separate reviewed change after the required readiness checks pass.
