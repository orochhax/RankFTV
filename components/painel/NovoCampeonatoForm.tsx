"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  createChampionship,
  type CategoriaInput,
} from "@/app/painel/novo-campeonato/actions";
import type { GeneroCategoria } from "@/lib/mock/types";

type CatForm = { nome: string; genero: GeneroCategoria; valorInscricao: string };

const GENEROS: { value: GeneroCategoria; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "mista", label: "Mista" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-gray-600";

export function NovoCampeonatoForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [regulamento, setRegulamento] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [local, setLocal] = useState("");
  const [categorias, setCategorias] = useState<CatForm[]>([
    { nome: "", genero: "masculino", valorInscricao: "" },
  ]);

  function updateCat(i: number, patch: Partial<CatForm>) {
    setCategorias((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addCat() {
    setCategorias((cs) => [...cs, { nome: "", genero: "masculino", valorInscricao: "" }]);
  }
  function removeCat(i: number) {
    setCategorias((cs) => (cs.length === 1 ? cs : cs.filter((_, idx) => idx !== i)));
  }

  function submit(status: "rascunho" | "inscricoes_abertas") {
    setError(null);
    const payload = {
      nome,
      descricao,
      regulamento,
      dataInicio,
      dataFim,
      cidade,
      estado,
      local,
      status,
      categorias: categorias
        .filter((c) => c.nome.trim())
        .map<CategoriaInput>((c) => ({
          nome: c.nome,
          genero: c.genero,
          valorInscricao: Number(c.valorInscricao) || 0,
        })),
    };
    startTransition(async () => {
      const res = await createChampionship(payload);
      if (res.ok) {
        router.push("/painel");
        router.refresh();
      } else {
        setError(res.error ?? "Não foi possível criar o campeonato.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("inscricoes_abertas");
      }}
      className="space-y-6"
    >
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Dados gerais */}
      <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div>
          <label className={labelClass} htmlFor="nome">
            Nome do campeonato *
          </label>
          <input
            id="nome"
            className={inputClass}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Copa Verão de Futevôlei"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="descricao">
            Descrição curta
          </label>
          <input
            id="descricao"
            className={inputClass}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Uma linha que resume o evento"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="regulamento">
            Regulamento
          </label>
          <textarea
            id="regulamento"
            rows={4}
            className={inputClass}
            value={regulamento}
            onChange={(e) => setRegulamento(e.target.value)}
            placeholder="Regras, formato dos jogos, premiação, tolerância de atraso…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="dataInicio">
              Data de início *
            </label>
            <input
              id="dataInicio"
              type="date"
              className={inputClass}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="dataFim">
              Data de fim *
            </label>
            <input
              id="dataFim"
              type="date"
              className={inputClass}
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5rem]">
          <div>
            <label className={labelClass} htmlFor="cidade">
              Cidade *
            </label>
            <input
              id="cidade"
              className={inputClass}
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex.: Santos"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="estado">
              UF *
            </label>
            <input
              id="estado"
              maxLength={2}
              className={`${inputClass} uppercase`}
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              placeholder="SP"
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="local">
            Local (nome do espaço)
          </label>
          <input
            id="local"
            className={inputClass}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex.: Praia do Gonzaga, Quadras 4 a 8"
          />
        </div>
      </div>

      {/* Categorias */}
      <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Categorias *</h2>
            <p className="text-xs text-gray-400">
              Pelo menos uma. Cada uma tem gênero e valor de inscrição.
            </p>
          </div>
          <button
            type="button"
            onClick={addCat}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Plus className="size-4" /> Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {categorias.map((cat, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5 sm:grid-cols-[1fr_8rem_7rem_auto] sm:items-end"
            >
              <div>
                <label className={labelClass}>Nome</label>
                <input
                  className={inputClass}
                  value={cat.nome}
                  onChange={(e) => updateCat(i, { nome: e.target.value })}
                  placeholder="A, B, Mista…"
                />
              </div>
              <div>
                <label className={labelClass}>Gênero</label>
                <select
                  className={inputClass}
                  value={cat.genero}
                  onChange={(e) =>
                    updateCat(i, { genero: e.target.value as GeneroCategoria })
                  }
                >
                  {GENEROS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
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
                  placeholder="100"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCat(i)}
                disabled={categorias.length === 1}
                aria-label="Remover categoria"
                className="mb-1 inline-flex size-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Publicar campeonato"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit("rascunho")}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Salvar como rascunho
        </button>
        <p className="text-xs text-gray-400">
          Publicar abre as inscrições e mostra na lista pública. Rascunho fica só pra você.
        </p>
      </div>
    </form>
  );
}
