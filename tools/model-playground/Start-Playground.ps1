[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [Parameter(Mandatory = $true)][ValidateSet('Ollama','Cherry','Comfy')][string]$Application
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Assert-InstallPath.ps1')

$root = [System.IO.Path]::GetFullPath($InstallRoot)
# Resolve the explicitly selected root when a relocation left a compatibility junction.
$rootEntry = Get-Item -LiteralPath $root -Force -ErrorAction SilentlyContinue
if ($rootEntry -and $rootEntry.LinkType -eq 'Junction') {
    $root = [System.IO.Path]::GetFullPath(@($rootEntry.Target)[0])
}
Assert-InstallPath $root
if (-not (Test-Path -LiteralPath $root -PathType Container)) {
    throw 'InstallRoot does not exist. Run the pinned installer first.'
}

$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'releases.json') -Raw | ConvertFrom-Json

if ($Application -eq 'Ollama') {
    $executable = Join-Path $root 'ollama\0.33.2\ollama.exe'
    $models = Join-Path $root 'ollama\models'
    Assert-InstallPath $executable
    Assert-InstallPath $models
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw 'Pinned Ollama runtime is missing.' }
    try { $running = Invoke-RestMethod 'http://127.0.0.1:11435/api/version' -TimeoutSec 2 } catch { $running = $null }
    if ($running) {
        if ($running.version -ne '0.33.2') { throw 'Another Ollama version is listening on the configured port.' }
        Write-Output 'Ollama is already running at http://127.0.0.1:11435'
        return
    }
    $state = Join-Path $root 'state'
    Assert-InstallPath $state
    New-Item -ItemType Directory -Path $state -Force | Out-Null
    $stdout = Join-Path $state 'ollama.stdout.log'
    $stderr = Join-Path $state 'ollama.stderr.log'
    Assert-InstallPath $stdout
    Assert-InstallPath $stderr
    $priorHost = $env:OLLAMA_HOST
    $priorModels = $env:OLLAMA_MODELS
    $priorCloud = $env:OLLAMA_NO_CLOUD
    try {
        $env:OLLAMA_HOST = '127.0.0.1:11435'
        $env:OLLAMA_MODELS = $models
        $env:OLLAMA_NO_CLOUD = '1'
        $process = Start-Process -FilePath $executable -ArgumentList 'serve' -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        [pscustomobject]@{ application = 'Ollama'; processId = $process.Id; endpoint = 'http://127.0.0.1:11435' }
    } finally {
        $env:OLLAMA_HOST = $priorHost
        $env:OLLAMA_MODELS = $priorModels
        $env:OLLAMA_NO_CLOUD = $priorCloud
    }
    return
}

if ($Application -eq 'Cherry') {
    $executable = Join-Path $root ('cherry\' + $manifest.cherry.version + '\Cherry Studio.exe')
    Assert-InstallPath $executable
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
        throw 'Cherry Studio runtime is missing from the pinned install location.'
    }

    $process = Start-Process -FilePath $executable -PassThru
    [pscustomobject]@{ application = 'Cherry'; processId = $process.Id; executable = $executable }
    return
}

$portableRoot = Join-Path $root ('comfy\' + $manifest.comfy.version + '\ComfyUI_windows_portable')
try { $runningComfy = Invoke-RestMethod 'http://127.0.0.1:8188/system_stats' -TimeoutSec 2 } catch { $runningComfy = $null }
if ($runningComfy) {
    Write-Output 'A ComfyUI server is already running at http://127.0.0.1:8188'
    return
}
$python = Join-Path $portableRoot 'python_embeded\python.exe'
$main = Join-Path $portableRoot 'ComfyUI\main.py'
Assert-InstallPath $portableRoot
Assert-InstallPath $python
Assert-InstallPath $main
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw 'ComfyUI embedded Python runtime is missing from the pinned install location.'
}
if (-not (Test-Path -LiteralPath $main -PathType Leaf)) {
    throw 'ComfyUI main.py is missing from the pinned install location.'
}

$state = Join-Path $root 'state'
Assert-InstallPath $state
New-Item -ItemType Directory -Path $state -Force | Out-Null
$stdout = Join-Path $state 'comfy.stdout.log'
$stderr = Join-Path $state 'comfy.stderr.log'
$pidFile = Join-Path $state 'comfy.pid'
Assert-InstallPath $stdout
Assert-InstallPath $stderr
Assert-InstallPath $pidFile

$arguments = @(
    '-s',
    'ComfyUI\main.py',
    '--windows-standalone-build',
    '--disable-auto-launch',
    '--disable-all-custom-nodes',
    '--listen', '127.0.0.1',
    '--port', '8188'
)
$process = Start-Process -FilePath $python -ArgumentList $arguments -WorkingDirectory $portableRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii
[pscustomobject]@{
    application = 'Comfy'
    processId = $process.Id
    endpoint = 'http://127.0.0.1:8188'
    stdout = $stdout
    stderr = $stderr
}
