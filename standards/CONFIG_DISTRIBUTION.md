# Configuration distribution

This repository holds canonical project AGENTS.md files and optional shared agent profiles. The effective instructions live in each target repository; a clean clone must stand on its own.

Apply changes through reviewed manual edits only when deployment is authorized. Compare the canonical and effective files, preserve target-specific rules and unrelated work, and record the source revision, target base and relevant checks in the existing adoption record or change description.

Do not silently absorb target drift into canonical policy. Reconcile intentional differences explicitly. Avoid automatic sync, manifests, sibling-path dependencies, symlinks and submodules for instruction distribution.

A private development repository and a public publication repository may need different instructions. Do not publish internal configuration merely because it exists. See [PUBLICATION_BOUNDARY.md](PUBLICATION_BOUNDARY.md).
