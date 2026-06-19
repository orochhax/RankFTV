"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText, X, ExternalLink, AlertTriangle } from "lucide-react";
import {
  updateChampionship,
  type CategoriaEditInput,
} from "@/app/painel/campeonatos/[id]/editar/actions";
import { createClient } from "@/lib/supabase/client";
import type { GeneroCategoria } from "@/lib/mock/types";
import type { PageWithStats } from "@/lib/supabase/pages";

type CatForm = {
  id?: string;
  nome: string;
  genero: GeneroCategoria;
  valorInscricao: string;
  maxDuplas: string;
  _delete?: boolean;
};

type MinhaPage = Pick<PageWithStats, "id" | "nome" | "handle">;

type Props = {
  champId: string;
  minhasPages?: MinhaPage[];
  initial: {
    nome: string;
    descricao: string;
    regulamento: string;
    regulamentoPdfUrl?: string | null;
    dataInicio: string;
    dataFim: string;
    inscricoesInicio: string;
    inscricoesFim: string;
    cidade: string;
    estado: string;
    local: string;
    liveUrl?: string;
    pageId?: string | null;
    status: "rascunho" | "inscricoes_abertas" | "em_andamento" | "encerrado";
    categorias: {
      id: string;
      nome: string;
      genero: GeneroCategoria;
      valorInscricao: number;
      maxDuplas?: number;
    }[];
  };
};

const CATEGORIAS_PRESET = [
  "Aprendiz",
  "Iniciante",
  "Intermediário",
  "Amador",
  "Qualify",
  "Profissional",
] as const;

const GENEROS: { value: GeneroCategoria; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "mista", label: "Mista" },
];

const STATUS_OPTIONS = [
  { value: "rascunho",          label: "Rascunho" },
  { value: "inscricoes_abertas", label: "Inscrições abertas" },
  { value: "em_andamento",      label: "Em andamento" },
  { value: "encerrado",         label: "Encerrado" },
] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-gray-600";

