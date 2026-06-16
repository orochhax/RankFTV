"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

// Login — ver ftv.md seção 8.2: só e-mail/senha por enquanto (sem Google).
// Ainda sem Supabase Auth de verdade — esse form só valida o fluxo visual.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviado(true);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Entrar</h1>

      {enviado && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          🚧 Login ainda não está ligado ao Supabase de verdade — modo demo. A Home continua
          mostrando o atleta fictício de exemplo.
        </p>
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
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Entrar
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
