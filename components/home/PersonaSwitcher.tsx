"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, LayoutDashboard, Building2, Ticket } from "lucide-react";

type Persona = "atleta" | "organizador" | "arena";

const personas: { id: Persona; label: string }[] = [
  { id: "atleta", label: "Sou atleta" },
  { id: "organizador", label: "Sou organizador" },
  { id: "arena", label: "Dono de arena" },
];

function CTAs({ persona }: { persona: Persona }) {
  if (persona === "atleta") {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href="/meus-ingressos"
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <Ticket className="size-4" />
          Já comprei — Ver ingresso
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/cadastro"
            className="flex items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            Fazer login
          </Link>
        </div>
      </div>
    );
  }

  if (persona === "organizador") {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href="/cadastro?modo=organizador"
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <LayoutDashboard className="size-4" />
          Criar meu evento grátis
        </Link>
        <Link
          href="/login?next=%2Fpainel%2Fnovo-campeonato"
          className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
        >
          Entrar no painel
        </Link>
      </div>
    );
  }

  // arena
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/painel?tab=arena"
        className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        <Building2 className="size-4" />
        Criar minha arena
      </Link>
      <Link
        href="/arenas"
        className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
      >
        Entrar na arena
      </Link>
      <Link
        href="/login"
        className="py-2 text-center text-sm font-medium text-gray-400 transition-colors hover:text-white"
      >
        Já tenho conta · Fazer login <ChevronRight className="inline size-3.5" />
      </Link>
    </div>
  );
}

export function PersonaSwitcher() {
  const [persona, setPersona] = useState<Persona>("atleta");

  return (
    <div className="space-y-6 pt-8 pb-2">
      <div className="text-center">
        <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">RankFTV</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-white">
          Futevôlei organizado,
          <br />
          do zero ao pódio.
        </h1>
      </div>

      {/* Toggle de persona */}
      <div className="mx-auto flex max-w-sm rounded-2xl bg-white/8 p-1">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              persona === p.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* CTAs por persona */}
      <div className="mx-auto w-full max-w-xs">
        <CTAs persona={persona} />
      </div>
    </div>
  );
}
