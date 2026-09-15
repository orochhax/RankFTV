"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { Surface } from "@/components/shell/Surface";
import { passwordUpdateErrorMessage } from "@/lib/auth-error-messages";
import { passwordUpdateInputSchema } from "@/lib/auth-input-schemas";

function createRecoveryClient() {
  const config = getSupabasePublicConfig();
  return createSupabaseClient(config.url, config.publishableKey, {
    auth: {
      // O cliente SSR padrão usa PKCE. Esta tela recebe, do Supabase, o fluxo
      // implícito no fragmento da URL; a sessão é efêmera e só serve para
      // autorizar a alteração de senha.
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export default function AtualizarSenhaPage() {
  const [supabase] = useState(createRecoveryClient);

  // "checking": confirmando se o link criou uma sessão válida de recuperação
  // (o /auth/callback já trocou o token do e-mail por uma sessão antes de
  // chegar aqui). "invalid": link expirado/já usado. "ready": pode digitar a
  // nova senha. "done": senha trocada com sucesso.
  const [status, setStatus] = useState<"checking" | "invalid" | "ready" | "done">("checking");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getUser().then(({ data }) => {
      if (ativo) setStatus(data.user ? "ready" : "invalid");
    });
    return () => {
      ativo = false;
    };
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    const parsed = passwordUpdateInputSchema.safeParse({
      password: senha,
      confirmation: confirmacao,
    });
    if (!parsed.success) {
      setErro("Use de 8 a 128 caracteres e repita exatamente a mesma senha.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);

    if (error) {
      setErro(passwordUpdateErrorMessage(error));
      return;
    }

    setStatus("done");
    setSenha("");
    setConfirmacao("");
    await supabase.auth.signOut({ scope: "local" });
  }

  return (
    <div className="flex min-h-[calc(100dvh-48px)] items-center justify-center px-6 py-10">
      <Surface padding="lg" className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900">Criar nova senha</h1>

        {status === "checking" && <p className="mt-4 text-sm text-gray-500">Validando seu link...</p>}

        {status === "invalid" && (
          <>
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Este link é inválido ou já expirou. Solicite um novo link de recuperação.
            </p>
            <p className="mt-4 text-center text-sm text-gray-500">
              <Link href="/recuperar-senha" className="font-medium text-blue-600 hover:underline">
                Pedir novo link
              </Link>
            </p>
          </>
        )}

        {status === "done" && (
          <>
            <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Senha atualizada com sucesso. Agora você já pode entrar na sua conta.
            </p>
            <p className="mt-5 text-center text-sm text-gray-500">
              <Link href="/login" className="font-medium text-blue-600 hover:underline">Ir para o login</Link>
            </p>
          </>
        )}

        {status === "ready" && (
          <>
            {erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700">Nova senha</label>
                <div className="relative mt-1">
                  <input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Mínimo 8 caracteres"
                    required
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
              <div>
                <label htmlFor="confirmacao" className="block text-sm font-medium text-gray-700">Confirmar nova senha</label>
                <input
                  id="confirmacao"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || senha.length < 8 || senha !== confirmacao}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Salvando..." : "Atualizar senha"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              <Link href="/login" className="font-medium text-blue-600 hover:underline">Ir para o login</Link>
            </p>
          </>
        )}
      </Surface>
    </div>
  );
}
