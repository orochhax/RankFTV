[CmdletBinding()]
param(
  [string]$BaseUrl = "https://rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects.vercel.app",
  [switch]$Quick
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
$sessionPath = Join-Path $projectRoot ".artifacts\k6-sandbox-session.json"
Import-EnvFile (Join-Path $projectRoot ".secrets.local")
Import-EnvFile (Join-Path $projectRoot ".env.sandbox.local")

$env:BASE_URL = $BaseUrl.TrimEnd("/")
$env:K6_SESSION_FILE = $sessionPath
$quickValue = if ($Quick) { "1" } else { "0" }
if ($env:VERCEL_PROTECTION_BYPASS) {
  $env:VERCEL_AUTOMATION_BYPASS_SECRET = $env:VERCEL_PROTECTION_BYPASS
}

Set-Location -LiteralPath $projectRoot
try {
  & node scripts/setup-k6-sandbox-session.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & k6 run -e BASE_URL=$env:BASE_URL -e K6_SESSION_FILE=$sessionPath `
    -e K6_QUICK=$quickValue `
    -e VERCEL_AUTOMATION_BYPASS_SECRET=$env:VERCEL_AUTOMATION_BYPASS_SECRET `
    scripts/k6-sandbox-smoke.js
  exit $LASTEXITCODE
} finally {
  if (Test-Path -LiteralPath $sessionPath) {
    Remove-Item -LiteralPath $sessionPath -Force
  }
}
