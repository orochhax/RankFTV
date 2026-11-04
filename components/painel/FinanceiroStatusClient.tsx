"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Wallet, RotateCcw } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { InscricaoExpandivel, type InscricaoDetalhe } from "@/components/painel/InscricaoExpandivel";
import {
  FinanceiroFiltrosBar,
  type MetodoPagamento,
  type OrdemOpcao,
} from "@/components/painel/FinanceiroFiltrosBar";
import { PageContainer } from "@/components/shell/PageContainer";
import { EmptyState } from "@/components/shell/EmptyState";

type StatusSlug = "pagos" | "pendentes" | "estornados";

type Props = {
  champId: string;
  champNome: string;
  statusSlug: StatusSlug;
  titulo: string;
  descricao: string;
  itens: InscricaoDetalhe[];
  cfg: { bg: string; ring: string; text: string };
};

function formatIsoToSaoPauloDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return isoString.slice(0, 10);
  }
}

export function FinanceiroStatusClient({
  champId,
  champNome,
  statusSlug: _statusSlug,
  titulo,
  descricao,
  itens,
  cfg,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, metodo, dataInicio, dataFim, ordem, pagina, busca],
  );

  const counts = useMemo(() => {
    let pix = 0;
    let credito = 0;
    let debito = 0;
    for (const item of itens) {
      if (item.billingType === "PIX") pix++;
      else if (item.billingType === "CREDIT_CARD") credito++;
      else if (item.billingType === "DEBIT_CARD") debito++;
    }
    return { todos: itens.length, PIX: pix, CREDIT_CARD: credito, DEBIT_CARD: debito };
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

  const itensFiltrados = useMemo(() => {
    return itens
      .filter((item) => {
        if (metodo !== "todos" && item.billingType !== metodo) return false;
        if (dataInicio || dataFim) {
          const itemData = formatIsoToSaoPauloDate(item.criadoEm);
          if (dataInicio && itemData < dataInicio) return false;
          if (dataFim && itemData > dataFim) return false;
        }
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
        if (ordem === "data_asc") return a.criadoEm.localeCompare(b.criadoEm);
        if (ordem === "valor_desc") {
          const diff = b.valor - a.valor;
          return diff !== 0 ? diff : b.criadoEm.localeCompare(a.criadoEm);
        }
        if (ordem === "valor_asc") {
          const diff = a.valor - b.valor;
          return diff !== 0 ? diff : b.criadoEm.localeCompare(a.criadoEm);
        }
        return b.criadoEm.localeCompare(a.criadoEm);
      });
  }, [itens, metodo, dataInicio, dataFim, busca, ordem]);

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

  return (
    <PageContainer width="wide" className="space-y-5 py-8">
      <Link
        href={`/painel/campeonatos/${champId}/financeiro`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="size-4" /> Financeiro
      </Link>

      <div>
        <h1 className="text-xl font-bold text-ink">{titulo}</h1>
        <p className="text-sm text-ink-muted">{champNome}</p>
      </div>

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

      <FinanceiroFiltrosBar
        metodo={metodo}
        counts={counts}
        busca={busca}
        dataInicio={dataInicio}
        dataFim={dataFim}
        ordem={ordem}
        temFiltroAtivo={temFiltroAtivo}
        totalFiltrado={totalFiltradoRows}
        onMetodoChange={(m) => { setMetodo(m); setPagina(1); syncUrl({ metodo: m, page: 1 }); }}
        onBuscaChange={(q) => { setBusca(q); setPagina(1); syncUrl({ q, page: 1 }); }}
        onDataInicioChange={(ini) => { setDataInicio(ini); setPagina(1); syncUrl({ inicio: ini, page: 1 }); }}
        onDataFimChange={(f) => { setDataFim(f); setPagina(1); syncUrl({ fim: f, page: 1 }); }}
        onOrdemChange={(o) => { setOrdem(o); setPagina(1); syncUrl({ ordem: o, page: 1 }); }}
        onReset={resetFiltros}
      />

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

          {totalPages > 1 && (
            <nav className="flex items-center justify-between text-sm pt-2" aria-label="Paginação de pagamentos">
              <button
                type="button"
                onClick={() => { const n = Math.max(1, currentPage - 1); setPagina(n); syncUrl({ page: n }); }}
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
                onClick={() => { const n = Math.min(totalPages, currentPage + 1); setPagina(n); syncUrl({ page: n }); }}
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
