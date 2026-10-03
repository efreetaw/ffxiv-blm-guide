$taskPidFile = Join-Path $PSScriptRoot 'server.pid'
if (Test-Path -LiteralPath $taskPidFile) {
    $taskProcessId = [int](Get-Content -LiteralPath $taskPidFile)
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$taskProcessId"
    if ($taskProcess -and $taskProcess.Name -eq 'node.exe' -and $taskProcess.CommandLine -like ('*' + (Join-Path $PSScriptRoot 'serve.mjs') + '*')) {
        Stop-Process -Id $taskProcessId
    }
}
