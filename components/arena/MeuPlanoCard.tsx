"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronDown, ChevronUp, CreditCard } from "lucide-react";

type PlanoResumo = {
  id: string;
  nome: string;
  valor: number;
  aulasPorSemana: number | null;
};

function fmtBRL(v: number) {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}

// Aluno com plano ativo: mostra só a tag do plano atual; os outros planos
// ficam escondidos atrás de "Mudar de plano".
export function MeuPlanoCard({
  handle,
  planoAtual,
  outrosPlanos,
  usadasSemana,
  semanaLabel,
}: {
  handle: string;
  planoAtual: PlanoResumo;
  outrosPlanos: PlanoResumo[];
  usadasSemana: number;
  semanaLabel: string;
}) {
  const [mostrarOutros, setMostrarOutros] = useState(false);

  return (
    <div className="space-y-3">
      {/* Card do plano atual — mesma estrutura do card de Aluguel (ícone+título,
          informações empilhadas, botão de largura total) pra ficarem do mesmo tamanho */}
      <section className="flex flex-col gap-3 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
        <div className="flex items-center gap-2">
          <BadgeCheck className="size-4 shrink-0 text-blue-600" />
          <h2 className="text-sm font-semibold text-blue-800">Seu plano</h2>
        </div>

        <div>
          <p className="text-sm font-bold text-blue-900">{planoAtual.nome}</p>
          <p className="text-xs font-medium text-blue-600">{fmtBRL(planoAtual.valor)}/mês</p>
          <p className="mt-1 text-xs text-blue-600">
            {planoAtual.aulasPorSemana
              ? `${planoAtual.aulasPorSemana}x por semana`
              : "Aulas ilimitadas"}
          </p>
          {planoAtual.aulasPorSemana != null && (
            <p className="mt-1 text-xs text-blue-500">
              {usadasSemana < planoAtual.aulasPorSemana
                ? `Você ainda tem ${planoAtual.aulasPorSemana - usadasSemana} aula${planoAtual.aulasPorSemana - usadasSemana > 1 ? "s" : ""} essa semana (${semanaLabel})`
                : `Você já usou todas as aulas dessa semana (${semanaLabel})`}
            </p>
          )}
        </div>

        {outrosPlanos.length > 0 && (
          <button
            onClick={() => setMostrarOutros((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
          >
            Mudar de plano
            {mostrarOutros ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        )}
      </section>

      {/* Outros planos — só quando o aluno pede */}
      {mostrarOutros && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {outrosPlanos.map((p) => (
            <div key={p.id} className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
              <p className="font-bold text-gray-900">{p.nome}</p>
              <p className="text-xs text-gray-500">
                {p.aulasPorSemana ? `${p.aulasPorSemana}x por semana` : "Aulas ilimitadas"}
              </p>
              <p className="mt-2 text-xl font-black text-blue-600">
                {fmtBRL(p.valor)}
                <span className="ml-1 text-xs font-normal text-gray-400">/mês</span>
              </p>
              <Link
                href={`/arenas/${handle}/assinar/${p.id}`}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="size-4" /> Trocar pra esse
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
