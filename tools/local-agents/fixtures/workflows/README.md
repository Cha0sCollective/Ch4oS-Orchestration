# Workflow trial fixtures

These small snapshots exercise summary and comparison work through the real
`WorkerService`. They are fixed, sanitized excerpts rather than live target
repositories. The case rubric is outside `snapshots/` and the driver never includes
it in a task request or captured source snapshot.

The excerpts contain no credentials, private host names, personal paths, or runtime
artifacts. Source URLs already present in project documentation are omitted where
they are not needed for the trial.

## Source identity

Create: Ch4oS source revision:
`dbe8a42ea0b68f1180aaa0987b9a14a8a1b0558c`.

| Snapshot file | Original path and line identity |
| --- | --- |
| `snapshots/create-config/bcc.md` | `configuration/files/config/bcc-common.toml.md` lines 3, 5, 7, 9-17; `pack/config/bcc-common.toml` lines 1-5 |
| `snapshots/create-config/big-cannons.md` | `configuration/reviews/big-cannons.md` lines 15-25, 39-61, 70-75, 77-103 |

Ch4oS Installer source revision:
`830355ed9a05990fa7d57ee0d93970179def8526`.

| Snapshot file | Original path and line identity |
| --- | --- |
| `snapshots/installer-workflow/migration.md` | `docs/ARCHITECTURE.md` lines 100-111; `install/SERVER.md` lines 74-111 |
| `snapshots/installer-workflow/validation.md` | `docs/STATUS.md` lines 20-49 |
| `snapshots/installer-workflow/package-release.md` | `docs/PACKAGE-CONTRACT.md` lines 77-98; `docs/CONTRIBUTING.md` lines 87-101 |

Line references returned by a worker must use the snapshot-relative paths and line
numbers, not the original target-repository coordinates above.

## Registered scope

The host config used for a trial must register repository id `workflow-fixtures`
with the Orchestration checkout as its root and this allow path:

```text
tools/local-agents/fixtures/workflows
```

For an approved remote profile, the same id must also appear in the host's explicit
remote repository allowlist. Trial output belongs under the Orchestration checkout's
ignored `.local/` directory.
