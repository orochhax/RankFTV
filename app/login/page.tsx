"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Surface } from "@/components/shell/Surface";
import { TurnstileCaptcha, turnstileConfigured } from "@/components/auth/TurnstileCaptcha";

const LOGIN_FAILURE_LIMIT = 3;
const LOGIN_FAILURES_KEY = "rankftv-login-failures";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(
    searchParams.get("erro") === "link-invalido"
      ? "O link de confirmação é inválido ou expirou. Faça login ou crie uma nova conta."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(() => {
    if (typeof window === "undefined") return 0;
    const storedFailures = Number(window.sessionStorage.getItem(LOGIN_FAILURES_KEY) ?? 0);
    return Number.isFinite(storedFailures) ? storedFailures : 0;
  });

  const captchaRequired = failedAttempts >= LOGIN_FAILURE_LIMIT;

  function registerFailure() {
    const next = failedAttempts + 1;
    setFailedAttempts(next);
    window.sessionStorage.setItem(LOGIN_FAILURES_KEY, String(next));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    if (captchaRequired && (!turnstileConfigured || !captchaToken)) {
      setErro(
        turnstileConfigured
          ? "Confirme a verificacao de seguranca antes de continuar."
          : "A protecao anti-bot precisa ser configurada antes de novas tentativas.",
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();
      const captchaError =
        errorMessage.includes("captcha") ||
        errorMessage.includes("challenge") ||
        errorMessage.includes("turnstile");
      const rateLimitError =
        errorMessage.includes("rate limit") ||
        errorMessage.includes("too many") ||
        errorMessage.includes("429");

      // A falha do CAPTCHA nao deve consumir outra tentativa de senha.
      if (!captchaError) registerFailure();
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
      setErro(
        captchaError
          ? "A verificacao de seguranca expirou ou foi rejeitada. Resolva o CAPTCHA novamente."
          : rateLimitError
          ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          : "E-mail ou senha incorretos.",
      );
      setLoading(false);
    } else {
      window.sessionStorage.removeItem(LOGIN_FAILURES_KEY);
      const requestedNext = searchParams.get("next");
      const next =
        requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : "/";
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-48px)] items-center justify-center px-6 py-10">
      <Surface padding="lg" className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900">Entrar</h1>

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div className="relative mt-1">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {captchaRequired && (
            <TurnstileCaptcha
              key={captchaResetKey}
              action="login"
              token={captchaToken}
              onTokenChange={setCaptchaToken}
            />
          )}
          <button
            type="submit"
            disabled={loading || !email || !senha}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Esqueceu sua senha?{" "}
          <Link href="/recuperar-senha" className="font-medium text-blue-600 hover:underline">
            Recuperar acesso
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-gray-500">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-blue-600 hover:underline">
            Criar conta
          </Link>
        </p>
      </Surface>
    </div>
  );
}
