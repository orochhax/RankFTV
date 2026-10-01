[CmdletBinding(PositionalBinding = $false)]
param(
  [ValidateSet("smoke", "capacity")]
  [string]$Profile = "smoke",
  [string]$BaseUrl = "https://rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects.vercel.app",
  [Parameter(Mandatory = $true)]
  [string]$ChampionshipId,
  [string]$SummaryExport
)

$ErrorActionPreference = "Stop"

function Import-EnvFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  foreach ($sourceLine in Get-Content -LiteralPath $Path) {
    $line = $sourceLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { continue }
    $separator = $line.IndexOf("=")
    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Import-EnvFile (Join-Path $projectRoot ".env.local")
Import-EnvFile (Join-Path $projectRoot ".secrets.local")
Import-EnvFile (Join-Path $projectRoot ".env.sandbox.local")

$env:K6_PROFILE = $Profile
$env:K6_BASE_URL = $BaseUrl.TrimEnd("/")
$env:K6_CHAMPIONSHIP_ID = $ChampionshipId
if ($SummaryExport) {
  $env:K6_SUMMARY_EXPORT = $SummaryExport
}

Set-Location -LiteralPath $projectRoot
& node scripts/run-k6-sandbox-auth.mjs
exit $LASTEXITCODE
