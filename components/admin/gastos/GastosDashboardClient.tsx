"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import {
  Plus, X, AlertTriangle, PiggyBank, Wallet, Trash2, Loader2, Inbox, Repeat,
  ReceiptText, Tags, Settings2, TrendingUp, Calculator,
} from "lucide-react";
import { apagarLancamento } from "@/app/admin/gastos/actions";
import { NovoLancamentoForm } from "@/components/admin/gastos/NovoLancamentoForm";
import { ExtratoFinanceiro } from "@/components/admin/gastos/ExtratoFinanceiro";
import { CategoriasPainel } from "@/components/admin/gastos/CategoriasPainel";
import { ConfiguracoesInvestimentoForm } from "@/components/admin/gastos/ConfiguracoesInvestimentoForm";
import { CalculadoraRapida } from "@/components/admin/gastos/CalculadoraRapida";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  hojeISO, monthKeyNow, filterByPerson, valorInvestidoAcumulado, resumoFinanceiroDoMes,
  gastoMensal, categoriasDoMes, lancamentosDaCategoriaNoMes,
  BANK_LABEL, PAYMENT_METHOD_LABEL,
  type PersonalFinanceEntry, type PersonFilter, type MonthlyGastoPoint,
  type RecurringOverride, type PersonalFinanceCategory,
} from "@/lib/personal-finance";
import {
  projetarInvestimentos, resolveInvestmentOccurrences,
  type MonthlyInvestmentPoint, type InvestmentSettings,
} from "@/lib/personal-finance-investments";

const HORIZONTES = [3, 6, 9, 12] as const;

const COR_CARLOS = "#2563eb"; // blue-600
const COR_JULIA  = "#f43f5e"; // rose-500

function FiltroPessoa({ value, onChange }: { value: PersonFilter; onChange: (v: PersonFilter) => void }) {
  const opcoes: { valor: PersonFilter; label: string; ativoCls: string }[] = [
    { valor: "todos",  label: "Todos",  ativoCls: "bg-gray-900 text-white" },
    { valor: "carlos", label: "Carlos", ativoCls: "bg-blue-600 text-white" },
    { valor: "julia",  label: "Julia",  ativoCls: "bg-rose-500 text-white" },
  ];
  return (
    <div className="inline-flex gap-1 rounded-2xl bg-gray-100 p-1">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
            value === o.valor ? o.ativoCls : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthlyGastoPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700">{p.label}{p.isFuture && " (previsto)"}</p>
      <p className="font-bold text-gray-900">{formatBRL(p.total)}</p>
      {p.carlos > 0 && <p style={{ color: COR_CARLOS }}>Carlos: {formatBRL(p.carlos)}</p>}
      {p.julia > 0 && <p style={{ color: COR_JULIA }}>Julia: {formatBRL(p.julia)}</p>}
    </div>
  );
}

function InvestTooltip({ active, payload, filtro }: { active?: boolean; payload?: { payload: MonthlyInvestmentPoint & { rendimentoAcumuladoFiltro: number; rendimentoDoMesFiltro: number } }[]; filtro: PersonFilter }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const saldo = filtro === "todos" ? p.saldoTotal : filtro === "carlos" ? p.saldoCarlos : p.saldoJulia;
  return (
    <div className="space-y-0.5 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700">{p.label}</p>
      <p className="font-bold text-gray-900">Saldo projetado: {formatBRL(saldo)}</p>
      {filtro === "todos" && <p style={{ color: COR_CARLOS }}>Carlos: {formatBRL(p.saldoCarlos)}</p>}
      {filtro === "todos" && <p style={{ color: COR_JULIA }}>Julia: {formatBRL(p.saldoJulia)}</p>}
      <p className="text-gray-500">Aportes do mês: {formatBRL(p.aportesDoMes)}</p>
      <p className="text-emerald-600">Rendimento do mês: +{formatBRL(p.rendimentoDoMesFiltro)}</p>
      <p className="mt-1 border-t border-gray-100 pt-1 font-bold text-emerald-600">Rendimentos: +{formatBRL(p.rendimentoAcumuladoFiltro)}</p>
    </div>
  );
}

