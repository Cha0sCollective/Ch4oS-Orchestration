[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$InputPath,

    [Parameter(Mandatory)]
    [string]$OutputPath,

    [Parameter(Mandatory)]
    [ValidateSet('original', 'repair')]
    [string]$SourceShape
)

<#
Creates a reviewed, privacy-safe aggregate from one agent-usage source file.
It deliberately allowlists the fields below; session IDs, source files, paths,
sandbox data, prompts, tool outputs, and raw per-turn records cannot pass through.
#>

$source = Get-Content -LiteralPath $InputPath -Raw | ConvertFrom-Json

function Copy-Usage([object]$usage) {
    if ($null -eq $usage) { return $null }

    [ordered]@{
        inputTokens = $usage.input_tokens
        cachedInputTokens = $usage.cached_input_tokens
        outputTokens = $usage.output_tokens
        reasoningOutputTokens = $usage.reasoning_output_tokens
        totalTokens = $usage.total_tokens
    }
}

function Copy-Modes([object]$entry) {
    @(@($entry.collaborationMode) + @($entry.collaborationModes) | Where-Object { $_ -is [string] -and $_ } | Select-Object -Unique)
}

function Copy-RequestMetrics([object]$agent) {
    if ($null -eq $agent.requestCount) { return $null }

    [ordered]@{
        count = $agent.requestCount
        firstInputTokens = $agent.firstRequestInputTokens
        meanInputTokens = $agent.meanRequestInputTokens
        medianInputTokens = $agent.medianRequestInputTokens
        maximumInputTokens = $agent.maximumRequestInputTokens
    }
}

if ($SourceShape -eq 'original') {
    $agents = @($source.agents | ForEach-Object {
        $usage = if ($null -ne $_.usage) { $_.usage } else { $_.completedWorkUsage }
        [ordered]@{
            work = $_.purpose
            model = $_.model
            reasoningEffort = $_.reasoningEffort
            modes = @(Copy-Modes $_)
            status = $_.status
            startedAtUtc = $_.startedAtUtc
            lastEventAtUtc = $_.lastEventAtUtc
            usageSnapshotsRecorded = @($_.recordedTurns).Count
            usage = Copy-Usage $usage
        }
    })

    $result = [ordered]@{
        schemaVersion = 1
        generatedAtUtc = $source.generatedAtUtc
        scope = $source.scope
        snapshotStatus = $source.snapshotStatus
        fieldSemantics = [ordered]@{
            cachedInputTokens = 'Subset of inputTokens.'
            reasoningOutputTokens = 'Subset of outputTokens.'
            totalTokens = 'inputTokens plus outputTokens.'
        }
        finalCompletedWorkAggregate = Copy-Usage $source.finalOnlyAggregate
        aggregateLimits = [ordered]@{
            included = $source.finalOnlyAggregate.included
            excluded = $source.finalOnlyAggregate.excluded
        }
        excludedMetadataAudit = [ordered]@{
            work = $source.auditTurn.purpose
            model = $source.auditTurn.model
            reasoningEffort = $source.auditTurn.reasoningEffort
            modes = @(Copy-Modes $source.auditTurn)
            snapshotAtUtc = $source.auditTurn.snapshotAtUtc
            status = $source.auditTurn.status
            usage = Copy-Usage $source.auditTurn.usage
        }
        agents = $agents
    }
}
else {
    $agents = @($source.agents | ForEach-Object {
        [ordered]@{
            work = $_.purpose
            modelSettings = @($_.contexts | ForEach-Object { [ordered]@{ model = $_.model; reasoningEffort = $_.effort; mode = $_.collaboration_mode.mode } })
            status = $_.status
            usageCutoffUtc = $_.usageCutoffUtc
            requestMetrics = Copy-RequestMetrics $_
            requests = @($_.requests | ForEach-Object { [ordered]@{ timestampUtc = $_.timestamp; usage = Copy-Usage $_.usage } })
            usage = Copy-Usage $_.usage
        }
    })

    $result = [ordered]@{
        schemaVersion = 1
        generatedAtUtc = $source.generatedAtUtc
        scope = $source.scope
        snapshotStatus = if ($source.provisional) { 'provisional' } else { 'final' }
        fieldSemantics = [ordered]@{
            cachedInputTokens = 'Subset of inputTokens.'
            reasoningOutputTokens = 'Subset of outputTokens.'
            totalTokens = 'inputTokens plus outputTokens.'
        }
        method = $source.method
        aggregate = Copy-Usage $source.aggregate
        agents = $agents
    }
}

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory) { New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null }
[IO.File]::WriteAllText($OutputPath, (($result | ConvertTo-Json -Depth 8) + "`n"), (New-Object Text.UTF8Encoding($false)))
