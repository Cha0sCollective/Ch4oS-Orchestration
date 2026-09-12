# Create Big Cannons configuration review excerpts

The audit observed `createbigcannons-client.toml` and
`createbigcannons-server.toml`. Ch4oS distributes the server file with three
intentional continuity values:

- Autocannon ammo-container autocannon-round capacity: `16`.
- Machine-gun-round capacity: `64`.
- Big-cannon recoil scale: `4.0`.

The exact upstream 5.11.7 source default for `bigCannonRecoilScale` is `1.0`, so the
pack's value is a substantial gameplay difference and must be treated as an owned
Ch4oS balance choice.

This is a broad game-balance surface rather than a collection of personal
preferences. Recoil directly affects mounted cannon behavior and vehicle/physics
integration. The 4× Ch4oS scale should therefore be recorded as a
compatibility/balance invariant until deliberately retuned.

The server configuration contains projectile, fuze, ammunition and container
balance options. Ch4oS already owns two ammo-container capacities. Other munitions
settings should remain operator/gameplay values; changing them can alter logistics,
weapon balance and existing contraption expectations.

The client file contains presentation and aiming/rendering preferences. These are
player-owned and fit the mod's own in-game configuration UI. They should only enter
the Ch4oS installer if a specific accessibility/performance issue justifies a
curated default.

## Ownership proposal

### Pack-owned

- The retained 4.0 big-cannon recoil scale.
- The retained 16/64 ammo-container capacities.
- Any recipe/manufacturing values required for Ch4oS progression/compatibility.

### Player-owned

- Client-only visual/aiming/display preferences.

### Operator-owned

- Other weapon damage/failure/projectile/capacity values.
- Cannon construction/length/cooldowns.
- Kinetic stress values.

Big Cannons should normally appear as a **gameplay profile**, not dozens of raw
weapon sliders. The installer must not silently revert the existing Ch4oS
recoil/capacity values to upstream defaults during updates.
