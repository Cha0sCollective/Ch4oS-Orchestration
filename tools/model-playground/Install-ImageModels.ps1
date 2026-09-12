[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ModelsRoot)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Assert-InstallPath.ps1')
$root = [System.IO.Path]::GetFullPath($ModelsRoot)
Assert-InstallPath $root
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'releases.json') -Raw | ConvertFrom-Json
foreach ($model in $manifest.imageModels) {
    $target = [System.IO.Path]::GetFullPath((Join-Path $root $model.path))
    Assert-InstallPath $target
    if (-not $target.StartsWith($root.TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Model path escapes the explicitly selected model root.'
    }
    New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($target)) -Force | Out-Null
    if (Test-Path -LiteralPath $target) {
        if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $model.sha256) { throw 'Existing model has a different hash; preserve it and resolve explicitly.' }
        continue
    }
    $partial = $target + '.partial'
    Assert-InstallPath $partial
    & curl.exe --fail --location --retry 2 --continue-at - --connect-timeout 30 --max-time 1800 --speed-limit 1024 --speed-time 60 --silent --show-error --output $partial $model.url
    if ($LASTEXITCODE -ne 0) { throw 'Model download failed; a later run can resume the partial file.' }
    if ((Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash.ToLowerInvariant() -ne $model.sha256) { throw 'Downloaded model failed SHA-256 verification.' }
    Move-Item -LiteralPath $partial -Destination $target
    Write-Output ('Verified ' + $model.path)
}
