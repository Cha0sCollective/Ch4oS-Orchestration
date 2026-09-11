# Retiring tools

[Bits-of-Ch4oS](https://github.com/Cha0sCollective/Bits-of-Ch4oS) preserves retired work that has plausible future value to the organization. It is a curated archive, not a copy of everything removed from active repositories.

First decide whether the work is worth preserving beyond ordinary Git history. Reusable automation, verification methods, substantial prototypes and useful implementation patterns are good candidates. A tool does not qualify merely because it once existed. One-off repair scripts, generated status documents, duplicate snapshots and obsolete process scaffolding normally remain only in Git history.

When archiving useful work:

1. State its likely future use and why the active project no longer needs it.
2. Copy the recoverable source and only the supporting files needed to understand or reuse it. Reuse an existing archive copy rather than adding duplicates.
3. Include original repository/revision/paths, purpose, retirement reason, recovery or adaptation notes and license. Verify and commit the copy before removing the selected tool from its active repository. A source link alone does not complete an archive entry.
4. Keep archived workflows inert under the archive tree. Disclose dependencies that are not bundled.

Work with no plausible reuse value can be removed without an archive package; normal commits preserve its history. This is an ordinary engineering judgment, not a new approval gate. Retain useful technical checks before removing obsolete process rules, regardless of archive eligibility.

Preserve unrelated contributors' archive entries. An archived snapshot does not make an active tool obsolete. Scientific results and baselines use their own result store. Never copy secrets or credentials; preserve source licensing and the approved destination's visibility boundary.
