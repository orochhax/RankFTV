export type WalletProviderReadiness = {
  ready: boolean;
  configured: number;
  required: number;
  missing: string[];
};

type WalletEnvironment = Record<string, string | undefined>;

function readiness(env: WalletEnvironment, fields: Array<[string, string]>): WalletProviderReadiness {
  const missing = fields.filter(([name]) => !env[name]?.trim()).map(([, label]) => label);
  return { ready: missing.length === 0, configured: fields.length - missing.length, required: fields.length, missing };
}

export function walletReadiness(env: WalletEnvironment = process.env) {
  return {
    apple: readiness(env, [
      ["APPLE_WALLET_PASS_TYPE_ID", "Pass Type ID"],
      ["APPLE_WALLET_TEAM_ID", "Team ID"],
      ["APPLE_WALLET_CERTIFICATE_BASE64", "certificado do Pass Type ID"],
      ["APPLE_WALLET_PRIVATE_KEY_BASE64", "chave privada do certificado"],
      ["APPLE_WALLET_WWDR_CERTIFICATE_BASE64", "certificado intermediário WWDR"],
    ]),
    google: readiness(env, [
      ["GOOGLE_WALLET_ISSUER_ID", "Issuer ID"],
      ["GOOGLE_WALLET_CLASS_ID", "Class ID publicada"],
      ["GOOGLE_WALLET_SERVICE_ACCOUNT_JSON", "credencial da service account"],
    ]),
  };
}
