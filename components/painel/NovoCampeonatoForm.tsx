"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, FileText, X } from "lucide-react";
import {
  createChampionship,
  type CategoriaInput,
} from "@/app/painel/novo-campeonato/actions";
import { createClient } from "@/lib/supabase/client";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [regulamento, setRegulamento] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [inscricoesInicio, setInscricoesInicio] = useState("");
  const [inscricoesFim, setInscricoesFim] = useState("");
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
    startTransition(async () => {
      // Upload do PDF antes de salvar (se selecionado)
      let regulamentoPdfUrl: string | undefined;
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

      const payload = {
        nome,
        descricao,
        regulamento,
        regulamentoPdfUrl,
        dataInicio,
        dataFim,
        inscricoesInicio: inscricoesInicio || undefined,
        inscricoesFim:    inscricoesFim    || undefined,
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
        <h2 className="text-sm font-semibold text-gray-800">Informações gerais</h2>

        <div>
          <label className={labelClass} htmlFor="nome">Nome do campeonato *</label>
          <input
            id="nome"
            className={inputClass}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Copa Verão de Futevôlei"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="descricao">Descrição curta</label>
          <input
            id="descricao"
            className={inputClass}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Uma linha que resume o evento"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5rem]">
          <div>
            <label className={labelClass} htmlFor="cidade">Cidade *</label>
            <input
              id="cidade"
              className={inputClass}
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex.: Santos"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="estado">UF *</label>
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
          <label className={labelClass} htmlFor="local">Local (nome do espaço)</label>
          <input
            id="local"
            className={inputClass}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex.: Praia do Gonzaga, Quadras 4 a 8"
          />
        </div>
      </div>

      {/* Datas */}
      <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-800">Datas</h2>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Campeonato</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="dataInicio">Início *</label>
              <input
                id="dataInicio"
                type="date"
                className={inputClass}
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="dataFim">Fim *</label>
              <input
                id="dataFim"
                type="date"
                className={inputClass}
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Inscrições</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="inscricoesInicio">Abertura</label>
              <input
                id="inscricoesInicio"
                type="date"
                className={inputClass}
                value={inscricoesInicio}
                onChange={(e) => setInscricoesInicio(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="inscricoesFim">Encerramento</label>
              <input
                id="inscricoesFim"
                type="date"
                className={inputClass}
                value={inscricoesFim}
                onChange={(e) => setInscricoesFim(e.target.value)}
              />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Opcional. Controla quando as inscrições ficam abertas automaticamente.
          </p>
        </div>
      </div>

      {/* Regulamento */}
      <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-800">Regulamento</h2>

        <div>
          <label className={labelClass} htmlFor="regulamento">Texto do regulamento</label>
          <textarea
            id="regulamento"
            rows={4}
            className={inputClass}
            value={regulamento}
            onChange={(e) => setRegulamento(e.target.value)}
            placeholder="Regras, formato dos jogos, premiação, tolerância de atraso…"
          />
        </div>

        <div>
          <label className={labelClass}>PDF do regulamento (opcional)</label>
          {pdfFile ? (
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
          ) : (
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
              <FileText className="size-4" />
              Clique para selecionar o PDF
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
                  placeholder="100"
                />
              </div>
              <button
                type="button"
                onClick={() => removeCat(i)}
                disabled={categorias.length === 1}
                aria-label="Remover categoria"
                className="mb-1 inline-flex size-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
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
          Publicar abre as inscrições. Rascunho fica só pra você.
        </p>
      </div>
    </form>
  );
}
