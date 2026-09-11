# Retiring tools

Tools built for Cha0sCollective that are replaced or no longer needed belong in [Bits-of-Ch4oS](https://github.com/Cha0sCollective/Bits-of-Ch4oS), rather than accumulating in active application repositories.

Before removing a tool:

1. Establish that its job is retired or covered by a working replacement. Preserve useful technical checks even when their surrounding process is obsolete.
2. Copy the recoverable source and required supporting files into the archive. Include the original repository, exact revision and paths, purpose, retirement reason, replacement/recovery instructions and license.
3. Verify the copied files against the source, commit them in the archive, and record that archive revision in the removal change. A source link alone does not complete archival. Disclose dependencies that cannot be recovered.
4. Keep archived workflows inert under the archive tree. Remove retired active files and update current guidance only after the archive copy is available.

Preserve other contributors' archive entries. An existing archive snapshot does not make a still-useful active tool obsolete. Scientific results and baselines belong in their result store. Ordinary documentation history remains in Git; recovery instructions specific to a retired tool travel with it.

Use the approved archive destination without treating it as public release publication. Check its visibility when moving material across repositories and preserve the source license. Never copy secrets or machine credentials.
