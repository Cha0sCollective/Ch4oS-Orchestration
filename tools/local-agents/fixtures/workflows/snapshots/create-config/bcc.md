# Better Compatibility Checker excerpts

## Inspected configuration record

Better Compatibility Checker.

Pack status below describes **0.1.1-rc.5**.

Pack-managed file: **yes**.

“File value” is the value in the inspected configuration. It is not necessarily an upstream default.
“Pack value” is an explicit override in the maintained pack. “Declared default” is shown only when the file states one.

| Setting | Type | File value | Pack value | Declared default | Meaning / constraints |
| --- | --- | --- | --- | --- | --- |
| <code>general.modpackProjectID</code> | integer | 0 | — | 0 | modpackProjectID is now deprecated and will be removed soon Range: &gt; 0. |
| <code>general.modpackName</code> | string | CHANGE&#95;ME | Create: Ch4oS | Not stated | The name of the modpack |
| <code>general.modpackVersion</code> | string | CHANGE&#95;ME | 0.1.1-rc.5 | Not stated | The version of the modpack |
| <code>general.useMetadata</code> | boolean | false | false | Not stated | Use metadata.json to determine the modpack version. |

## Maintained pack file

Keep this release identity aligned with pack.toml and distribution/profile.json.

```toml
[general]
modpackName = "Create: Ch4oS"
modpackVersion = "0.1.1-rc.8"
useMetadata = false
```
