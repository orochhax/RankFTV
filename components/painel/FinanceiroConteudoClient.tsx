"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Crown, Eye, EyeOff, ChevronRight, CalendarDays, Loader2, WalletCards } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { PRECO_ELITE } from "@/lib/elite";
import { GraficoVendasDiarias } from "@/components/painel/GraficoVendasDiarias";
import type { DiaVenda } from "@/app/painel/campeonatos/[id]/financeiro/page";
import { simularAntecipacoesOrganizador, solicitarAntecipacoesOrganizador, solicitarSaqueOrganizador } from "@/app/painel/campeonatos/[id]/financeiro/actions";

export type WalletSnapshot = {
  totalNet: number;
  available: number;
  pending: number;
  reserved: number;
  withdrawn: number;
  schedule: Array<{ date: string; amount: number }>;
};
export type AnticipatableReceivable = { id: string; amount: number; availableAt: string; label: string };

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
  statusCards: StatusCardData[];
  totalPix: number;
  totalCredito: number;
  totalDebito: number;
  categorias: CatItem[];
  catMap: Record<string, CatSummary>;
  isElite: boolean;
  feePendente: number;
  vendasDiarias: DiaVenda[];
  chavePixSection: ReactNode;
  cobrancasPendentesSection: ReactNode;
  wallet: WalletSnapshot;
  anticipatableReceivables: AnticipatableReceivable[];
};

