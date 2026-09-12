# Server migration excerpts

## Architecture contract

Preparation fingerprints include the profile and preparation sources, preventing
reuse of a payload built for different inputs. Unmanaged servers use migration
staging into a fresh local or SFTP destination, from a local or SFTP source. Private
world/access files are copied and verified separately from managed ownership; the
source is unchanged. Migration guards prevent the generated launcher from starting
before success and operator review. AMP cutover remains an operator action.

Remote migration streams one source file at a time through a local temporary file,
verifies it against the review and verifies the uploaded copy. It rechecks the
complete source list after copying. Connection identities include host, port, user
and verified host key; reviews never store passwords. A changed connection requires
a new review. Failed staging remains guarded and requires a new empty destination;
it is not resumed in place.

## Operator migration procedure

1. Stop the existing server, disable automatic restarts and take a complete backup.
   Keep the new server stopped as well. An extracted backup must have been made
   while Minecraft was stopped.
2. Set **Existing server directory** to the folder containing `server.properties`,
   the world folder and the installed NeoForge `libraries/`. Choose a separate empty
   **New server directory** and a new preparation folder.
3. Confirm the stopped-server checkbox and select **Locate world files**. Setup finds
   the configured world, prepares the new pack and shows the copy list.
4. Keep both servers stopped. Review the world name, directories and files, then
   select **Apply changes**. Source changes since review require a new review.
5. Check the copied `server.properties`, preserving world name, online identity and
   access settings. Configure memory, the EULA and the server manager.
6. Remove `.ch4os-migration-review-required` from the new server directory only
   after finishing those settings, then start it. Keep the old installation and
   complete backup until satisfied with the new server.

Setup leaves the source unchanged and copies:

- The complete configured world, including dimensions, inventories, teams, claims,
  ComputerCraft data and `world/serverconfig`.
- `server.properties`, access lists, uploaded `schematics/`, and `server-icon.png`
  when present.

Old mods, root configs/datapacks, scripts, caches, Java, memory arguments and EULA
files are not copied. Other instance-level private data must be preserved
separately when needed.

An interrupted migration leaves `.ch4os-migration-incomplete`. Keep that directory
stopped; do not remove the guard to force startup. Retry with a fresh empty
destination and preparation folder. The original server remains intact. Migration
has no automatic resume or world rollback.
