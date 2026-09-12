[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [Parameter(Mandatory = $true)][ValidateSet('Cherry','Comfy')][string]$Application
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Assert-InstallPath.ps1')
$root = [System.IO.Path]::GetFullPath($InstallRoot)
Assert-InstallPath $root
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'releases.json') -Raw | ConvertFrom-Json
$release = if ($Application -eq 'Cherry') { $manifest.cherry } else { $manifest.comfy }
$cache = Join-Path $root 'downloads'
New-Item -ItemType Directory -Path $cache -Force | Out-Null
$archive = Join-Path $cache ([System.IO.Path]::GetFileName(([uri]$release.url).AbsolutePath))
Assert-InstallPath $archive
if (-not (Test-Path -LiteralPath $archive)) {
    $partial = $archive + '.partial'
    Assert-InstallPath $partial
    & curl.exe --fail --location --retry 2 --continue-at - --silent --show-error --output $partial $release.url
    if ($LASTEXITCODE -ne 0) { throw 'Download failed. Do not install a partial archive.' }
    if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $release.sha256) { throw 'Downloaded archive failed SHA-256 verification.' }
    Move-Item -LiteralPath $partial -Destination $archive
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $release.sha256) {
    throw 'Archive SHA-256 does not match the pinned official release.'
}
if ($Application -eq 'Cherry') {
    $target = Join-Path $root ('cherry/' + $release.version)
    Assert-InstallPath $target
    if (Test-Path -LiteralPath $target) { throw 'Cherry target already exists; preserve it and choose an empty target.' }
    $process = Start-Process -FilePath $archive -ArgumentList @('/S','/currentuser',('/D=' + $target)) -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Cherry installer exited with code $($process.ExitCode)." }
    if (-not (Test-Path -LiteralPath (Join-Path $target 'Cherry Studio.exe'))) { throw 'Installer did not create the expected executable.' }
} else {
    $target = Join-Path $root ('comfy/' + $release.version)
    Assert-InstallPath $target
    if (Test-Path -LiteralPath $target) { throw 'Comfy target already exists; do not overwrite a configured installation.' }
    $sevenZip = (Get-Command 7z.exe -ErrorAction Stop).Source
    $staging = $target + '.extracting'
    Assert-InstallPath $staging
    if (Test-Path -LiteralPath $staging) { throw 'An earlier extraction remains at the .extracting path; inspect it before removing or retrying.' }
    New-Item -ItemType Directory -Path $staging | Out-Null
    & $sevenZip x $archive ('-o' + $staging) -bso0 -bsp0
    if ($LASTEXITCODE -ne 0) { throw 'Comfy archive extraction failed; the final target was not published.' }
    $resolvedStage = (Resolve-Path -LiteralPath $staging).Path
    $resolvedRoot = (Resolve-Path -LiteralPath $root).Path.TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar
    if (-not $resolvedStage.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase) -or -not $target.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Extraction paths escape the selected install root.' }
    Move-Item -LiteralPath $resolvedStage -Destination $target
}
[pscustomobject]@{ application=$Application; version=$release.version; target=$target; sha256=$release.sha256 }
