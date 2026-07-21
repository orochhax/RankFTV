"use client";

import { Turnstile } from "@marsidev/react-turnstile";

type TurnstileCaptchaProps = {
  action: string;
  token: string | null;
  onTokenChange: (token: string | null) => void;
};

export const turnstileConfigured = Boolean(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
);

export function TurnstileCaptcha({
  action,
  token,
  onTokenChange,
}: TurnstileCaptchaProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        A protecao anti-bot ainda nao foi configurada. Adicione a chave publica
        do Cloudflare Turnstile para continuar.
      </p>
    );
  }

  return (
    <div className="flex min-h-[65px] justify-center" aria-label="Verificacao de seguranca">
      <Turnstile
        siteKey={siteKey}
        onSuccess={(value) => onTokenChange(value)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
        options={{
          action,
          language: "pt-BR",
          theme: "auto",
          refreshExpired: "auto",
        }}
      />
      {token ? <input type="hidden" name="captcha-token" value={token} readOnly /> : null}
    </div>
  );
}
