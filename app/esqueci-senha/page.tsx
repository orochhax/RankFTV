"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Turnstile, { type TurnstileHandle } from "@/components/auth/Turnstile";

// Quando a site key existe, o Supabase está com captcha ligado e exige o token
// também no envio do e-mail de recuperação.
const captchaEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function EsqueciSenhaPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (captchaEnabled && !captchaToken) {
      setErro("Confirme que você não é um robô.");
      return;
    }
    setLoading(true);
    setErro(null);

    // O link do e-mail cai no /auth/callback (que já valida o token) e de lá é
    // redirecionado pra tela de definir a nova senha.
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/redefinir-senha");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo.toString(),
      ...(captchaToken ? { captchaToken } : {}),
    });

    if (error) {
      setErro("Não foi possível enviar o e-mail. Tente novamente.");
      setLoading(false);
      // Token do captcha é de uso único: gera um novo pra próxima tentativa.
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } else {
      setEnviado(true);
      setLoading(false);
    }
  }

  // Mensagem neutra de propósito: não confirma se o e-mail existe ou não, pra
  // não virar uma forma de descobrir quais e-mails têm conta.
  if (enviado) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Verifique seu e-mail</h1>
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Se existir uma conta com <strong>{email}</strong>, enviamos um link pra
          você criar uma nova senha. Confira também a caixa de spam.
        </p>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Esqueci minha senha</h1>
      <p className="mt-1 text-sm text-gray-500">
        Informe seu e-mail e enviaremos um link pra criar uma nova senha.
      </p>

      {erro && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="voce@email.com"
          />
        </div>

        <Turnstile ref={captchaRef} onToken={setCaptchaToken} />

        <button
          type="submit"
          disabled={loading || !email || (captchaEnabled && !captchaToken)}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
