"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  updateChampionship,
  type CategoriaEditInput,
} from "@/app/painel/campeonatos/[id]/editar/actions";
import type { GeneroCategoria } from "@/lib/mock/types";

type CatForm = {
  id?: string;
  nome: string;
  genero: GeneroCategoria;
  valorInscricao: string;
  maxDuplas: string;
  _delete?: boolean;
};

type Props = {
  champId: string;
  initial: {
    nome: string;
    descricao: string;
    regulamento: string;
    dataInicio: string;
    dataFim: string;
    inscricoesInicio: string;
    inscricoesFim: string;
    cidade: string;
    estado: string;
    local: string;
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

export function EditarCampeonatoForm({ champId, initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome]                       = useState(initial.nome);
  const [descricao, setDescricao]             = useState(initial.descricao);
  const [regulamento, setRegulamento]         = useState(initial.regulamento);
  const [dataInicio, setDataInicio]           = useState(initial.dataInicio);
  const [dataFim, setDataFim]                 = useState(initial.dataFim);
  const [inscricoesInicio, setInscricoesInicio] = useState(initial.inscricoesInicio);
  const [inscricoesFim, setInscricoesFim]     = useState(initial.inscricoesFim);
  const [cidade, setCidade]                   = useState(initial.cidade);
  const [estado, setEstado]                   = useState(initial.estado);
  const [local, setLocal]                     = useState(initial.local);
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

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
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
        dataInicio, dataFim,
        inscricoesInicio: inscricoesInicio || undefined,
        inscricoesFim:    inscricoesFim    || undefined,
        cidade, estado, local, status,
        categorias: payload,
      });

      if (res && !res.ok) {
        setError(res.error ?? "Erro ao salvar.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      // se ok → redirect acontece no server action
    });
  }

  return (
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
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Regulamento</h2>
        <textarea
          rows={5}
          className={inputClass}
          value={regulamento}
          onChange={(e) => setRegulamento(e.target.value)}
          placeholder="Regras, formato dos jogos, premiação…"
        />
      </div>

      {/* Categorias */}
      <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Categorias *</h2>
            <p className="text-xs text-gray-400 mt-0.5">Edite, remova ou adicione categorias.</p>
          </div>
          <button
            type="button"
            onClick={addCat}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Plus className="size-4" /> Adicionar
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
          onClick={handleSubmit}
          disabled={pending}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
        <p className="text-xs text-gray-400">As alterações ficam visíveis na página pública imediatamente.</p>
      </div>
    </div>
  );
}
