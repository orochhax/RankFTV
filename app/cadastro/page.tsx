"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid"
  >("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Verifica @username em tempo real contra o banco real
  useEffect(() => {
    if (!username) { setUsernameStatus("idle"); return; }
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) { setUsernameStatus("invalid"); return; }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "ok");
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  const canSubmit =
    nome.trim().length > 0 &&
    email.trim().length > 0 &&
    senha.length >= 6 &&
    usernameStatus === "ok" &&
    !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Esse e-mail já está cadastrado."
          : error.message
      );
      setLoading(false);
    } else {
      router.push(`/cadastro/verificar-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Criar conta</h1>
      <p className="mt-1 text-sm text-gray-500">
        Só o essencial pra começar — o resto você completa depois, quando precisar.
      </p>

      {erro && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            @usuário
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              @
            </span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
              }
              className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-8 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="seu.usuario"
            />
            {usernameStatus === "checking" && (
              <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
            {usernameStatus === "ok" && (
              <CheckCircle2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />
            )}
            {(usernameStatus === "taken" || usernameStatus === "invalid") && (
              <XCircle className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-red-500" />
            )}
          </div>
          {usernameStatus === "taken" && (
            <p className="mt-1 text-xs text-red-600">Esse @usuário já existe — escolha outro.</p>
          )}
          {usernameStatus === "invalid" && (
            <p className="mt-1 text-xs text-red-600">
              Só letras minúsculas, números, . e _ (mínimo 3 caracteres)
            </p>
          )}
        </div>

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
            placeholder="voce@email.com"
          />
        </div>

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
