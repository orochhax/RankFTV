"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Turnstile, { type TurnstileHandle } from "@/components/auth/Turnstile";

// Quando a site key existe, o Supabase está com captcha ligado e exige o token.
const captchaEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

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
  const captchaRef = useRef<TurnstileHandle>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (captchaEnabled && !captchaToken) {
      setErro("Confirme que você não é um robô.");
      return;
    }
    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setLoading(false);
      // Token é de uso único: gera um novo pra próxima tentativa.
      captchaRef.current?.reset();
      setCaptchaToken(null);
    } else {
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
    <div className="mx-auto max-w-md px-6 py-10">
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
        <Turnstile ref={captchaRef} onToken={setCaptchaToken} />

        <button
          type="submit"
          disabled={loading || !email || !senha || (captchaEnabled && !captchaToken)}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-blue-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
