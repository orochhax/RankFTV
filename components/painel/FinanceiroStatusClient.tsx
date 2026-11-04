"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Search,
  X,
  Calendar,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { InscricaoExpandivel, type InscricaoDetalhe } from "@/components/painel/InscricaoExpandivel";
import { PageContainer } from "@/components/shell/PageContainer";
import { EmptyState } from "@/components/shell/EmptyState";

type StatusSlug = "pagos" | "pendentes" | "estornados";
type MetodoPagamento = "todos" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD";
type OrdemOpcao = "data_desc" | "data_asc" | "valor_desc" | "valor_asc";

type Props = {
  champId: string;
  champNome: string;
  statusSlug: StatusSlug;
  titulo: string;
  descricao: string;
  itens: InscricaoDetalhe[];
  cfg: {
    bg: string;
    ring: string;
    text: string;
  };
};

function formatIsoToSaoPauloDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d);
  } catch {
    return isoString.slice(0, 10);
  }
}

export function FinanceiroStatusClient({
  champId,
  champNome,
  statusSlug,
  titulo,
  descricao,
  itens,
  cfg,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Inicializa a partir da URL
  const paramMetodo = (searchParams.get("metodo") || "todos").toUpperCase();
  const initialMetodo: MetodoPagamento =
    paramMetodo === "PIX" || paramMetodo === "CREDIT_CARD" || paramMetodo === "DEBIT_CARD"
      ? (paramMetodo as MetodoPagamento)
      : "todos";

  const initialInicio = searchParams.get("de") || searchParams.get("inicio") || "";
  const initialFim = searchParams.get("ate") || searchParams.get("fim") || "";
  const paramOrdem = searchParams.get("ordem") || searchParams.get("ordenar") || "data_desc";
  const initialOrdem: OrdemOpcao =
    paramOrdem === "data_asc" || paramOrdem === "valor_desc" || paramOrdem === "valor_asc"
      ? (paramOrdem as OrdemOpcao)
      : "data_desc";

  const initialPagina = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const initialBusca = searchParams.get("q") || "";

  const [metodo, setMetodo] = useState<MetodoPagamento>(initialMetodo);
  const [dataInicio, setDataInicio] = useState<string>(initialInicio);
  const [dataFim, setDataFim] = useState<string>(initialFim);
  const [ordem, setOrdem] = useState<OrdemOpcao>(initialOrdem);
  const [pagina, setPagina] = useState<number>(initialPagina);
  const [busca, setBusca] = useState<string>(initialBusca);

  const pageSize = 30;

  // Atualiza a URL sem recarregar a tela
  const syncUrl = useCallback(
    (novos: {
      metodo?: MetodoPagamento;
      inicio?: string;
      fim?: string;
      ordem?: OrdemOpcao;
      page?: number;
      q?: string;
    }) => {
      const sp = new URLSearchParams();
      const m = novos.metodo ?? metodo;
      const ini = novos.inicio !== undefined ? novos.inicio : dataInicio;
      const f = novos.fim !== undefined ? novos.fim : dataFim;
      const ord = novos.ordem ?? ordem;
      const p = novos.page ?? pagina;
      const q = novos.q !== undefined ? novos.q : busca;

      if (m !== "todos") sp.set("metodo", m.toLowerCase());
      if (ini) sp.set("de", ini);
      if (f) sp.set("ate", f);
      if (ord !== "data_desc") sp.set("ordem", ord);
      if (p > 1) sp.set("page", String(p));
      if (q.trim()) sp.set("q", q.trim());

      const qs = sp.toString();
      const target = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState(null, "", target);
    },
    [pathname, metodo, dataInicio, dataFim, ordem, pagina, busca],
  );

  // Contadores por método para os botões de filtro rápido
  const counts = useMemo(() => {
    let pix = 0;
    let credito = 0;
    let debito = 0;
    for (const item of itens) {
      if (item.billingType === "PIX") pix++;
      else if (item.billingType === "CREDIT_CARD") credito++;
      else if (item.billingType === "DEBIT_CARD") debito++;
    }
    return {
      todos: itens.length,
      PIX: pix,
      CREDIT_CARD: credito,
      DEBIT_CARD: debito,
    };
  }, [itens]);

  const temFiltroAtivo =
    metodo !== "todos" || Boolean(dataInicio) || Boolean(dataFim) || ordem !== "data_desc" || Boolean(busca.trim());

  const resetFiltros = () => {
    setMetodo("todos");
    setDataInicio("");
    setDataFim("");
    setOrdem("data_desc");
    setPagina(1);
    setBusca("");
    syncUrl({ metodo: "todos", inicio: "", fim: "", ordem: "data_desc", page: 1, q: "" });
  };

  // Filtragem e ordenação
  const itensFiltrados = useMemo(() => {
    return itens
      .filter((item) => {
        // Filtro por método de pagamento
        if (metodo !== "todos") {
          if (item.billingType !== metodo) return false;
        }

        // Filtro por data de pagamento (criadoEm em America/Sao_Paulo)
        if (dataInicio || dataFim) {
          const itemData = formatIsoToSaoPauloDate(item.criadoEm);
          if (dataInicio && itemData < dataInicio) return false;
          if (dataFim && itemData > dataFim) return false;
        }

        // Filtro por busca de texto (nome, email, telefone, categoria)
        if (busca.trim()) {
          const termo = busca.trim().toLowerCase();
          const matchA1 =
            item.atleta1.nome.toLowerCase().includes(termo) ||
            (item.atleta1.email && item.atleta1.email.toLowerCase().includes(termo));
          const matchA2 =
            item.atleta2 &&
            (item.atleta2.nome.toLowerCase().includes(termo) ||
              (item.atleta2.email && item.atleta2.email.toLowerCase().includes(termo)));
          const matchCat = item.categoria.toLowerCase().includes(termo);
          if (!matchA1 && !matchA2 && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (ordem === "data_asc") {
          return a.criadoEm.localeCompare(b.criadoEm);
        }
        if (ordem === "valor_desc") {
          const diff = b.valor - a.valor;
          return diff !== 0 ? diff : b.criadoEm.localeCompare(a.criadoEm);
        }
        if (ordem === "valor_asc") {
          const diff = a.valor - b.valor;
          return diff !== 0 ? diff : b.criadoEm.localeCompare(a.criadoEm);
        }
        // Padrão: data_desc (mais recentes)
        return b.criadoEm.localeCompare(a.criadoEm);
      });
  }, [itens, metodo, dataInicio, dataFim, busca, ordem]);

  // Totais do conjunto filtrado
  const totalFiltradoRows = itensFiltrados.length;
  const totalFiltradoValor = useMemo(
    () => itensFiltrados.reduce((acc, curr) => acc + curr.valor, 0),
    [itensFiltrados],
  );

  const totalPages = Math.max(1, Math.ceil(totalFiltradoRows / pageSize));
  const currentPage = Math.min(Math.max(1, pagina), totalPages);

  const itensPaginados = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return itensFiltrados.slice(start, start + pageSize);
  }, [itensFiltrados, currentPage, pageSize]);

  const handleMetodoChange = (novo: MetodoPagamento) => {
    setMetodo(novo);
    setPagina(1);
    syncUrl({ metodo: novo, page: 1 });
  };

  const handleDataInicioChange = (val: string) => {
    setDataInicio(val);
    setPagina(1);
    syncUrl({ inicio: val, page: 1 });
  };

  const handleDataFimChange = (val: string) => {
    setDataFim(val);
    setPagina(1);
    syncUrl({ fim: val, page: 1 });
  };

  const handleOrdemChange = (nova: OrdemOpcao) => {
    setOrdem(nova);
    setPagina(1);
    syncUrl({ ordem: nova, page: 1 });
  };

  const handleBuscaChange = (val: string) => {
    setBusca(val);
    setPagina(1);
    syncUrl({ q: val, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPagina(newPage);
    syncUrl({ page: newPage });
  };

  return (
    <PageContainer width="wide" className="space-y-5 py-8">
      {/* Voltar */}
      <Link
        href={`/painel/campeonatos/${champId}/financeiro`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="size-4" /> Financeiro
      </Link>

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-ink">{titulo}</h1>
        <p className="text-sm text-ink-muted">{champNome}</p>
      </div>

      {/* Card de Resumo com Totais */}
      <div className={`inline-flex flex-wrap items-center gap-3 rounded-card-lg px-4 py-3 ring-1 ${cfg.bg} ${cfg.ring}`}>
        <span className={`text-2xl font-bold ${cfg.text}`}>{totalFiltradoRows}</span>
        <div>
          <p className={`text-xs font-semibold ${cfg.text}`}>
            {totalFiltradoRows === 1 ? "dupla" : "duplas"}
          </p>
          <p className={`text-xs ${cfg.text} opacity-80`}>{formatBRL(totalFiltradoValor)}</p>
        </div>

        {temFiltroAtivo && (
          <div className="ml-auto flex items-center gap-2 border-l border-black/10 pl-3">
            <span className="text-xs text-gray-600">
              Filtrando de {itens.length} {itens.length === 1 ? "dupla" : "duplas"}
            </span>
            <button
              onClick={resetFiltros}
              className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-white shadow-xs transition-colors"
            >
              <RotateCcw className="size-3" /> Limpar
            </button>
          </div>
        )}
      </div>

      {/* Painel de Controles: Filtros e Ordenação */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-black/5">
        {/* Linha 1: Filtro rápido por Método de Pagamento */}
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Forma de pagamento
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleMetodoChange("todos")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                metodo === "todos"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-inset ring-gray-200"
              }`}
            >
              <span>Todos</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                metodo === "todos" ? "bg-blue-700 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {counts.todos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMetodoChange("PIX")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                metodo === "PIX"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-inset ring-gray-200"
              }`}
            >
              <span>⚡ Pix</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                metodo === "PIX" ? "bg-emerald-700 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {counts.PIX}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMetodoChange("CREDIT_CARD")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                metodo === "CREDIT_CARD"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-inset ring-gray-200"
              }`}
            >
              <span>💳 Cartão de Crédito</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                metodo === "CREDIT_CARD" ? "bg-sky-700 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {counts.CREDIT_CARD}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleMetodoChange("DEBIT_CARD")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                metodo === "DEBIT_CARD"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-inset ring-gray-200"
              }`}
            >
              <span>🏦 Cartão de Débito</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                metodo === "DEBIT_CARD" ? "bg-purple-700 text-white" : "bg-gray-200 text-gray-700"
              }`}>
                {counts.DEBIT_CARD}
              </span>
            </button>
          </div>
        </div>

        {/* Linha 2: Período de Pagamento, Ordenação e Busca */}
        <div className="grid grid-cols-1 gap-3 pt-2 border-t border-gray-100 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
          {/* Busca por texto */}
          <div className="lg:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Buscar dupla ou categoria
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                placeholder="Ex: Daniel, Igor, Intermediário..."
                className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => handleBuscaChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Data De / Até */}
          <div className="flex items-center gap-2 lg:col-span-5">
            <div className="flex-1">
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
                <Calendar className="size-3" /> Data de
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => handleDataInicioChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1">
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
                <Calendar className="size-3" /> Até
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => handleDataFimChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Ordenação */}
          <div className="lg:col-span-3">
            <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
              <ArrowUpDown className="size-3" /> Organizar por
            </label>
            <select
              value={ordem}
              onChange={(e) => handleOrdemChange(e.target.value as OrdemOpcao)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="data_desc">Data: Mais recentes</option>
              <option value="data_asc">Data: Mais antigas</option>
              <option value="valor_desc">Valor: Maior valor</option>
              <option value="valor_asc">Valor: Menor valor</option>
            </select>
          </div>
        </div>

        {/* Indicador de filtros ativos e limpar */}
        {temFiltroAtivo && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
            <span>
              {totalFiltradoRows} {totalFiltradoRows === 1 ? "resultado encontrado" : "resultados encontrados"}
            </span>
            <button
              type="button"
              onClick={resetFiltros}
              className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <X className="size-3" /> Limpar todos os filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de Pagamentos / Inscrições */}
      {itensFiltrados.length === 0 ? (
        temFiltroAtivo ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center space-y-3">
            <Wallet className="mx-auto size-8 text-gray-400" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">Nenhum pagamento encontrado com os filtros atuais</p>
              <p className="text-xs text-gray-500 mt-1">Tente ajustar o método, período ou termo de busca.</p>
            </div>
            <button
              onClick={resetFiltros}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <RotateCcw className="size-3.5" /> Limpar filtros
            </button>
          </div>
        ) : (
          <EmptyState icon={Wallet} title="Nenhuma inscrição aqui ainda" description={descricao} />
        )
      ) : (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-card-lg ring-1 ring-border bg-white">
            {itensPaginados.map((ins) => (
              <InscricaoExpandivel key={ins.regId} inscricao={ins} />
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-between text-sm pt-2" aria-label="Paginação de pagamentos">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  currentPage <= 1 ? "pointer-events-none text-ink-muted/40" : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                <ChevronLeft className="size-4" /> Anterior
              </button>

              <span className="text-xs text-ink-muted">
                Página {currentPage} de {totalPages} ({totalFiltradoRows} {totalFiltradoRows === 1 ? "dupla" : "duplas"})
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  currentPage >= totalPages ? "pointer-events-none text-ink-muted/40" : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                Próxima <ChevronRight className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </PageContainer>
  );
}
