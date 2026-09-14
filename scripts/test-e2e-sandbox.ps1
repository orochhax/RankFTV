[CmdletBinding(PositionalBinding = $false)]
param(
  [switch]$AllowFinancialMutations,
  [string]$BaseUrl = "https://rank-ftv-git-sandbox-homologacao-devcarlosrochas-projects.vercel.app",
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$PlaywrightArgs
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

$expectedUrl = "https://obfqzifcvsqnygwmtpnx.supabase.co"
if ($env:NEXT_PUBLIC_SUPABASE_URL -ne $expectedUrl) {
  throw "Execucao E2E recusada: o Supabase nao e o Sandbox esperado."
}
if (-not $env:SUPABASE_SECRET_KEY -or -not $env:SUPABASE_SECRET_KEY.StartsWith("sb_secret_")) {
  throw "Execucao E2E recusada: chave secreta moderna do Sandbox ausente."
}

$env:E2E_BASE_URL = $BaseUrl.TrimEnd("/")
$env:E2E_SANDBOX_SUPABASE_PROJECT_REF = "obfqzifcvsqnygwmtpnx"
$env:E2E_DISPOSABLE_SANDBOX = "RANKFTV_DISPOSABLE_SANDBOX"
$env:E2E_AUTH_MODE = "sandbox-magic-link"
$env:E2E_SERIAL_AUTH = "1"
if ($env:VERCEL_PROTECTION_BYPASS) {
  $env:VERCEL_AUTOMATION_BYPASS_SECRET = $env:VERCEL_PROTECTION_BYPASS
}

if ($AllowFinancialMutations) {
  $env:E2E_ASAAS_MUTATION_TESTS = "1"
  $env:E2E_CARD_GUARD_MUTATION_TESTS = "1"
} else {
  $env:E2E_ASAAS_MUTATION_TESTS = "0"
  $env:E2E_CARD_GUARD_MUTATION_TESTS = "0"
}

Set-Location -LiteralPath $projectRoot
& node scripts/setup-e2e-sandbox.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& npx playwright test @PlaywrightArgs
exit $LASTEXITCODE
