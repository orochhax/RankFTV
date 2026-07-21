"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Surface } from "@/components/shell/Surface";
import Turnstile, { type TurnstileHandle } from "@/components/auth/Turnstile";

// Quando a site key existe, o Supabase está com captcha ligado e exige o token
// também no envio do e-mail de recuperação.
const captchaEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function RecuperarSenhaPage() {
  const supabase = createClient();
  const captchaRef = useRef<TurnstileHandle>(null);

  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (captchaEnabled && !captchaToken) {
      setErro("Confirme que você não é um robô.");
      return;
    }
    setLoading(true);
    setMensagem(null);
    setErro(null);

    // O link do e-mail cai no /auth/callback (que já valida o token) e de lá é
    // redirecionado pra tela de definir a nova senha.
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/recuperar-senha/atualizar");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo.toString(),
      ...(captchaToken ? { captchaToken } : {}),
    });

    setLoading(false);
    captchaRef.current?.reset();
    setCaptchaToken(null);

    if (error) {
      setErro("Não foi possível enviar o e-mail agora. Tente novamente mais tarde.");
      return;
    }

    // Mensagem neutra de propósito: não confirma se o e-mail existe ou não,
    // pra não virar uma forma de descobrir quais e-mails têm conta.
    setMensagem("Se existir uma conta com esse e-mail, enviaremos um link para redefinir sua senha.");
  }

  return (
    <div className="flex min-h-[calc(100vh-48px)] items-center justify-center px-6 py-10">
      <Surface padding="lg" className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900">Recuperar senha</h1>
        <p className="mt-2 text-sm text-gray-500">
          Informe seu e-mail e enviaremos um link seguro para criar uma nova senha.
        </p>

        {mensagem && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensagem}</p>}
        {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {!mensagem && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <Turnstile ref={captchaRef} onToken={setCaptchaToken} />

            <button
              type="submit"
              disabled={loading || !email || (captchaEnabled && !captchaToken)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">Voltar para o login</Link>
        </p>
      </Surface>
    </div>
  );
}
