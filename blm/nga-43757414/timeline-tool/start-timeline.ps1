param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $taskNode) {
    $taskNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $taskNode)) { throw '未找到 Node.js。请先安装 Node.js，或在已配置的 Codex 环境中运行。' }
$taskUrl = 'http://127.0.0.1:8766'
$taskRunning = $false
try { $taskRunning = (Invoke-RestMethod -Uri "$taskUrl/__local_health" -TimeoutSec 2).application -eq 'blm-timeline-local' } catch { }
if (-not $taskRunning) {
    $taskProcess = Start-Process -FilePath $taskNode -ArgumentList @('"' + (Join-Path $PSScriptRoot 'serve.mjs') + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'server-error.log') -PassThru
    $taskProcess.Id | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'server.pid')
    for ($taskAttempt=0; $taskAttempt -lt 30; $taskAttempt++) {
        Start-Sleep -Milliseconds 100
        try { $taskRunning = (Invoke-RestMethod -Uri "$taskUrl/__local_health" -TimeoutSec 1).application -eq 'blm-timeline-local' } catch { }
        if ($taskRunning) { break }
    }
    if (-not $taskRunning) { throw '本地时间轴未能启动，请检查 server-error.log。' }
}
if (-not $NoBrowser) { Start-Process $taskUrl }
