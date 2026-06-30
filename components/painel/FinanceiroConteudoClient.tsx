"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, DollarSign, Eye, EyeOff, ChevronRight, Info } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { PRECO_ELITE } from "@/lib/elite";

type StatusCardData = {
  slug: string;
  label: string;
  count: number;
  valor: number;
  bg: string;
  ring: string;
  text: string;
};

type CatSummary = { nome: string; genero: string; count: number; total: number };

type CatItem = {
  id: string;
  nome: string;
  genero: string;
  valorInscricao: number | null;
};

type Props = {
  champId: string;
  repasseLiquido: number;
  statusCards: StatusCardData[];
  totalPix: number;
  totalCredito: number;
  totalDebito: number;
  categorias: CatItem[];
  catMap: Record<string, CatSummary>;
  isElite: boolean;
  feePendente: number;
};

export function FinanceiroConteudoClient({
  champId,
  repasseLiquido,
  statusCards,
  totalPix,
  totalCredito,
  totalDebito,
  categorias,
  catMap,
  isElite,
  feePendente,
}: Props) {
  const [mostrar, setMostrar] = useState(true);
  const val = (v: number) => (mostrar ? formatBRL(v) : "R$ ••••••");

  const maxCatTotal = Math.max(...categorias.map((c) => catMap[c.id]?.total ?? 0), 1);

  return (
    <div className="space-y-8">
      {/* Saldo líquido */}
      <div className={`rounded-2xl p-4 ring-1 ${repasseLiquido < 0 ? "bg-red-50 ring-red-200" : "bg-blue-50 ring-blue-200"}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 ${repasseLiquido < 0 ? "text-red-600" : "text-blue-600"}`}>
            <DollarSign className="size-4" />
            <p className="text-xs font-medium">Seu saldo líquido</p>
          </div>
          <button
            onClick={() => setMostrar((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
            aria-label={mostrar ? "Ocultar valores" : "Mostrar valores"}
          >
            {mostrar ? (
              <>
                <EyeOff className="size-3.5" /> Ocultar valores
              </>
            ) : (
              <>
                <Eye className="size-3.5" /> Mostrar valores
              </>
            )}
          </button>
        </div>
        <p className={`mt-2 text-2xl font-bold ${repasseLiquido < 0 ? "text-red-600" : "text-blue-700"}`}>
          {val(repasseLiquido)}
        </p>
        <div className="mt-3 flex items-start gap-1.5">
          <Info className={`mt-0.5 size-3.5 shrink-0 ${repasseLiquido < 0 ? "text-red-400/60" : "text-blue-500/60"}`} />
          <p className={`text-xs leading-relaxed ${repasseLiquido < 0 ? "text-red-700/60" : "text-blue-700/60"}`}>
            Valores pendentes e estornados não são contabilizados no saldo líquido.
          </p>
        </div>
      </div>

      {/* Transação Plano Elite — some quando 100% quitado */}
      {isElite && feePendente > 0 && (
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-900">Plano Elite — ativação</span>
          </div>

          <div className="flex justify-between text-xs font-semibold text-amber-700">
            <span>Saldo devedor</span>
            <span className="text-red-600">{mostrar ? formatBRL(-feePendente) : "••••••"}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.round(((PRECO_ELITE - feePendente) / PRECO_ELITE) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-amber-600">
            {Math.round(((PRECO_ELITE - feePendente) / PRECO_ELITE) * 100)}% quitado — abatido automaticamente das próximas inscrições pagas.
          </p>

          <p className="rounded-xl bg-amber-100 p-3 text-xs leading-relaxed text-amber-800">
            Você não paga nada agora. O valor de {formatBRL(PRECO_ELITE)} é descontado
            automaticamente dos repasses das suas próximas inscrições pagas — sem nenhum custo no bolso.
          </p>
        </div>
      )}

      {/* Status dos pagamentos */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Status dos pagamentos
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {statusCards.map((c) => (
            <Link
              key={c.slug}
              href={`/painel/campeonatos/${champId}/financeiro/${c.slug}`}
              className={`group relative rounded-2xl p-4 ring-1 transition-all hover:shadow-md hover:scale-[1.02] ${c.bg} ${c.ring}`}
            >
              <p className={`text-xs font-medium ${c.text}`}>{c.label}</p>
              <p className={`mt-2 text-2xl font-bold ${c.text}`}>{c.count}</p>
              <p className={`text-xs ${c.text} opacity-70`}>{val(c.valor)}</p>
              <ChevronRight
                className={`absolute bottom-3 right-3 size-3.5 opacity-0 group-hover:opacity-60 transition-opacity ${c.text}`}
              />
            </Link>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetodoCard emoji="⚡" label="Pix" valor={totalPix} val={val} />
          <MetodoCard emoji="💳" label="Crédito" valor={totalCredito} val={val} />
          <MetodoCard emoji="🏦" label="Débito" valor={totalDebito} val={val} />
        </div>
      </section>

      {/* Arrecadação por categoria — gráfico de barras */}
      {categorias.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Arrecadação por categoria
          </h2>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5 space-y-4">
            {categorias.map((cat) => {
              const total = catMap[cat.id]?.total ?? 0;
              const count = catMap[cat.id]?.count ?? 0;
              const pct = (total / maxCatTotal) * 100;
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{cat.nome}</span>
                    <span className={`font-semibold ${total > 0 ? "text-gray-900" : "text-gray-300"}`}>
                      {mostrar ? formatBRL(total) : "R$ ••••••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${mostrar ? pct : 0}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs text-gray-400">
                      {count} dupla{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}

function MetodoCard({
  emoji,
  label,
  valor,
  val,
}: {
  emoji: string;
  label: string;
  valor: number;
  val: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{emoji}</span>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className={`text-sm font-semibold ${valor > 0 ? "text-gray-900" : "text-gray-300"}`}>
        {val(valor)}
      </p>
    </div>
  );
}