export function GastosDashboardClient({
  entries,
  overrides,
  categories,
  investmentSettings,
}: {
  entries: PersonalFinanceEntry[];
  overrides: RecurringOverride[];
  categories: PersonalFinanceCategory[];
  investmentSettings: InvestmentSettings;
}) {
  const router = useRouter();
  const hoje = hojeISO();

  const [filtro, setFiltro] = useState<PersonFilter>("todos");
  const [horizonte, setHorizonte] = useState<number>(3);
  const [investHorizonte, setInvestHorizonte] = useState<number>(3);
  const [mesAnalise, setMesAnalise] = useState<string>(monthKeyNow());
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [extratoAberto, setExtratoAberto] = useState(false);
  const [categoriasAberto, setCategoriasAberto] = useState(false);
  const [calculadoraAberta, setCalculadoraAberta] = useState(false);
  const [configInvestAberto, setConfigInvestAberto] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtradas = useMemo(() => filterByPerson(entries, filtro), [entries, filtro]);

  const valorInvestido = useMemo(() => valorInvestidoAcumulado(filtradas, overrides, hoje), [filtradas, overrides, hoje]);
  const resumoMes      = useMemo(() => resumoFinanceiroDoMes(entries, overrides, monthKeyNow(), filtro), [entries, overrides, filtro]);
  const mensal          = useMemo(() => gastoMensal(filtradas, overrides, hoje, horizonte), [filtradas, overrides, hoje, horizonte]);
  const categorias       = useMemo(() => categoriasDoMes(filtradas, overrides, mesAnalise), [filtradas, overrides, mesAnalise]);
  const maxCategoria      = Math.max(...categorias.map((c) => c.total), 1);

  // A projeção SEMPRE roda sobre TODOS os lançamentos (nunca só a pessoa
  // filtrada) — o limite de faixa do Mercado Pago é compartilhado entre
  // Carlos e Julia, então filtrar antes de simular "resetaria" o limite como
  // se cada um tivesse os próprios R$10k. O filtro só decide o que é EXIBIDO.
  const temInvestimentos = useMemo(() => entries.some((e) => e.type === "investimento"), [entries]);
  const taxaIndisponivel = temInvestimentos && investmentSettings.lastCdiAnnual == null;

  const investProjecao = useMemo(
    () => projetarInvestimentos(entries, overrides, investmentSettings, hoje, investHorizonte),
    [entries, overrides, investmentSettings, hoje, investHorizonte],
  );

  const investProjecaoGrafico = useMemo(
    () => investProjecao.map((p) => ({
      ...p,
      rendimentoDoMesFiltro:
        filtro === "todos"
          ? p.rendimentoDoMes
          : filtro === "carlos"
            ? p.rendimentoDoMesCarlos
            : p.rendimentoDoMesJulia,
      rendimentoAcumuladoFiltro:
        filtro === "todos"
          ? p.rendimentoAcumuladoTotal
          : filtro === "carlos"
            ? p.rendimentoAcumuladoCarlos
            : p.rendimentoAcumuladoJulia,
    })),
    [filtro, investProjecao],
  );

  // Rendimento bruto projetado da fatia exibida (todos/carlos/julia) = saldo final
  // - principal de hoje - aportes futuros dessa fatia. Como saldo = principal +
  // aportes + rendimento por construção, isso isola exatamente o rendimento.
  const projecaoResumo = useMemo(() => {
    if (investProjecao.length === 0) return null;
    const ultimo = investProjecao[investProjecao.length - 1];
    const saldoFinal = filtro === "todos" ? ultimo.saldoTotal : filtro === "carlos" ? ultimo.saldoCarlos : ultimo.saldoJulia;

    const fimMk = ultimo.monthKey;
    const investimentosFiltrados = filtradas.filter((e) => e.type === "investimento");
    const ocorrenciasFuturas = resolveInvestmentOccurrences(investimentosFiltrados, overrides, `${fimMk}-28`)
      .filter((o) => o.date > hoje);
    const aportesFuturos = ocorrenciasFuturas.reduce((s, o) => s + o.amount, 0);

    return {
      saldoFinal,
      rendimento: saldoFinal - valorInvestido - aportesFuturos,
    };
  }, [investProjecao, filtro, filtradas, overrides, hoje, valorInvestido]);

  const detalhes = useMemo(() => {
    if (!categoriaSelecionada) return [];
    return lancamentosDaCategoriaNoMes(filtradas, overrides, mesAnalise, categoriaSelecionada);
  }, [filtradas, overrides, mesAnalise, categoriaSelecionada]);

  function handleRemover(entry: PersonalFinanceEntry) {
    if (!confirm(entry.isRecurring
      ? `Remover "${entry.name}"? Isso apaga o lançamento fixo em TODOS os meses. Use o Extrato pra apagar só um mês específico.`
      : "Remover este lançamento?")) return;
    setRemovendoId(entry.id);
    startTransition(async () => {
      await apagarLancamento(
        entry.isRecurring ? { entryId: entry.id, escopoFixo: "todos_os_meses" } : { entryId: entry.id },
      );
      setRemovendoId(null);
      router.refresh();
    });
  }

  const mesAnaliseLabel = mensal.find((m) => m.monthKey === mesAnalise)?.label ?? mesAnalise;

  return (
    <div className="space-y-8">
      {/* ── Filtro de pessoa + Extrato/Categorias ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FiltroPessoa value={filtro} onChange={setFiltro} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoriasAberto(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Tags className="size-4" /> Categorias
          </button>
          <button
            type="button"
            onClick={() => setCalculadoraAberta(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Calculator className="size-4" /> Calcular rápido
          </button>
          <button
            type="button"
            onClick={() => setExtratoAberto(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <ReceiptText className="size-4" /> Extrato
          </button>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <PiggyBank className="size-4" />
              <p className="text-xs font-medium">Valor investido</p>
            </div>
            <button
              type="button"
              onClick={() => setConfigInvestAberto(true)}
              className="rounded-lg p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
              title="Configurar regra do Mercado Pago"
            >
              <Settings2 className="size-3.5" />
            </button>
          </div>
          <p className="mt-2 text-xl font-bold text-gray-900">{formatBRL(valorInvestido)}</p>
          <p className="text-[11px] text-gray-400">Principal já aportado</p>

          {taxaIndisponivel ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">
              Projeção temporariamente indisponível — sem taxa CDI salva ainda.
            </p>
          ) : temInvestimentos && projecaoResumo ? (
            <div className="mt-3 space-y-1 border-t border-gray-100 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Saldo estimado ({investHorizonte}m)</span>
                <span className="font-semibold text-gray-900">{formatBRL(projecaoResumo.saldoFinal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Rendimento bruto</span>
                <span className="font-semibold text-emerald-600">+{formatBRL(projecaoResumo.rendimento)}</span>
              </div>
              {investmentSettings.lastCdiAnnual != null && (
                <p className="text-[10px] text-gray-300">
                  CDI {investmentSettings.lastCdiAnnual}% a.a.
                  {investmentSettings.lastCdiReferenceDate && ` · ${formatDateBR(investmentSettings.lastCdiReferenceDate)}`}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className={`flex items-center gap-1.5 ${resumoMes.resultado < 0 ? "text-red-600" : resumoMes.resultado > 0 ? "text-emerald-600" : "text-blue-600"}`}>
            <Wallet className="size-4" />
            <p className="text-xs font-medium">Resumo do mês</p>
          </div>
          <p className={`mt-2 text-xl font-bold ${resumoMes.resultado < 0 ? "text-red-600" : resumoMes.resultado > 0 ? "text-emerald-600" : "text-gray-900"}`}>{formatBRL(resumoMes.resultado)}</p>
          <div className="mt-2 space-y-1 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <span>Renda</span>
              <span className="font-semibold text-emerald-600">{formatBRL(resumoMes.renda)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Gastos</span>
              <span className="font-semibold text-red-600">{formatBRL(resumoMes.gastos)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Novo lançamento ── */}
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        <Plus className="size-4" /> Novo lançamento
      </button>

      {/* ── Projeção dos investimentos ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-500">
            <TrendingUp className="size-4" /> Projeção dos investimentos
          </h2>
          <div className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
            {HORIZONTES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setInvestHorizonte(h)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  investHorizonte === h ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {h}m
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          {taxaIndisponivel ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertTriangle className="size-8 text-amber-300" />
              <p className="text-sm text-gray-400">Projeção temporariamente indisponível — sem taxa CDI salva ainda.</p>
            </div>
          ) : !temInvestimentos || investProjecao.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Inbox className="size-8 text-gray-300" />
              <p className="text-sm text-gray-400">Nenhum investimento lançado ainda.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={investProjecaoGrafico} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="saldo"
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <YAxis
                    yAxisId="rendimentos"
                    orientation="right"
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: "#16a34a" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip content={<InvestTooltip filtro={filtro} />} />
                  {(filtro === "todos" || filtro === "carlos") && (
                    <Line yAxisId="saldo" type="monotone" dataKey="saldoCarlos" name="Carlos" stroke={COR_CARLOS} strokeWidth={2} dot={false} />
                  )}
                  {(filtro === "todos" || filtro === "julia") && (
                    <Line yAxisId="saldo" type="monotone" dataKey="saldoJulia" name="Julia" stroke={COR_JULIA} strokeWidth={2} dot={false} />
                  )}
                  {filtro === "todos" && (
                    <Line yAxisId="saldo" type="monotone" dataKey="saldoTotal" name="Total" stroke="#111827" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  )}
                  <Line yAxisId="rendimentos" type="monotone" dataKey="rendimentoDoMesFiltro" name="Rendimento do mês" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-2 text-center text-xs text-gray-400">
                Estimativa bruta (sem IR/IOF), com a taxa CDI atual constante — feriados e variação futura do CDI não entram na conta.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Gráfico mensal ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Gasto mensal</h2>
          <div className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
            {HORIZONTES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonte(h)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  horizonte === h ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {h}m
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={mensal}
              barSize={22}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              onClick={(state) => {
                const payload = (state as { activePayload?: { payload: MonthlyGastoPoint }[] } | null)?.activePayload?.[0]?.payload;
                if (payload) setMesAnalise(payload.monthKey);
              }}
            >
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
              <Bar dataKey="carlos" stackId="a" fill={COR_CARLOS} radius={[0, 0, 0, 0]} cursor="pointer">
                {mensal.map((d, i) => <Cell key={i} fillOpacity={d.isFuture ? 0.4 : 1} />)}
              </Bar>
              <Bar dataKey="julia" stackId="a" fill={COR_JULIA} radius={[4, 4, 0, 0]} cursor="pointer">
                {mensal.map((d, i) => <Cell key={i} fillOpacity={d.isFuture ? 0.4 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-xs text-gray-400">
            Clique num mês pra ver as categorias dele abaixo. Meses futuros só somam parcelas e lançamentos fixos já cadastrados.
          </p>
        </div>
      </section>

      {/* ── Categorias do mês em análise ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Categorias — {mesAnaliseLabel}
        </h2>

        {categorias.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
            <Inbox className="size-8 text-gray-300" />
            <p className="text-sm text-gray-400">Nenhum gasto lançado nesse mês.</p>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            {categorias.map((cat) => {
              const barPct = (cat.total / maxCategoria) * 100;
              const carlosPct = cat.total > 0 ? (cat.carlos / cat.total) * barPct : 0;
              const juliaPct = cat.total > 0 ? (cat.julia / cat.total) * barPct : 0;
              const selecionada = categoriaSelecionada === cat.categoria;
              return (
                <button
                  key={cat.categoria}
                  type="button"
                  onClick={() => setCategoriaSelecionada(selecionada ? null : cat.categoria)}
                  className={`block w-full space-y-1.5 rounded-xl p-2 text-left transition-colors ${
                    selecionada ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{cat.categoria}</span>
                    <span className="font-semibold text-gray-900">{formatBRL(cat.total)}</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${carlosPct}%`, backgroundColor: COR_CARLOS }} />
                    <div className="absolute inset-y-0 rounded-full transition-all" style={{ left: `${carlosPct}%`, width: `${juliaPct}%`, backgroundColor: COR_JULIA }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Card de detalhes da categoria clicada ── */}
      {categoriaSelecionada && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {categoriaSelecionada} · {mesAnaliseLabel}
            </h3>
            <button
              type="button"
              onClick={() => setCategoriaSelecionada(null)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>

          {detalhes.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum lançamento encontrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {detalhes.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span
                    className="mt-0.5 size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: e.person === "carlos" ? COR_CARLOS : COR_JULIA }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {e.name}
                      {e.isInstallment && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                          {e.installmentNumber}/{e.installmentTotal}
                        </span>
                      )}
                      {e.isRecurring && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                          <Repeat className="size-2.5" /> Fixo
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {e.person === "carlos" ? "Carlos" : "Julia"} · {formatDateBR(e.entryDate)} · {BANK_LABEL[e.bank]} · {PAYMENT_METHOD_LABEL[e.paymentMethod]}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-900">{formatBRL(e.amount)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemover(e)}
                    disabled={removendoId === e.id}
                    className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                    title="Remover lançamento"
                  >
                    {removendoId === e.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {modalAberto && <NovoLancamentoForm categories={categories} onClose={() => setModalAberto(false)} />}

      {extratoAberto && (
        <ExtratoFinanceiro
          entries={entries}
          overrides={overrides}
          categories={categories}
          onClose={() => setExtratoAberto(false)}
        />
      )}

      {categoriasAberto && (
        <CategoriasPainel categories={categories} onClose={() => setCategoriasAberto(false)} />
      )}

      {calculadoraAberta && (
        <CalculadoraRapida
          entries={entries}
          overrides={overrides}
          categories={categories}
          filtro={filtro}
          onClose={() => setCalculadoraAberta(false)}
        />
      )}

      {configInvestAberto && (
        <ConfiguracoesInvestimentoForm settings={investmentSettings} onClose={() => setConfigInvestAberto(false)} />
      )}
    </div>
  );
}
