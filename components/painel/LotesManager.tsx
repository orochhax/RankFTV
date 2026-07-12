"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Eye, EyeOff, Layers, Pencil, Check, X, AlertTriangle, Info, Users, Ticket, ChevronDown } from "lucide-react";
import {
  criarLote, alternarLote, excluirLote, atualizarValorBase,
  criarCategoria, excluirCategoria,
  type CriarLoteInput,
} from "@/app/painel/campeonatos/[id]/lotes/actions";
import { criarTipoIngresso, excluirTipoIngresso } from "@/app/painel/campeonatos/[id]/plateia/actions";
import { formatBRL } from "@/lib/format";
import type { GeneroCategoria } from "@/lib/types";

type Lote = {
  id: string;
  nome: string;
  valor: number;
  ordem: number;
  quantidade_maxima: number | null;
  vendidos: number;
  data_fim: string | null;
  ativo: boolean;
};

export type GrupoLote = {
  entidade: "category" | "ticket_type";
  entidadeId: string;
  label: string;
  valorBase: number;
  lotes: Lote[];
};

type Cobertura =
  | { tipo: "divergencia"; ultimaData: string; inscricoesFim: string }
  | { tipo: "info_quantidade"; inscricoesFim: string }
  | { tipo: "nenhuma" };

// Compara até quando os lotes (por data) cobrem, contra o encerramento das
// inscrições configurado no campeonato. Lotes só por quantidade não dá pra
// comparar com uma data — nesse caso só informa o prazo, sem alarde.
function analisarCobertura(lotes: Lote[], inscricoesFim: string | null): Cobertura {
  const ativos = lotes.filter((l) => l.ativo);
  if (ativos.length === 0) return { tipo: "nenhuma" };

  const comData = ativos.filter((l): l is Lote & { data_fim: string } => !!l.data_fim);
  if (comData.length === 0) {
    return inscricoesFim ? { tipo: "info_quantidade", inscricoesFim } : { tipo: "nenhuma" };
  }

  if (!inscricoesFim) return { tipo: "nenhuma" };

  const ultimaData = comData.reduce((max, l) => (l.data_fim > max ? l.data_fim : max), comData[0].data_fim);
  const fimInscricoes = new Date(inscricoesFim + "T23:59:59");
  if (new Date(ultimaData) < fimInscricoes) {
    return { tipo: "divergencia", ultimaData, inscricoesFim };
  }
  return { tipo: "nenhuma" };
}

function AvisoCobertura({ cobertura }: { cobertura: Cobertura }) {
  if (cobertura.tipo === "divergencia") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Divergência de datas: as inscrições ficam abertas até{" "}
          <strong>{new Date(cobertura.inscricoesFim + "T23:59:59").toLocaleDateString("pt-BR")}</strong>, mas o
          último lote termina em <strong>{new Date(cobertura.ultimaData).toLocaleDateString("pt-BR")}</strong>.
          Depois disso o preço volta pro valor de tabela.
        </p>
      </div>
    );
  }
  if (cobertura.tipo === "info_quantidade") {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500 ring-1 ring-black/5">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          As inscrições encerram em{" "}
          {new Date(cobertura.inscricoesFim + "T23:59:59").toLocaleDateString("pt-BR")} (definido nas
          configurações do campeonato). Esses lotes viram só por quantidade vendida.
        </p>
      </div>
    );
  }
  return null;
}

