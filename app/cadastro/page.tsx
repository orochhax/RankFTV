"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { ATHLETES } from "@/lib/mock/athletes";

// Usando os 30 atletas fake como "banco de @usuários já existentes" pra
// simular a verificação de duplicado em tempo real (ftv.md seção 8.2) sem
// precisar de backend ainda.
const USERNAMES_EXISTENTES = new Set(ATHLETES.map((a) => a.username));

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
}

// Cadastro — ver ftv.md seção 8.2: só nome, e-mail, senha e @usuário. Tudo
// mais (telefone, cidade, nível...) é preenchido depois, sob demanda. Ainda
// sem Supabase Auth de verdade — esse form só valida o fluxo visual.
export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [username, setUsername] = useState("");
  const [enviado, setEnviado] = useState(false);

  const usernameNormalizado = normalizeUsername(username);
  const usernameDisponivel = usernameNormalizado.length > 0 && !USERNAMES_EXISTENTES.has(usernameNormalizado);
  const podeEnviar = Boolean(nome && email && senha.length >= 6 && usernameDisponivel);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Conta criada! (modo demo)</h1>
        <p className="mt-2 text-sm text-gray-500">
          Isso ainda não está ligado ao Supabase de verdade — é só pra validar o fluxo visual. O
          cadastro real entra na próxima etapa.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">
          Voltar pra Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Criar conta</h1>
      <p className="mt-1 text-sm text-gray-500">
        Só o essencial pra começar — o resto você completa depois, quando precisar.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Seu nome completo"
          />
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
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            @usuário
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-8 text-sm"
              placeholder="seu.usuario"
            />
            {usernameNormalizado.length > 0 &&
              (usernameDisponivel ? (
                <CheckCircle2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-emerald-500" />
              ) : (
                <XCircle className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-red-500" />
              ))}
          </div>
          {usernameNormalizado.length > 0 && !usernameDisponivel && (
            <p className="mt-1 text-xs text-red-600">Esse @usuário já existe — escolha outro.</p>
          )}
          <p className="mt-1 text-xs text-gray-400">Pode trocar depois, com limite de 1x por mês.</p>
        </div>

        <button
          type="submit"
          disabled={!podeEnviar}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Criar conta
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
