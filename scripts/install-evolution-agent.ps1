$ErrorActionPreference = "Stop"

$projectPath = Split-Path -Parent $PSScriptRoot
$runnerPath = Join-Path $projectPath "scripts\run-evolution-agent.ps1"
$taskName = "RankFTV Central Agent"

if (-not (Test-Path -LiteralPath $runnerPath)) {
  throw "Executor local não encontrado."
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runnerPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 7) `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Executa atualizações aprovadas da Central de Evolução usando o Codex local." `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Output "Agente local instalado e iniciado: $taskName"