function LoteGroupCard({
  champId,
  grupo,
  mostrarAplicarTodas,
  inscricoesFim,
}: {
  champId: string;
  grupo: GrupoLote;
  mostrarAplicarTodas: boolean;
  inscricoesFim: string | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [quantidadeMaxima, setQuantidadeMaxima] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [aplicarTodasLote, setAplicarTodasLote] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [editandoValor, setEditandoValor] = useState(false);
  const [valorBaseInput, setValorBaseInput] = useState(String(grupo.valorBase));
  const [aplicarTodasValor, setAplicarTodasValor] = useState(false);

  function limparForm() {
    setNome(""); setValor(""); setQuantidadeMaxima(""); setDataFim(""); setAplicarTodasLote(false);
  }

  function salvarValorBase() {
    setErro(null);
    const novoValor = Number(valorBaseInput.replace(",", "."));
    if (isNaN(novoValor) || novoValor < 0) { setErro("Valor inválido."); return; }
    startTransition(async () => {
      const res = await atualizarValorBase(champId, grupo.entidade, grupo.entidadeId, novoValor, aplicarTodasValor);
      if (res.ok) { setEditandoValor(false); setAplicarTodasValor(false); router.refresh(); }
      else setErro(res.error ?? "Erro ao atualizar.");
    });
  }

  function adicionar() {
    setErro(null);
    if (!quantidadeMaxima.trim() && !dataFim) {
      setErro("Escolha uma data de término ou uma quantidade máxima pra esse lote.");
      return;
    }
    const input: CriarLoteInput = {
      entidade: grupo.entidade,
      entidadeId: grupo.entidadeId,
      nome,
      valor: Number(valor) || 0,
      ordem: grupo.lotes.length,
      quantidadeMaxima: quantidadeMaxima.trim() ? Math.max(1, Math.floor(Number(quantidadeMaxima))) : null,
      dataFim: dataFim || null,
      aplicarATodas: aplicarTodasLote,
    };
    startTransition(async () => {
      const res = await criarLote(champId, input);
      if (res.ok) { limparForm(); setAdding(false); router.refresh(); }
      else setErro(res.error ?? "Erro ao criar.");
    });
  }

  function alternar(loteId: string, ativo: boolean) {
    startTransition(async () => {
      await alternarLote(champId, loteId, ativo);
      router.refresh();
    });
  }

  function excluir(loteId: string) {
    if (!confirm("Excluir este lote? Vendas já feitas com ele não são afetadas.")) return;
    startTransition(async () => {
      await excluirLote(champId, loteId);
      router.refresh();
    });
  }

  const [erroGrupo, setErroGrupo] = useState<string | null>(null);

  function excluirGrupo() {
    const tipo = grupo.entidade === "category" ? "categoria" : "tipo de ingresso";
    if (!confirm(`Excluir essa ${tipo}? Essa ação não pode ser desfeita.`)) return;
    setErroGrupo(null);
    startTransition(async () => {
      const res = grupo.entidade === "category"
        ? await excluirCategoria(champId, grupo.entidadeId)
        : await excluirTipoIngresso(champId, grupo.entidadeId);
      if (!res.ok) { setErroGrupo(res.error ?? "Erro ao excluir."); return; }
      router.refresh();
    });
  }

  const input =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const lotesOrdenados = [...grupo.lotes].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v); }}
        className="flex cursor-pointer flex-wrap items-center justify-between gap-x-2 gap-y-1"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="font-semibold text-gray-900">{grupo.label}</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); excluirGrupo(); }}
            disabled={pending}
            title={grupo.entidade === "category" ? "Excluir categoria" : "Excluir tipo de ingresso"}
            className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {editandoValor ? (
            <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">R$</span>
                <input
                  autoFocus
                  value={valorBaseInput}
                  onChange={(e) => setValorBaseInput(e.target.value)}
                  inputMode="numeric"
                  className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={salvarValorBase}
                  disabled={pending}
                  title="Salvar"
                  className="rounded-lg p-1 text-green-600 hover:bg-green-50"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setEditandoValor(false); setValorBaseInput(String(grupo.valorBase)); setAplicarTodasValor(false); setErro(null); }}
                  title="Cancelar"
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {mostrarAplicarTodas && (
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <input
                    type="checkbox"
                    checked={aplicarTodasValor}
                    onChange={(e) => setAplicarTodasValor(e.target.checked)}
                    className="size-3"
                  />
                  Aplicar a todas as categorias
                </label>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setValorBaseInput(String(grupo.valorBase)); setEditandoValor(true); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600"
            >
              Valor de tabela: {grupo.valorBase <= 0 ? "Grátis" : formatBRL(grupo.valorBase)}
              <Pencil className="size-3" />
            </button>
          )}
          <ChevronDown className={`size-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>
      {editandoValor && erro && <p className="mt-1 text-right text-xs text-red-600">{erro}</p>}
      {erroGrupo && <p className="mt-1 text-xs text-red-600">{erroGrupo}</p>}
      {!expanded && (
        <p className="mt-1 text-xs text-gray-400">
          {grupo.lotes.length > 0 ? `${grupo.lotes.length} lote${grupo.lotes.length > 1 ? "s" : ""} configurado${grupo.lotes.length > 1 ? "s" : ""}` : "Sem lotes"}
        </p>
      )}

      {expanded && (
        <>
          {lotesOrdenados.length > 0 && (
            <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-xl ring-1 ring-black/5">
              {lotesOrdenados.map((l) => {
                const esgotado = l.quantidade_maxima != null && l.vendidos >= l.quantidade_maxima;
                return (
                  <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${l.ativo ? "text-gray-900" : "text-gray-400 line-through"}`}>
                        {l.nome} · {formatBRL(Number(l.valor))}
                      </p>
                      <p className="text-xs text-gray-400">
                        {l.quantidade_maxima != null
                          ? `${l.vendidos}/${l.quantidade_maxima} vendidos${esgotado ? " · esgotado" : ""}`
                          : `${l.vendidos} vendidos · sem limite`}
                        {l.data_fim && ` · até ${new Date(l.data_fim).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => alternar(l.id, !l.ativo)}
                      disabled={pending}
                      title={l.ativo ? "Desativar" : "Ativar"}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      {l.ativo ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => excluir(l.id)}
                      disabled={pending}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <AvisoCobertura cobertura={analisarCobertura(grupo.lotes, inscricoesFim)} />

          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="size-4" /> Adicionar lote
            </button>
          ) : (
            <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500">Nome do lote</label>
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="1º Lote" className={input} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Valor (R$)</label>
                  <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="numeric" placeholder="50" className={input} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Limite de unidades</label>
                  <input value={quantidadeMaxima} onChange={(e) => setQuantidadeMaxima(e.target.value)} inputMode="numeric" placeholder="Ex: 50" className={input} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500">Vale até</label>
                  <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={input} />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">Preencha data de término ou limite de unidades (pelo menos um dos dois).</p>
              {mostrarAplicarTodas && (
                <label className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={aplicarTodasLote}
                    onChange={(e) => setAplicarTodasLote(e.target.checked)}
                    className="size-3.5 rounded"
                  />
                  Aplicar esse lote a todas as categorias
                </label>
              )}
              {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={adicionar}
                  disabled={pending}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Criar lote
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); limparForm(); setErro(null); }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  titulo,
  aberto,
  onToggle,
  addLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  aberto: boolean;
  onToggle: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500">
        <Icon className="size-4" /> {titulo}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
          aberto ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
        }`}
      >
        {aberto ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
        {aberto ? "Cancelar" : addLabel}
      </button>
    </div>
  );
}

