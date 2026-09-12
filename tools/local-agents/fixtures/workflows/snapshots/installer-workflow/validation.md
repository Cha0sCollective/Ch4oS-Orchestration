# Local and SFTP validation excerpt

The rc.4 change adds independent local/SFTP source and destination choices through
the existing WinSCP integration. Update and Migrate require stopped-server and
backup confirmation before preparation. Migrate uses **Existing server directory**
and **Locate world files**, followed by review, copy and startup instructions.

Focused implementation checks on Windows PowerShell 5.1 included:

- 24 local migration checks, including the pre-prepare stopped gate and rejection
  of a changed source SFTP username before any connection.
- 46 real WinSCP loopback checks with synthetic world/team/computer/schematic data:
  local-to-SFTP, SFTP-to-local, SFTP-to-SFTP, source preservation, subsequent update
  planning, nonempty/nested refusal, stale review, injected transfer failure,
  temporary-file cleanup and host-key mismatch. A bracketed schematic name exposed
  an upload-mask bug; the corrected transfer passed all routes.
- 25 managed deployment checks, including conflicts, rollback and long paths.
- 46 server UI checks at 96 DPI, including separate/shared SFTP credentials,
  stopped gating, large reviews, completion line breaks and the dark layout.
- 30 client checks, including all launcher choices, launch helpers and layout at
  100% and 225%. No real client installation was run for styling.

These are fixture and presentation results. Full-world SFTP transfer on an AMP host,
host-specific directory aliases/permissions and owner acceptance of the revised
visuals remain unperformed. This pass did not start Minecraft or touch an existing
server. The disposable loopback service was stopped after validation.
