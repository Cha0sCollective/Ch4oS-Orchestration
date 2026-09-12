# Package and release excerpts

## Package contract

The generated package combines `pack/`, `install/`, the three
`distribution/*.json` inputs, `bundled/`, notices, licenses, `Setup-Client.cmd` and
both EXEs. Installer `install/SERVER.md` is delivered as
`install/SERVER-OPERATIONS.md`; the pack's server page remains `install/SERVER.md`.
Generated profile/runtime files must not be edited in a released ZIP. The installer
source checkout alone cannot run a full installation: consumer files are supplied
only by composition. The packaged workers are invoked from the extracted ZIP root.

The build does not copy the repositories' full docs or research trees. Included
install guides are for users/operators; contributor/build documentation remains in
the source repositories. Online guides on main can be newer than a package. Use
`candidate.json` and the included instructions for the actual version being
operated. Updating a repository document does not rewrite an existing ZIP or
silently change a consumer's installer pin.

`candidate.json` records contract version, installer version/repository/commit,
pack ID/version/commit/pack.toml hash and bundled metadata. The build prints the ZIP
SHA-256. ZIP byte-for-byte reproducibility is not claimed because compilation and
archive timestamps may vary. Reviewed inputs and installed dependency hashes are
pinned. The EXEs are unsigned. Release hosting and public publication are not part
of composition.

## Release and adoption

An installer release updates `installer.json` and its release notes, identifies the
reviewed source with a version tag, and records the tested consumer revision. The
pack then adopts an exact installer commit and builds its own installable ZIP. The
two projects can have different versions and release schedules.

For a combined Create: Ch4oS delivery, promote the exact tested artifact after
review and release approval. Merging source does not publish a release, alter an
existing package or operate a production server.

The 0.1.0 notes describe the first published release. Its source tag and artifacts
remain historical references; current implementation status is on the status page.