function CategoriaForm({ champId, onDone }: { champId: string; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [genero, setGenero] = useState<GeneroCategoria>("mista");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const input =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  function criar() {
    setErro(null);
    startTransition(async () => {
      const res = await criarCategoria(champId, nome, genero, Number(valor.replace(",", ".")) || 0);
      if (!res.ok) { setErro(res.error ?? "Erro ao criar."); return; }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500">Nome da categoria</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Intermediário" className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Gênero</label>
          <select value={genero} onChange={(e) => setGenero(e.target.value as GeneroCategoria)} className={input}>
            <option value="mista">Mista</option>
            <option value="masculino">Masculina</option>
            <option value="feminino">Feminina</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Valor de tabela (R$)</label>
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="numeric" placeholder="300" className={input} />
        </div>
      </div>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={criar}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Criar categoria
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TipoPlateiaForm({ champId, onDone }: { champId: string; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const input =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  function criar() {
    setErro(null);
    const nomeClean = nome.trim();
    if (!nomeClean) { setErro("Dê um nome ao ingresso."); return; }
    startTransition(async () => {
      const res = await criarTipoIngresso(champId, nomeClean, Number(valor.replace(",", ".")) || 0);
      if (!res.ok) { setErro(res.error ?? "Erro ao criar."); return; }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500">Nome do ingresso</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Visitante" className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Valor de tabela (R$)</label>
          <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="numeric" placeholder="40" className={input} />
        </div>
      </div>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={criar}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Criar tipo de ingresso
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function LotesManager({
  champId,
  grupos,
  inscricoesFim,
}: {
  champId: string;
  grupos: GrupoLote[];
  inscricoesFim: string | null;
}) {
  const categorias = grupos.filter((g) => g.entidade === "category");
  const tipos      = grupos.filter((g) => g.entidade === "ticket_type");
  const multiplasCategorias = categorias.length > 1;

  const [addingCategoria, setAddingCategoria] = useState(false);
  const [addingTipo, setAddingTipo] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-700 ring-1 ring-blue-100">
        <Layers className="mt-0.5 size-4 shrink-0" />
        <p>
          O lote com a menor ordem que ainda estiver dentro da data e da quantidade é o que vale no
          momento da compra. Sem nenhum lote configurado, continua valendo o valor de tabela.
        </p>
      </div>

      <div className="space-y-3">
        <SectionHeader
          icon={Users}
          titulo="Categorias de atleta"
          aberto={addingCategoria}
          onToggle={() => setAddingCategoria((v) => !v)}
          addLabel="Adicionar categoria"
        />
        {addingCategoria && (
          <CategoriaForm champId={champId} onDone={() => setAddingCategoria(false)} />
        )}
        {categorias.map((g) => (
          <LoteGroupCard
            key={`${g.entidade}-${g.entidadeId}`}
            champId={champId}
            grupo={g}
            mostrarAplicarTodas={multiplasCategorias}
            inscricoesFim={inscricoesFim}
          />
        ))}
      </div>

      <div className="space-y-3">
        <SectionHeader
          icon={Ticket}
          titulo="Ingressos de plateia"
          aberto={addingTipo}
          onToggle={() => setAddingTipo((v) => !v)}
          addLabel="Adicionar ingresso"
        />
        {addingTipo && (
          <TipoPlateiaForm champId={champId} onDone={() => setAddingTipo(false)} />
        )}
        {tipos.map((g) => (
          <LoteGroupCard
            key={`${g.entidade}-${g.entidadeId}`}
            champId={champId}
            grupo={g}
            mostrarAplicarTodas={false}
            inscricoesFim={inscricoesFim}
          />
        ))}
      </div>
    </div>
  );
}
