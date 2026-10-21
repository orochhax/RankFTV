$ErrorActionPreference = "Stop"

$projectPath = Split-Path -Parent $PSScriptRoot
$artifactPath = Join-Path $projectPath ".codex-artifacts\evolution-agent"
$logPath = Join-Path $artifactPath "agent.log"

New-Item -ItemType Directory -Force -Path $artifactPath | Out-Null
Set-Location -LiteralPath $projectPath

try {
  & node "scripts/evolution-local-agent.mjs" --watch *>> $logPath
} catch {
  $safeMessage = $_.Exception.Message -replace 'https?://\S+', '[url removida]'
  "[$(Get-Date -Format o)] Agente encerrado: $safeMessage" | Add-Content -LiteralPath $logPath
  throw
}
