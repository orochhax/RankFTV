"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FileText, X, Search, CheckCircle2, Trophy, Ticket, Plus, ArrowLeft, ArrowRight } from "lucide-react";
import {
  createChampionship,
  type CategoriaInput,
  type IngressoPlateiaInput,
} from "@/app/painel/novo-campeonato/actions";
import { createClient } from "@/lib/supabase/client";
import type { GeneroCategoria } from "@/lib/types";
import {
  QUIZ_QUESTIONS,
  calcularTierDoQuiz,
  TIER_LABEL,
  TIER_STYLES,
  type QuizAnswers,
} from "@/lib/tier";
import type { PageWithStats } from "@/lib/supabase/pages";

type CatForm = { nome: string; genero: GeneroCategoria; valorInscricao: string; maxDuplas: string };
type IngForm = { nome: string; valor: string };
type MinhaPage = Pick<PageWithStats, "id" | "nome" | "handle">;
type StepKey = "geral" | "categorias" | "ingressos";

const GENEROS: { value: GeneroCategoria; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "mista", label: "Mista" },
];

const CATEGORIAS_PRESET = [
  "Aprendiz",
  "Iniciante",
  "Intermediário",
  "Amador",
  "Qualify",
  "Profissional",
] as const;

const STEP_LABEL: Record<StepKey, string> = {
  geral: "Dados do campeonato",
  categorias: "Categorias (atletas)",
  ingressos: "Ingressos (plateia)",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-gray-600";

export function NovoCampeonatoForm({ minhasPages = [], elite = false }: { minhasPages?: MinhaPage[]; elite?: boolean }) {
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
  const [prevendaInicio, setPrevendaInicio] = useState("");
  const [prevendaFim, setPrevendaFim] = useState("");
  const [bannerUrl] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [local, setLocal] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [pageId, setPageId] = useState("");
  const [pageSearch, setPageSearch] = useState("");
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const pageSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pageSearchRef.current && !pageSearchRef.current.contains(e.target as Node)) {
        setPageDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const [categorias, setCategorias] = useState<CatForm[]>([
    { nome: "", genero: "masculino", valorInscricao: "", maxDuplas: "" },
  ]);
  const [ingressos, setIngressos] = useState<IngForm[]>([{ nome: "", valor: "" }]);
  const [quiz, setQuiz] = useState<Partial<QuizAnswers>>({});

  // O que o organizador vai vender (define quais etapas aparecem).
  const [vender, setVender] = useState<{ atleta: boolean; plateia: boolean }>({ atleta: true, plateia: false });
  const [stepIdx, setStepIdx] = useState(0);

  const quizCompleto = QUIZ_QUESTIONS.every((q) => quiz[q.key] !== undefined);
  const tierPreview = quizCompleto ? calcularTierDoQuiz(quiz as QuizAnswers) : null;

  // Sequência de etapas: geral → (categorias se atleta) → (ingressos se plateia).
  // Atleta sempre vem antes da plateia.
  const sequence: StepKey[] = [
    "geral",
    ...(vender.atleta ? (["categorias"] as StepKey[]) : []),
    ...(vender.plateia ? (["ingressos"] as StepKey[]) : []),
  ];
  const idx = Math.min(stepIdx, sequence.length - 1);
  const stepKey = sequence[idx];
  const isFirst = idx === 0;
  const isLast = idx === sequence.length - 1;

  function updateCat(i: number, patch: Partial<CatForm>) {
    setCategorias((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  function addCat(nomeCat = "") {
    setCategorias((cs) => [...cs, { nome: nomeCat, genero: "masculino", valorInscricao: "", maxDuplas: "" }]);
  }
  const nomesUsados = new Set(categorias.map((c) => c.nome));
  function removeCat(i: number) {
    setCategorias((cs) => (cs.length === 1 ? cs : cs.filter((_, j) => j !== i)));
  }

  function updateIng(i: number, patch: Partial<IngForm>) {
    setIngressos((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  function addIng() {
    setIngressos((cs) => [...cs, { nome: "", valor: "" }]);
  }
  function removeIng(i: number) {
    setIngressos((cs) => (cs.length === 1 ? cs : cs.filter((_, j) => j !== i)));
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function nextStep() {
    setError(null);
    if (stepKey === "geral") {
      if (!nome.trim()) return fail("Dê um nome ao campeonato.");
      if (!dataInicio || !dataFim) return fail("Informe as datas de início e fim.");
      if (dataFim < dataInicio) return fail("A data de fim não pode ser antes do início.");
      if (!cidade.trim() || !estado.trim()) return fail("Informe a cidade e o estado.");
      if (!quizCompleto) return fail("Responda as 5 perguntas do nível.");
      if (!vender.atleta && !vender.plateia) return fail("Escolha o que vai vender: atleta, plateia ou os dois.");
    }
    if (stepKey === "categorias" && !categorias.some((c) => c.nome.trim())) {
      return fail("Adicione pelo menos uma categoria.");
    }
    setStepIdx(idx + 1);
    scrollTop();
  }

  function fail(msg: string) {
    setError(msg);
    scrollTop();
  }

  function prevStep() {
    setError(null);
    setStepIdx(Math.max(0, idx - 1));
    scrollTop();
  }

  function submit() {
    setError(null);
    if (!vender.atleta && !vender.plateia) return fail("Escolha o que vai vender: atleta, plateia ou os dois.");
    if (vender.atleta && !categorias.some((c) => c.nome.trim())) return fail("Adicione pelo menos uma categoria.");
    if (vender.plateia && !ingressos.some((i) => i.nome.trim())) return fail("Adicione pelo menos um ingresso de plateia.");

    startTransition(async () => {
      let regulamentoPdfUrl: string | undefined;
      if (pdfFile) {
        const supabase = createClient();
        const filename = `${Date.now()}-${pdfFile.name.replace(/\s+/g, "_")}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("regulamentos")
          .upload(filename, pdfFile, { contentType: "application/pdf" });
        if (uploadError) return fail("Erro ao fazer upload do PDF. Tente novamente.");
        const { data: urlData } = supabase.storage.from("regulamentos").getPublicUrl(uploadData.path);
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
        prevendaInicio:   prevendaInicio   || undefined,
        prevendaFim:      prevendaFim      || undefined,
        bannerUrl:        bannerUrl.trim() || undefined,
        cidade,
        estado,
        local,
        liveUrl: liveUrl.trim() || undefined,
        pageId: pageId || undefined,
        status: "rascunho" as const,
        tierQuiz: quiz as QuizAnswers,
        elite,
        categorias: vender.atleta
          ? categorias.filter((c) => c.nome.trim()).map<CategoriaInput>((c) => ({
              nome:           c.nome,
              genero:         c.genero,
              valorInscricao: Number(c.valorInscricao) || 0,
              maxDuplas:      Number(c.maxDuplas) || undefined,
            }))
          : [],
        ingressosPlateia: vender.plateia
          ? ingressos.filter((i) => i.nome.trim()).map<IngressoPlateiaInput>((i) => ({
              nome:  i.nome.trim(),
              valor: Number(i.valor) || 0,
            }))
          : [],
      };

      const res = await createChampionship(payload);
      if (res.ok && res.id) {
        router.push(`/painel/campeonatos/${res.id}/criado`);
      } else {
        fail(res.error ?? "Não foi possível criar o campeonato.");
      }
    });
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Indicador de etapa */}
      <div className="flex items-center gap-2">
        {sequence.map((k, i) => (
          <div key={k} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                i === idx ? "bg-blue-600 text-white" : i < idx ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </span>
            {i < sequence.length - 1 && <span className="h-px w-6 bg-gray-200" />}
          </div>
        ))}
        <span className="ml-1 text-sm font-medium text-gray-700">
          {STEP_LABEL[stepKey]}{" "}
          <span className="text-gray-400">· etapa {idx + 1} de {sequence.length}</span>
        </span>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {/* ───────── ETAPA 1: GERAL ───────── */}
      {stepKey === "geral" && (
        <>
          {/* Dados gerais */}
          <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-gray-800">Informações gerais</h2>

            <div>
              <label className={labelClass} htmlFor="nome">Nome do campeonato *</label>
              <input id="nome" className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Copa Verão de Futevôlei" />
            </div>

            <div>
              <label className={labelClass} htmlFor="descricao">Descrição curta</label>
              <input id="descricao" className={inputClass} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Uma linha que resume o evento" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5rem]">
              <div>
                <label className={labelClass} htmlFor="cidade">Cidade *</label>
                <input id="cidade" className={inputClass} value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex.: Santos" />
              </div>
              <div>
                <label className={labelClass} htmlFor="estado">UF *</label>
                <input id="estado" maxLength={2} className={`${inputClass} uppercase`} value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="SP" />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="local">Local (nome do espaço)</label>
              <input id="local" className={inputClass} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Praia do Gonzaga, Quadras 4 a 8" />
            </div>

            <div>
              <label className={labelClass} htmlFor="liveUrl">Link da transmissão ao vivo</label>
              <input id="liveUrl" type="url" className={inputClass} value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://youtube.com/... (opcional)" />
              <p className="mt-1 text-xs text-gray-400">
                Aparece como botão &ldquo;Ver ao vivo&rdquo; na página do campeonato. Pode adicionar depois.
              </p>
            </div>

            {minhasPages.length > 0 && (
              <div ref={pageSearchRef}>
                <label className={labelClass}>Vincular a uma Página</label>
                {(() => {
                  const selected = minhasPages.find((p) => p.id === pageId);
                  const filtered = minhasPages.filter((p) =>
                    p.nome.toLowerCase().includes(pageSearch.toLowerCase()) ||
                    p.handle.toLowerCase().includes(pageSearch.toLowerCase())
                  );
                  return (
                    <div className="relative mt-1">
                      {selected ? (
                        <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-4 text-blue-500 shrink-0" />
                            <span className="font-medium text-blue-800">{selected.nome}</span>
                            <span className="text-blue-500">@{selected.handle}</span>
                          </div>
                          <button type="button" onClick={() => { setPageId(""); setPageSearch(""); }} className="text-blue-400 hover:text-blue-700">
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                          <input
                            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Buscar página por nome ou @handle…"
                            value={pageSearch}
                            onChange={(e) => { setPageSearch(e.target.value); setPageDropdownOpen(true); }}
                            onFocus={() => setPageDropdownOpen(true)}
                          />
                        </div>
                      )}
                      {!selected && pageDropdownOpen && pageSearch.trim().length > 0 && (
                        <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                          {filtered.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-400">Nenhuma página encontrada</p>
                          ) : (
                            filtered.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => { setPageId(p.id); setPageSearch(""); setPageDropdownOpen(false); }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-blue-50"
                              >
                                <span className="font-medium text-gray-800">{p.nome}</span>
                                <span className="text-gray-400">@{p.handle}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <p className="mt-1 text-xs text-gray-400">
                  Este campeonato vira uma &ldquo;edição&rdquo; da página — seguidores serão notificados ao publicar.
                </p>
              </div>
            )}
          </div>

          {/* Questionário de nível */}
          <div className="space-y-5 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Nível do evento</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Responda as 5 perguntas. A plataforma calcula o nível automaticamente e pode atualizá-lo conforme as inscrições chegam.
                </p>
              </div>
              {tierPreview ? (
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${TIER_STYLES[tierPreview]}`}>{TIER_LABEL[tierPreview]}</span>
              ) : (
                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">{Object.keys(quiz).length}/5</span>
              )}
            </div>

            <div className="space-y-5">
              {QUIZ_QUESTIONS.map((q, qi) => (
                <div key={q.key}>
                  <p className="mb-2 text-xs font-medium text-gray-700">{qi + 1}. {q.pergunta}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.opcoes.map((op) => {
                      const selecionado = quiz[q.key] === op.valor;
                      return (
                        <button
                          key={op.valor}
                          type="button"
                          onClick={() => setQuiz((prev) => ({ ...prev, [q.key]: op.valor as 0 | 1 | 2 | 3 }))}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            selecionado ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600"
                          }`}
                        >
                          {op.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
                  <input id="dataInicio" type="date" className={inputClass} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="dataFim">Fim *</label>
                  <input id="dataFim" type="date" className={inputClass} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Pré-venda</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Início</label>
                  <input type="date" className={inputClass} value={prevendaInicio} onChange={(e) => setPrevendaInicio(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Fim</label>
                  <input type="date" className={inputClass} value={prevendaFim} onChange={(e) => setPrevendaFim(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Inscrições</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="inscricoesInicio">Abertura</label>
                  <input id="inscricoesInicio" type="date" className={inputClass} value={inscricoesInicio} onChange={(e) => setInscricoesInicio(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="inscricoesFim">Encerramento</label>
                  <input id="inscricoesFim" type="date" className={inputClass} value={inscricoesFim} onChange={(e) => setInscricoesFim(e.target.value)} />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Opcional. Controla quando as inscrições ficam abertas automaticamente.</p>
            </div>
          </div>

          {/* Regulamento */}
          <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-gray-800">Regulamento</h2>

            <div>
              <label className={labelClass} htmlFor="regulamento">Texto do regulamento</label>
              <textarea id="regulamento" rows={4} className={inputClass} value={regulamento} onChange={(e) => setRegulamento(e.target.value)} placeholder="Regras, formato dos jogos, premiação, tolerância de atraso…" />
            </div>

            <div>
              <label className={labelClass}>PDF do regulamento (opcional)</label>
              {pdfFile ? (
                <div className="mt-1 flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <FileText className="size-4 shrink-0 text-blue-500" />
                  <span className="flex-1 truncate text-sm text-gray-700">{pdfFile.name}</span>
                  <button type="button" onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-gray-400 hover:text-red-500">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
                  <FileText className="size-4" />
                  Clique para selecionar o PDF
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
              <p className="mt-1 text-xs text-gray-400">Será disponibilizado como download na página do campeonato.</p>
            </div>
          </div>

          {/* O que vai vender */}
          <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">O que você vai vender? *</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Escolha um ou os dois. Se marcar plateia sem atleta, a etapa de categorias não aparece.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectCard
                icon={<Trophy className="size-5" />}
                titulo="Inscrição de atletas"
                desc="Categorias pra duplas jogarem"
                ativo={vender.atleta}
                onClick={() => setVender((v) => ({ ...v, atleta: !v.atleta }))}
              />
              <SelectCard
                icon={<Ticket className="size-5" />}
                titulo="Ingressos de plateia"
                desc="Vender entrada pro público"
                ativo={vender.plateia}
                onClick={() => setVender((v) => ({ ...v, plateia: !v.plateia }))}
              />
            </div>
          </div>
        </>
      )}

      {/* ───────── ETAPA: CATEGORIAS ───────── */}
      {stepKey === "categorias" && (
        <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Categorias dos atletas *</h2>
            <p className="text-xs text-gray-400 mt-0.5">Clique para adicionar. Pelo menos uma categoria é obrigatória.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIAS_PRESET.map((preset) => {
              const ativa = nomesUsados.has(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { if (!ativa) addCat(preset); }}
                  disabled={ativa}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    ativa ? "border-blue-300 bg-blue-100 text-blue-600 cursor-default" : "border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {ativa ? "✓ " : "+ "}{preset}
                </button>
              );
            })}
            <button type="button" onClick={() => addCat("")} className="rounded-full border border-dashed border-gray-400 px-3 py-1 text-sm font-medium text-gray-700 hover:border-gray-600 hover:text-gray-900">
              + Outros
            </button>
          </div>

          <div className="space-y-3">
            {categorias.map((cat, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_7rem_6rem_auto] sm:items-end">
                  <div>
                    <label className={labelClass}>Nome</label>
                    <input className={inputClass} value={cat.nome} onChange={(e) => updateCat(i, { nome: e.target.value })} placeholder="A, B, Mista…" />
                  </div>
                  <div>
                    <label className={labelClass}>Gênero</label>
                    <select className={inputClass} value={cat.genero} onChange={(e) => updateCat(i, { genero: e.target.value as GeneroCategoria })}>
                      {GENEROS.map((g) => (<option key={g.value} value={g.value}>{g.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Valor (R$)</label>
                    <input type="number" min={0} className={inputClass} value={cat.valorInscricao} onChange={(e) => updateCat(i, { valorInscricao: e.target.value })} placeholder="100" />
                  </div>
                  <div>
                    <label className={labelClass}>Máx. duplas</label>
                    <input type="number" min={1} className={inputClass} value={cat.maxDuplas} onChange={(e) => updateCat(i, { maxDuplas: e.target.value })} placeholder="∞" />
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
              </div>
            ))}
          </div>

          {(() => {
            const totalDuplas = categorias.reduce((sum, c) => sum + (Number(c.maxDuplas) || 0), 0);
            const temLimite = categorias.some((c) => Number(c.maxDuplas) > 0);
            if (!temLimite) return null;
            return (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm ring-1 ring-blue-100">
                <span className="text-blue-700 font-medium">Total do evento</span>
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-xs text-blue-500">Duplas</p>
                    <p className="font-bold text-blue-800">{totalDuplas}</p>
                  </div>
                  <div className="w-px bg-blue-200" />
                  <div>
                    <p className="text-xs text-blue-500">Jogadores</p>
                    <p className="font-bold text-blue-800">{totalDuplas * 2}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ───────── ETAPA: INGRESSOS DE PLATEIA ───────── */}
      {stepKey === "ingressos" && (
        <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Ingressos de plateia *</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tipos de ingresso (inteira, meia, VIP…) e valores. O comprador paga a taxa de serviço por cima; você recebe o valor cheio.
            </p>
          </div>

          <div className="space-y-3">
            {ingressos.map((ing, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-3 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
                <div>
                  <label className={labelClass}>Nome</label>
                  <input className={inputClass} value={ing.nome} onChange={(e) => updateIng(i, { nome: e.target.value })} placeholder="Inteira, Meia, VIP…" />
                </div>
                <div>
                  <label className={labelClass}>Valor (R$)</label>
                  <input type="number" min={0} className={inputClass} value={ing.valor} onChange={(e) => updateIng(i, { valor: e.target.value })} placeholder="0" />
                </div>
                <button
                  type="button"
                  onClick={() => removeIng(i)}
                  disabled={ingressos.length === 1}
                  aria-label="Remover ingresso"
                  className="mb-1 inline-flex size-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addIng} className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-400 px-3 py-1 text-sm font-medium text-gray-700 hover:border-gray-600 hover:text-gray-900">
            <Plus className="size-4" /> Adicionar ingresso
          </button>
          <p className="text-xs text-gray-400">Valor 0 = ingresso grátis.</p>
        </div>
      )}

      {/* ───────── Navegação ───────── */}
      <div className="flex flex-wrap items-center gap-3">
        {!isFirst && (
          <button type="button" onClick={prevStep} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <ArrowLeft className="size-4" /> Voltar
          </button>
        )}
        {!isLast ? (
          <button type="button" onClick={nextStep} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Próximo <ArrowRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors ${
              elite ? "bg-amber-400 text-gray-900 hover:bg-amber-300" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {pending ? "Criando…" : elite ? "Criar campeonato de Elite" : "Criar campeonato"}
          </button>
        )}
        {isLast && (
          <p className="text-xs text-gray-400">Cria como rascunho. Você publica e configura o recebimento no próximo passo.</p>
        )}
      </div>
    </form>
  );
}

function SelectCard({
  icon, titulo, desc, ativo, onClick,
}: {
  icon: React.ReactNode; titulo: string; desc: string; ativo: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
        ativo ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${ativo ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{titulo}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${ativo ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}>
        {ativo && <CheckCircle2 className="size-4 text-white" />}
      </span>
    </button>
  );
}
