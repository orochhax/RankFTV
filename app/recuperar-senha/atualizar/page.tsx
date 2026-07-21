"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AtualizarSenhaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // "checking": confirmando se o link criou uma sessão válida de recuperação.
  // "invalid": link expirado/já usado. "ready": pode digitar a nova senha.
  // "done": senha trocada com sucesso.
  const [status, setStatus] = useState<"checking" | "invalid" | "ready" | "done">(
    "checking"
  );
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ao chegar aqui, o /auth/callback já trocou o token do e-mail por uma sessão.
  // Se não houver usuário, o link é inválido ou expirou.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? "ready" : "invalid");
    });
  }, [supabase]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (senha.length < 8) {
      setErro("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setErro("Não foi possível atualizar a senha. O link pode ter expirado.");
      setLoading(false);
    } else {
      setStatus("done");
    }
  }

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <p className="text-sm text-gray-500">Validando o link...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Link inválido</h1>
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Esse link de recuperação é inválido ou já expirou. Peça um novo.
        </p>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/recuperar-senha" className="font-medium text-blue-600 hover:underline">
            Pedir novo link
          </Link>
        </p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Senha alterada</h1>
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Sua senha foi atualizada com sucesso.
        </p>
        <button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ir para a Home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Criar nova senha</h1>
      <p className="mt-1 text-sm text-gray-500">Escolha uma senha nova pra sua conta.</p>

      {erro && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
            Nova senha
          </label>
          <div className="relative mt-1">
            <input
              id="senha"
              type={mostrarSenha ? "text" : "password"}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Mínimo 8 caracteres"
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

        <button
          type="submit"
          disabled={loading || senha.length < 8}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
