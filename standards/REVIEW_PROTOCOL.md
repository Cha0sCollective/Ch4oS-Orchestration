# Review protocol

Require one fresh, read-only independent review for substantive behavior changes, security-sensitive changes and changes to operating rules. Default to Sol High. Routine documentation and mechanical edits need focused coordinator checks, not a separate review lane. Project-specific acceptance and owner gates still apply.

## Keep review bounded

Give the reviewer the repository, base and exact candidate, scope, relevant instructions and validation evidence. Include an issue or PR when one exists; do not create one just for the review. For uncommitted work, identify the base plus the reviewed working diff and keep it stable during review.

The reviewer inspects the actual diff and affected behavior, verifies material claims and returns actionable findings with file locations. It does not read the production conversation, edit the candidate or approve its own implementation. Add a specialist only for an identified risk the first reviewer cannot adequately cover.

Read-only is the required behavior; verify effective permissions rather than assuming a profile enforces them. Validation that requires writes runs separately in a disposable workspace with scoped permissions. Do not expand reviewer access to work around build or cache failures.

## Follow-up and evidence

Review fixes as deltas and affected behavior. Reuse valid unchanged coverage without claiming a new execution; expand only when changed assumptions or boundaries require it.

Match validation to the claim. Ordinary software/game QA needs appropriate tests and observations. Numerical experiments need valid measurements, units, controlled inputs and meaningful expectations. Screenshots do not need forensic provenance for ordinary visual claims.

Never count cancelled or unperformed checks as passes, combine unrelated runs into a new candidate's result, or substitute synthetic proof for required live acceptance.

## Report the result

Return the reviewed candidate, blocking findings, checks performed and remaining limitations. If there are no findings, say so without manufacturing style issues. Review passes only the inspected scope; it does not authorize merge, publication, promotion or unperformed manual acceptance.