export function EditarCampeonatoForm({ champId, initial, minhasPages = [] }: Props) {
  const [pending, startTransition]      = useTransition();
  const [error, setError]               = useState<string | null>(null);
  const [mudancas, setMudancas]         = useState<string[]>([]);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const router                          = useRouter();

  const [nome, setNome]                       = useState(initial.nome);
  const [descricao, setDescricao]             = useState(initial.descricao);
  const [regulamento, setRegulamento]         = useState(initial.regulamento);
  const [pdfFile, setPdfFile]                 = useState<File | null>(null);
  const [pdfUrl, setPdfUrl]                   = useState<string | null>(initial.regulamentoPdfUrl ?? null);
  const [dataInicio, setDataInicio]           = useState(initial.dataInicio);
  const [dataFim, setDataFim]                 = useState(initial.dataFim);
  const [inscricoesInicio, setInscricoesInicio] = useState(initial.inscricoesInicio);
  const [inscricoesFim, setInscricoesFim]     = useState(initial.inscricoesFim);
  const [cidade, setCidade]                   = useState(initial.cidade);
  const [estado, setEstado]                   = useState(initial.estado);
  const [local, setLocal]                     = useState(initial.local);
  const [liveUrl, setLiveUrl]                 = useState(initial.liveUrl ?? "");
  const [pageId, setPageId]                   = useState(initial.pageId ?? "");
  const [status, setStatus]                   = useState(initial.status);
  const [categorias, setCategorias]           = useState<CatForm[]>(
    initial.categorias.map((c) => ({
      id:             c.id,
      nome:           c.nome,
      genero:         c.genero,
      valorInscricao: String(c.valorInscricao),
      maxDuplas:      c.maxDuplas ? String(c.maxDuplas) : "",
    })),
  );

  const visiveis = categorias.filter((c) => !c._delete);

  function updateCat(i: number, patch: Partial<CatForm>) {
    setCategorias((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function addCat() {
    setCategorias((cs) => [
      ...cs,
      { nome: "", genero: "masculino", valorInscricao: "", maxDuplas: "" },
    ]);
  }

  function removeCat(i: number) {
    const cat = categorias[i];
    if (cat.id) {
      // Categoria existente: marca para deleção
      updateCat(i, { _delete: true });
    } else {
      // Nova (sem id): remove direto
      setCategorias((cs) => cs.filter((_, idx) => idx !== i));
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    rascunho:           "Rascunho",
    inscricoes_abertas: "Inscrições abertas",
    em_andamento:       "Em andamento",
    encerrado:          "Encerrado",
  };

  function detectarMudancas(): string[] {
    const lista: string[] = [];

    if (nome.trim()       !== initial.nome.trim())       lista.push("Nome do campeonato alterado");
    if (descricao.trim()  !== initial.descricao.trim())  lista.push("Descrição alterada");
    if (regulamento.trim()!== initial.regulamento.trim())lista.push("Regulamento alterado");
    if (status            !== initial.status)            lista.push(`Status alterado para "${STATUS_LABEL[status]}"`);
    if (dataInicio        !== initial.dataInicio)        lista.push("Data de início do campeonato alterada");
    if (dataFim           !== initial.dataFim)           lista.push("Data de fim do campeonato alterada");
    if ((inscricoesInicio || "") !== (initial.inscricoesInicio || "")) lista.push("Abertura das inscrições alterada");
    if ((inscricoesFim    || "") !== (initial.inscricoesFim    || "")) lista.push("Encerramento das inscrições alterado");
    if (cidade.trim()     !== initial.cidade.trim())     lista.push("Cidade alterada");
    if (estado.trim().toUpperCase() !== initial.estado.trim().toUpperCase()) lista.push("Estado (UF) alterado");
    if (local.trim()      !== initial.local.trim())      lista.push("Local alterado");
    if (liveUrl.trim()    !== (initial.liveUrl ?? "").trim()) lista.push("Link da transmissão ao vivo alterado");
    if ((pageId || "")    !== (initial.pageId ?? "")) lista.push("Página vinculada alterada");
    if (pdfFile)                                         lista.push("PDF do regulamento substituído");
    if (!pdfUrl && initial.regulamentoPdfUrl)            lista.push("PDF do regulamento removido");

    // Categorias
    const removidas = categorias.filter((c) => c._delete && c.id);
    for (const c of removidas) lista.push(`Categoria removida: ${c.nome}`);

    const adicionadas = categorias.filter((c) => !c._delete && !c.id && c.nome.trim());
    for (const c of adicionadas) lista.push(`Nova categoria adicionada: ${c.nome}`);

    const iniciais = initial.categorias;
    for (const c of categorias.filter((c) => c.id && !c._delete)) {
      const orig = iniciais.find((o) => o.id === c.id);
      if (!orig) continue;
      const mudou =
        c.nome           !== orig.nome ||
        c.genero         !== orig.genero ||
        Number(c.valorInscricao) !== orig.valorInscricao ||
        (Number(c.maxDuplas) || 0) !== (orig.maxDuplas ?? 0);
      if (mudou) lista.push(`Categoria alterada: ${orig.nome}`);
    }

    return lista;
  }

  function sair() {
    router.push(`/painel/campeonatos/${champId}`);
  }

  function handleClickSalvar() {
    const lista = detectarMudancas();
    if (lista.length === 0) { sair(); return; }
    setMudancas(lista);
    setShowConfirm(true);
  }

  function handleClickSair() {
    const lista = detectarMudancas();
    if (lista.length === 0) { sair(); return; }
    setShowExitConfirm(true);
  }

  const confirmarSalvar = useCallback(() => {
    setShowConfirm(false);
    setError(null);
    startTransition(async () => {
      let regulamentoPdfUrl: string | null = pdfUrl;
      if (pdfFile) {
        const supabase = createClient();
        const filename = `${Date.now()}-${pdfFile.name.replace(/\s+/g, "_")}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("regulamentos")
          .upload(filename, pdfFile, { contentType: "application/pdf" });
        if (uploadError) {
          setError("Erro ao fazer upload do PDF. Tente novamente.");
          return;
        }
        const { data: urlData } = supabase.storage
          .from("regulamentos")
          .getPublicUrl(uploadData.path);
        regulamentoPdfUrl = urlData.publicUrl;
      }

      const payload: CategoriaEditInput[] = categorias.map((c) => ({
        id:             c.id,
        nome:           c.nome,
        genero:         c.genero,
        valorInscricao: Number(c.valorInscricao) || 0,
        maxDuplas:      Number(c.maxDuplas) || undefined,
        _delete:        c._delete,
      }));

      const res = await updateChampionship(champId, {
        nome, descricao, regulamento,
        regulamentoPdfUrl,
        dataInicio, dataFim,
        inscricoesInicio: inscricoesInicio || undefined,
        inscricoesFim:    inscricoesFim    || undefined,
        cidade, estado, local, liveUrl,
        pageId: pageId || null,
        status,
        categorias: payload,
      });

      if (res && !res.ok) {
        setError(res.error ?? "Erro ao salvar.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, descricao, regulamento, pdfUrl, pdfFile, dataInicio, dataFim,
      inscricoesInicio, inscricoesFim, cidade, estado, local, liveUrl, pageId, status, categorias]);

  return (
    <>
    {/* Modal de confirmação */}
    {showConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
        <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Confirmar alterações</p>
              <p className="text-xs text-gray-500">As seguintes informações serão atualizadas:</p>
            </div>
          </div>

          <ul className="mb-5 space-y-1.5 rounded-2xl bg-gray-50 p-4">
            {mudancas.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500" />
                {m}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <button
              onClick={confirmarSalvar}
              disabled={pending}
              className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {pending ? "Salvando…" : "Sim, salvar alterações"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={pending}
              className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 transition-colors"
            >
              Continuar editando
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal simples de saída */}
    {showExitConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setShowExitConfirm(false)} />
        <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
          <p className="font-semibold text-gray-900">Sair sem salvar?</p>
          <p className="mt-1 text-sm text-gray-500">As alterações feitas serão perdidas.</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={sair}
              className="w-full rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Sim, sair sem salvar
            </button>
            <button
              onClick={() => setShowExitConfirm(false)}
              className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Continuar editando
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Status */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Status do campeonato</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                status === opt.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          "Inscrições abertas" torna o campeonato visível para todos.
        </p>
      </div>

      {/* Informações gerais */}
      <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-800">Informações gerais</h2>

        <div>
          <label className={labelClass}>Nome do campeonato *</label>
          <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Descrição curta</label>
          <input className={inputClass} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Uma linha que resume o evento" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5rem]">
          <div>
            <label className={labelClass}>Cidade *</label>
            <input className={inputClass} value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>UF *</label>
            <input maxLength={2} className={`${inputClass} uppercase`} value={estado} onChange={(e) => setEstado(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Local (nome do espaço)</label>
          <input className={inputClass} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Praia do Gonzaga, Quadras 4 a 8" />
        </div>

        <div>
          <label className={labelClass}>Link da transmissão ao vivo</label>
          <input
            type="url"
            className={inputClass}
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            placeholder="https://youtube.com/... (opcional)"
          />
          <p className="mt-1 text-xs text-gray-400">
            Aparece como botão &ldquo;Ver ao vivo&rdquo; na página do campeonato.
          </p>
        </div>

        {minhasPages.length > 0 && (
          <div>
            <label className={labelClass}>Vincular a uma Página</label>
            <select
              className={inputClass}
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
            >
              <option value="">Sem vínculo</option>
              {minhasPages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} (@{p.handle})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Este campeonato vira uma &ldquo;edição&rdquo; da página — seguidores serão notificados ao publicar.
            </p>
          </div>
        )}
      </div>

      {/* Datas */}
      <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-800">Datas</h2>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Campeonato</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Início *</label>
              <input type="date" className={inputClass} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Fim *</label>
              <input type="date" className={inputClass} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Inscrições</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Abertura</label>
              <input type="date" className={inputClass} value={inscricoesInicio} onChange={(e) => setInscricoesInicio(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Encerramento</label>
              <input type="date" className={inputClass} value={inscricoesFim} onChange={(e) => setInscricoesFim(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Regulamento */}
      <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-800">Regulamento</h2>

        <div>
          <label className={labelClass}>Texto do regulamento</label>
          <textarea
            rows={5}
            className={inputClass}
            value={regulamento}
            onChange={(e) => setRegulamento(e.target.value)}
            placeholder="Regras, formato dos jogos, premiação…"
          />
        </div>

        <div>
          <label className={labelClass}>PDF do regulamento (opcional)</label>

          {/* PDF atual (do banco) */}
          {pdfUrl && !pdfFile && (
            <div className="mt-1 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <FileText className="size-4 shrink-0 text-green-600" />
              <span className="flex-1 truncate text-sm text-green-800">PDF salvo</span>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700"
              >
                <ExternalLink className="size-4" />
              </a>
              <button
                type="button"
                onClick={() => { setPdfUrl(null); }}
                className="text-gray-400 hover:text-red-500"
                title="Remover PDF"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Novo arquivo selecionado */}
          {pdfFile && (
            <div className="mt-1 flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
              <FileText className="size-4 shrink-0 text-blue-500" />
              <span className="flex-1 truncate text-sm text-gray-700">{pdfFile.name}</span>
              <button
                type="button"
                onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Botão de seleção (quando não há arquivo novo) */}
          {!pdfFile && (
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
              <FileText className="size-4" />
              {pdfUrl ? "Substituir PDF" : "Clique para selecionar o PDF"}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          <p className="mt-1 text-xs text-gray-400">
            Será disponibilizado como download na página do campeonato.
          </p>
        </div>
      </div>

      {/* Categorias */}
      <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Categorias *</h2>
          <p className="text-xs text-gray-400 mt-0.5">Clique para adicionar. Pelo menos uma categoria é obrigatória.</p>
        </div>

        {/* Chips de preset */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_PRESET.map((preset) => {
            const ativa = visiveis.some((c) => c.nome === preset);
            return (
              <button
                key={preset}
                type="button"
                disabled={ativa}
                onClick={() => {
                  if (!ativa)
                    setCategorias((cs) => [
                      ...cs,
                      { nome: preset, genero: "masculino", valorInscricao: "", maxDuplas: "" },
                    ]);
                }}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  ativa
                    ? "border-blue-300 bg-blue-100 text-blue-600 cursor-default"
                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {ativa ? "✓ " : "+ "}{preset}
              </button>
            );
          })}
          <button
            type="button"
            onClick={addCat}
            className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm font-medium text-gray-400 hover:border-gray-400 hover:text-gray-600"
          >
            + Outros
          </button>
        </div>

        <div className="space-y-3">
          {categorias.map((cat, i) => {
            if (cat._delete) return null;
            return (
              <div key={cat.id ?? `new-${i}`} className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_7rem_6rem_auto] sm:items-end">
                  <div>
                    <label className={labelClass}>Nome</label>
                    <input
                      className={inputClass}
                      value={cat.nome}
                      onChange={(e) => updateCat(i, { nome: e.target.value })}
                      placeholder="Ex.: Iniciante"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Gênero</label>
                    <select
                      className={inputClass}
                      value={cat.genero}
                      onChange={(e) => updateCat(i, { genero: e.target.value as GeneroCategoria })}
                    >
                      {GENEROS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Valor (R$)</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={cat.valorInscricao}
                      onChange={(e) => updateCat(i, { valorInscricao: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Máx. duplas</label>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={cat.maxDuplas}
                      onChange={(e) => updateCat(i, { maxDuplas: e.target.value })}
                      placeholder="∞"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCat(i)}
                    disabled={visiveis.length === 1}
                    aria-label="Remover categoria"
                    className="mb-1 inline-flex size-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3 pb-10">
        <button
          type="button"
          onClick={handleClickSalvar}
          disabled={pending}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={handleClickSair}
          disabled={pending}
          className="rounded-xl border border-red-200 px-6 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
        >
          Sair sem salvar
        </button>
      </div>
    </div>
    </>
  );
}