export function FinanceiroConteudoClient({
  champId,
  statusCards,
  totalPix,
  totalCredito,
  totalDebito,
  categorias,
  catMap,
  isElite,
  feePendente,
  vendasDiarias,
  chavePixSection,
  cobrancasPendentesSection,
  wallet,
  anticipatableReceivables,
}: Props) {
  const [mostrar, setMostrar] = useState(true);
  const val = (v: number) => (mostrar ? formatBRL(v) : "R$ ••••••");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMessage, setWithdrawMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [withdrawing, startWithdrawal] = useTransition();
  const [selectedReceivables, setSelectedReceivables] = useState<string[]>([]);
  const [anticipationQuote, setAnticipationQuote] = useState<{ fee: number; net: number; documents: number } | null>(null);
  const [anticipationMessage, setAnticipationMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [anticipating, startAnticipation] = useTransition();

  function submitWithdrawal() {
    const amount = Number(withdrawAmount.replace(",", "."));
    setWithdrawMessage(null);
    startWithdrawal(async () => {
      const result = await solicitarSaqueOrganizador(champId, amount, crypto.randomUUID());
      setWithdrawMessage({ ok: result.ok, text: result.message });
      if (result.ok) setWithdrawAmount("");
    });
  }

  const maxCatTotal = Math.max(...categorias.map((c) => catMap[c.id]?.total ?? 0), 1);

  return (
    <div className="space-y-8">
      {/* Carteira individual */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Sua carteira</h2>
          <button onClick={() => setMostrar((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700">
            {mostrar ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {mostrar ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <BalanceCard label="Saldo líquido total" value={val(wallet.totalNet)} tone="blue" />
          <BalanceCard label="Saldo disponível" value={val(wallet.available)} tone="green" />
          <button type="button" onClick={() => setScheduleOpen((open) => !open)} className="text-left">
            <BalanceCard label="Saldo pendente" value={val(wallet.pending)} tone="amber" action />
          </button>
        </div>

        {scheduleOpen && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/10">
            <div className="mb-3 flex items-center gap-2"><CalendarDays className="size-4 text-amber-600" /><p className="text-sm font-semibold">Próximas liberações</p></div>
            {wallet.schedule.length === 0 ? <p className="text-sm text-gray-500">Nenhum valor aguardando liberação.</p> : (
              <div className="divide-y divide-gray-100">
                {wallet.schedule.map((item) => (
                  <div key={item.date} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">{new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${item.date}T12:00:00Z`))}</span>
                    <strong>{val(item.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/10">
          <div className="flex items-center gap-2"><WalletCards className="size-4 text-blue-600" /><h3 className="text-sm font-semibold">Solicitar saque</h3></div>
          <p className="mt-1 text-xs text-gray-500">O valor é reservado imediatamente e nunca pode ultrapassar seu saldo disponível.</p>
          {wallet.reserved > 0 && <p className="mt-2 text-xs font-medium text-amber-700">Em processamento: {val(wallet.reserved)}</p>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              inputMode="decimal"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              placeholder="Valor do saque"
              aria-label="Valor do saque"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <button type="button" disabled={withdrawing || wallet.available < 0.01} onClick={submitWithdrawal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {withdrawing && <Loader2 className="size-4 animate-spin" />} Solicitar saque
            </button>
          </div>
          {withdrawMessage && <p role="status" className={`mt-2 text-xs ${withdrawMessage.ok ? "text-green-700" : "text-red-600"}`}>{withdrawMessage.text}</p>}
        </div>

        {anticipatableReceivables.length > 0 && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/10">
            <h3 className="text-sm font-semibold">Antecipar vendas no cartão</h3>
            <p className="mt-1 text-xs text-gray-500">Escolha vendas específicas. A taxa do Asaas é mostrada antes da confirmação e descontada apenas dessas vendas.</p>
            <div className="mt-3 max-h-56 divide-y divide-gray-100 overflow-y-auto">
              {anticipatableReceivables.map((item) => (
                <label key={item.id} className="flex cursor-pointer items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={selectedReceivables.includes(item.id)} onChange={(event) => { setAnticipationQuote(null); setSelectedReceivables((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)); }} /><span className="truncate">{item.label}</span></span>
                  <span className="shrink-0 font-medium">{val(item.amount)}</span>
                </label>
              ))}
            </div>
            {anticipationQuote && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                <div className="flex justify-between"><span>Taxa de antecipação</span><strong>{val(anticipationQuote.fee)}</strong></div>
                <div className="mt-1 flex justify-between"><span>Valor líquido antecipado</span><strong>{val(anticipationQuote.net)}</strong></div>
                {anticipationQuote.documents > 0 && <p className="mt-2">O Asaas pediu documentos para {anticipationQuote.documents} venda(s); elas não serão enviadas sem essa regularização.</p>}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button type="button" disabled={anticipating || selectedReceivables.length === 0} onClick={() => startAnticipation(async () => {
                setAnticipationMessage(null);
                if (!anticipationQuote) {
                  const quote = await simularAntecipacoesOrganizador(champId, selectedReceivables);
                  if (quote.ok) setAnticipationQuote({ fee: quote.fee, net: quote.net, documents: quote.documents });
                  else setAnticipationMessage({ ok: false, text: quote.message });
                  return;
                }
                const result = await solicitarAntecipacoesOrganizador(champId, selectedReceivables, anticipationQuote.fee);
                setAnticipationMessage({ ok: result.ok, text: result.message });
                if (result.ok) { setSelectedReceivables([]); setAnticipationQuote(null); }
              })} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {anticipating && <Loader2 className="size-4 animate-spin" />}{anticipationQuote ? "Confirmar antecipação" : "Calcular taxa"}
              </button>
            </div>
            {anticipationMessage && <p role="status" className={`mt-2 text-xs ${anticipationMessage.ok ? "text-green-700" : "text-red-600"}`}>{anticipationMessage.text}</p>}
          </div>
        )}
      </section>

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

      {/* Chave Pix */}
      {chavePixSection}

      {/* Gráfico de vendas diárias */}
      <section className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Vendas por dia
        </h2>
        <div className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-black/5 sm:p-5">
          <GraficoVendasDiarias dados={vendasDiarias} />
        </div>
      </section>

      {/* Cobranças pendentes */}
      {cobrancasPendentesSection}

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

function BalanceCard({ label, value, tone, action = false }: { label: string; value: string; tone: "blue" | "green" | "amber"; action?: boolean }) {
  const colors = { blue: "bg-blue-50 ring-blue-200 text-blue-700", green: "bg-emerald-50 ring-emerald-200 text-emerald-700", amber: "bg-amber-50 ring-amber-200 text-amber-700" };
  return <div className={`h-full rounded-2xl p-4 ring-1 ${colors[tone]}`}><p className="text-xs font-medium">{label}</p><div className="mt-2 flex items-center justify-between"><p className="text-xl font-bold">{value}</p>{action && <ChevronRight className="size-4" />}</div></div>;
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
