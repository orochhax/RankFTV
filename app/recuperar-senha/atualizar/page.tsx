"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Surface } from "@/components/shell/Surface";

export default function AtualizarSenhaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [podeAtualizar, setPodeAtualizar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const verificarSessao = async () => {
      const { data } = await supabase.auth.getSession();
      if (ativo) {
        setPodeAtualizar(Boolean(data.session));
        setLoading(false);
      }
    };

    verificarSessao();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPodeAtualizar(Boolean(session));
        setLoading(false);
      }
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);

    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas nao coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (error) {
      setErro("Nao foi possivel atualizar a senha. Solicite um novo link.");
      return;
    }

    setMensagem("Senha atualizada com sucesso. Agora voce ja pode entrar na sua conta.");
    setSenha("");
    setConfirmacao("");
    // A troca de senha confirma o acesso ao e-mail e encerra o bloqueio
    // adaptativo que foi acumulado antes da recuperacao.
    window.sessionStorage.removeItem("rankftv-login-failures");
    await supabase.auth.signOut();
  }

  return (
    <div className="flex min-h-[calc(100vh-48px)] items-center justify-center px-6 py-10">
      <Surface padding="lg" className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900">Criar nova senha</h1>

        {loading && <p className="mt-4 text-sm text-gray-500">Validando seu link...</p>}
        {!loading && mensagem && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{mensagem}</p>}
        {!loading && erro && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {!loading && podeAtualizar && !mensagem && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-gray-700">Nova senha</label>
              <input
                id="senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmacao" className="block text-sm font-medium text-gray-700">Confirmar nova senha</label>
              <input
                id="confirmacao"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || senha.length < 8 || senha !== confirmacao}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Atualizar senha
            </button>
          </form>
        )}

        {!loading && !podeAtualizar && !mensagem && (
          <p className="mt-4 text-sm text-gray-600">Este link e invalido ou expirou. Solicite outro link de recuperacao.</p>
        )}

        <p className="mt-5 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">Ir para o login</Link>
        </p>
      </Surface>
    </div>
  );
}
