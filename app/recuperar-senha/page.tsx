"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Surface } from "@/components/shell/Surface";
import { TurnstileCaptcha } from "@/components/auth/TurnstileCaptcha";

export default function RecuperarSenhaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email || !captchaToken) return;

    setLoading(true);
    setMensagem(null);
    setErro(null);

    const redirectTo = `${window.location.origin}/recuperar-senha/atualizar`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
      captchaToken,
    });

    setCaptchaToken(null);
    setCaptchaResetKey((key) => key + 1);
    setLoading(false);

    if (error) {
      setErro("Nao foi possivel enviar o e-mail agora. Tente novamente mais tarde.");
      return;
    }

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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <TurnstileCaptcha
            key={captchaResetKey}
            action="password-recovery"
            token={captchaToken}
            onTokenChange={setCaptchaToken}
          />

          <button
            type="submit"
            disabled={loading || !email || !captchaToken}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Enviando..." : "Enviar link de recuperacao"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">Voltar para o login</Link>
        </p>
      </Surface>
    </div>
  );
}
