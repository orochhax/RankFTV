$ErrorActionPreference = "Stop"

function Import-EnvFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Arquivo de ambiente ausente: $Path"
  }

  foreach ($sourceLine in Get-Content -LiteralPath $Path) {
    $line = $sourceLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      continue
    }
    $separator = $line.IndexOf("=")
    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Import-EnvFile (Join-Path $projectRoot ".env.local")
Import-EnvFile (Join-Path $projectRoot ".env.sandbox.local")
$secretsPath = Join-Path $projectRoot ".secrets.local"
if (Test-Path -LiteralPath $secretsPath) {
  Import-EnvFile $secretsPath
}

$expectedUrl = "https://obfqzifcvsqnygwmtpnx.supabase.co"
if ($env:NEXT_PUBLIC_SUPABASE_URL -ne $expectedUrl) {
  throw "Execucao recusada: o ambiente nao aponta para o RankFTV Sandbox."
}
$sandboxSecretKey = if ($env:SUPABASE_SECRET_KEY) { $env:SUPABASE_SECRET_KEY } else { $env:SUPABASE_SERVICE_ROLE_KEY }
if (-not $sandboxSecretKey -or -not $sandboxSecretKey.StartsWith("sb_secret_")) {
  throw "Execucao recusada: chave secreta do Sandbox ausente."
}
if (-not $env:PAYMENT_FINGERPRINT_SECRET) {
  # Sandbox local: deriva uma chave estável e separada sem gravar nem expor
  # nenhum segredo novo. Produção continua exigindo sua variável dedicada.
  $fingerprintSeed = [Text.Encoding]::UTF8.GetBytes(
    "rankftv-sandbox-card-fingerprint-v1|$sandboxSecretKey"
  )
  $sha256 = [Security.Cryptography.SHA256]::Create()
  try {
    $fingerprintHash = $sha256.ComputeHash($fingerprintSeed)
  } finally {
    $sha256.Dispose()
  }
  $env:PAYMENT_FINGERPRINT_SECRET = ([BitConverter]::ToString($fingerprintHash) -replace "-", "").ToLowerInvariant()
}
try {
  $asaasUri = [Uri]$env:ASAAS_BASE_URL
} catch {
  throw "Execucao recusada: URL do Asaas invalida."
}
if ($asaasUri.Host -notin @("sandbox.asaas.com", "api-sandbox.asaas.com")) {
  throw "Execucao recusada: o Asaas nao aponta para o Sandbox."
}
if (-not $env:ASAAS_API_KEY) {
  throw "Execucao recusada: chave do Asaas Sandbox ausente."
}

# O token atual do Asaas começa com "$". O carregador de .env do Next expande
# esse caractere e pode transformar a chave herdada em uma string vazia quando
# a mesma variável também existe em .env.local. O fallback codificado existe
# somente neste processo de desenvolvimento e nunca é exposto ao navegador.
$asaasKeyBytes = [Text.Encoding]::UTF8.GetBytes($env:ASAAS_API_KEY)
$env:RANKFTV_SANDBOX_ASAAS_API_KEY_BASE64 = [Convert]::ToBase64String($asaasKeyBytes)

# Preserva também a chave do Resend durante o carregamento dos arquivos .env
# pelo Next. O valor codificado só existe neste processo local de Sandbox; o
# runtime de produção continua dependendo exclusivamente de RESEND_API_KEY.
if ($env:RESEND_API_KEY) {
  $resendKeyBytes = [Text.Encoding]::UTF8.GetBytes($env:RESEND_API_KEY)
  $env:RANKFTV_SANDBOX_RESEND_API_KEY_BASE64 = [Convert]::ToBase64String($resendKeyBytes)
}

Write-Host "RankFTV conectado ao Sandbox: obfqzifcvsqnygwmtpnx"
Set-Location -LiteralPath $projectRoot
npm run dev
