# Retiring tools

[Bits-of-Ch4oS](https://github.com/Cha0sCollective/Bits-of-Ch4oS) preserves retired work that has plausible future value to the organization. It is a curated archive, not a copy of everything removed from active repositories.

First decide whether the work is worth preserving beyond ordinary Git history. Reusable automation, verification methods, substantial prototypes and useful implementation patterns are good candidates. A tool does not qualify merely because it once existed. One-off repair scripts, generated status documents, duplicate snapshots and obsolete process scaffolding normally remain only in Git history.

Archival is lightweight storage, not a maintained product or a separate delivery process. Put selected files and essential support in a descriptive directory under `archive/<source-project>/`. A brief README or commit message identifying the source repository/path/ref and what the files do is sufficient; retain existing licensing. Reuse existing copies and keep archived workflows outside `.github/workflows/`.

For routine additions, commit and push directly to the archive's default branch, batching related files where convenient. No per-deposit PR, independent review, CI run, checksum manifest, detailed provenance report, index maintenance or modernization is required. Confirm the intended files were included and pushed before removing their active copies. If repository protection requires a PR, use the smallest required process without adding gates or weakening protection.

Work with no plausible reuse value can be removed normally; Git preserves its history. Selection is ordinary engineering judgment, not a new approval gate. Retain useful technical checks before removing obsolete process rules, regardless of archive eligibility.

Preserve unrelated contributors' archive entries. An archived snapshot does not make an active tool obsolete. Scientific results and baselines use their own result store. Never copy secrets or credentials; preserve source licensing and the approved destination's visibility boundary.
