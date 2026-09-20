# Model routing

Quality and correctness come first. Save usage by avoiding unnecessary work, large context and repeated checks, without weakening the result.

- The coordinator uses **Astra Low or Sol High**, as selected by the user, and can implement directly. Do not automatically raise the user's setting.
- Default independent review is **Sol High**, in fresh context and read-only. Review criteria are in [REVIEW_PROTOCOL.md](REVIEW_PROTOCOL.md).
- Delegate only when a bounded, separable task materially benefits from another agent. No mandatory explorer, implementation worker or specialist roster.
- Give an agent only its task, relevant files/revisions, permissions, expected output and acceptance criteria. Do not fork the full conversation by default.
- Set each delegated agent's model and effort deliberately for its job. Existing explorer profiles are optional conveniences, not a required step.
- If the selected model cannot resolve material uncertainty, explain the problem and recommend a stronger pass. **Ultra requires explicit owner approval.**
- Custom Ollama and OpenRouter workers are outside normal routing until the owner requests their use. Installed tools remain available manually.

Verify model/effort and effective permissions when launching an agent. A role name or copied prompt does not prove that a saved profile was activated. Do not build a separate CLI workflow merely to obtain a role label.
