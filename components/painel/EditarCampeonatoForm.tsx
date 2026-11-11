"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Layers,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  updateChampionship,
  type CategoriaEditInput,
} from "@/app/painel/campeonatos/[id]/editar/actions";
import { createClient } from "@/lib/supabase/client";
import { validatePdfUpload } from "@/lib/upload-preflight";
import { ChampBannerForm } from "@/components/painel/ChampBannerForm";
import { ExcluirCampeonatoButton } from "@/components/painel/ExcluirCampeonatoButton";
import type { GeneroCategoria } from "@/lib/types";

type CatForm = {
  id?: string;
  nome: string;
  genero: GeneroCategoria;
  valorInscricao: string;
  maxDuplas: string;
  _delete?: boolean;
};

type EditorTab = "geral" | "banner" | "datas" | "categorias" | "risco";

type Props = {
  champId: string;
  initialBannerUrl?: string | null;
  initial: {
    nome: string;
    descricao: string;
    regulamento: string;
    regulamentoPdfUrl?: string | null;
    dataInicio: string;
    dataFim: string;
    inscricoesInicio: string;
    inscricoesFim: string;
    prevendaInicio?: string;
    prevendaFim?: string;
    cidade: string;
    estado: string;
    local: string;
    liveUrl?: string;
    status: "rascunho" | "inscricoes_abertas" | "em_andamento" | "encerrado";
    usaMotorCategoria: boolean;
    permiteTrocaDupla?: boolean;
    prazoLimiteTrocaDupla?: string;
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
  { value: "rascunho", label: "Rascunho" },
  { value: "inscricoes_abertas", label: "Inscrições abertas" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "encerrado", label: "Encerrado" },
] as const;

const TABS: Array<{ id: EditorTab; label: string; icon: typeof SlidersHorizontal }> = [
  { id: "geral", label: "Geral & Local", icon: SlidersHorizontal },
  { id: "banner", label: "Banner & Visual", icon: ImageIcon },
  { id: "datas", label: "Datas & Troca", icon: CalendarDays },
  { id: "categorias", label: "Categorias & Regras", icon: Layers },
  { id: "risco", label: "Zona de Risco", icon: ShieldAlert },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const labelClass = "block text-xs font-medium text-ink-muted";

export function EditarCampeonatoForm({ champId, initialBannerUrl = null, initial }: Props) {
  const [activeTab, setActiveTab] = useState<EditorTab>("geral");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mudancas, setMudancas] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [nome, setNome] = useState(initial.nome);
  const [descricao, setDescricao] = useState(initial.descricao);
  const [regulamento, setRegulamento] = useState(initial.regulamento);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initial.regulamentoPdfUrl ?? null);
  const [dataInicio, setDataInicio] = useState(initial.dataInicio);
  const [dataFim, setDataFim] = useState(initial.dataFim);
  const [inscricoesInicio, setInscricoesInicio] = useState(initial.inscricoesInicio);
  const [inscricoesFim, setInscricoesFim] = useState(initial.inscricoesFim);
  const [prevendaInicio, setPrevendaInicio] = useState(initial.prevendaInicio ?? "");
  const [prevendaFim, setPrevendaFim] = useState(initial.prevendaFim ?? "");
  const [cidade, setCidade] = useState(initial.cidade);
  const [estado, setEstado] = useState(initial.estado);
  const [local, setLocal] = useState(initial.local);
  const [liveUrl, setLiveUrl] = useState(initial.liveUrl ?? "");
  const [status, setStatus] = useState(initial.status);
  const [permiteTrocaDupla, setPermiteTrocaDupla] = useState(initial.permiteTrocaDupla ?? true);
  const [prazoLimiteTrocaDupla, setPrazoLimiteTrocaDupla] = useState(
    initial.prazoLimiteTrocaDupla ?? "",
  );
  const [categorias, setCategorias] = useState<CatForm[]>(
    initial.categorias.map((c) => ({
      id: c.id,
      nome: c.nome,
      genero: c.genero,
      valorInscricao: String(c.valorInscricao),
      maxDuplas: c.maxDuplas ? String(c.maxDuplas) : "",
    })),
  );

  const visiveis = categorias.filter((c) => !c._delete);
  const notificaAtletas =
    dataInicio !== initial.dataInicio ||
    dataFim !== initial.dataFim ||
    cidade.trim() !== initial.cidade.trim() ||
    estado.trim().toUpperCase() !== initial.estado.trim().toUpperCase() ||
    local.trim() !== initial.local.trim();

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
      updateCat(i, { _delete: true });
    } else {
      setCategorias((cs) => cs.filter((_, idx) => idx !== i));
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    rascunho: "Rascunho",
    inscricoes_abertas: "Inscrições abertas",
    em_andamento: "Em andamento",
    encerrado: "Encerrado",
  };

  function detectarMudancas(): string[] {
    const lista: string[] = [];

    if (nome.trim() !== initial.nome.trim()) lista.push("Nome do campeonato alterado");
    if (descricao.trim() !== initial.descricao.trim()) lista.push("Descrição alterada");
    if (regulamento.trim() !== initial.regulamento.trim()) lista.push("Regulamento alterado");
    if (status !== initial.status) lista.push(`Status alterado para "${STATUS_LABEL[status]}"`);
    if (dataInicio !== initial.dataInicio) lista.push("Data de início do campeonato alterada");
    if (dataFim !== initial.dataFim) lista.push("Data de fim do campeonato alterada");
    if ((inscricoesInicio || "") !== (initial.inscricoesInicio || "")) {
      lista.push("Abertura das inscrições alterada");
    }
    if ((inscricoesFim || "") !== (initial.inscricoesFim || "")) {
      lista.push("Encerramento das inscrições alterado");
    }
    if ((prevendaInicio || "") !== (initial.prevendaInicio ?? "")) {
      lista.push("Data de início da pré-venda alterada");
    }
    if ((prevendaFim || "") !== (initial.prevendaFim ?? "")) {
      lista.push("Data de fim da pré-venda alterada");
    }
    if (cidade.trim() !== initial.cidade.trim()) lista.push("Cidade alterada");
    if (estado.trim().toUpperCase() !== initial.estado.trim().toUpperCase()) {
      lista.push("Estado (UF) alterado");
    }
    if (local.trim() !== initial.local.trim()) lista.push("Local alterado");
    if (liveUrl.trim() !== (initial.liveUrl ?? "").trim()) {
      lista.push("Link da transmissão ao vivo alterado");
    }
    if (permiteTrocaDupla !== (initial.permiteTrocaDupla ?? true)) {
      lista.push("Regra de troca de dupla alterada");
    }
    if ((prazoLimiteTrocaDupla || "") !== (initial.prazoLimiteTrocaDupla ?? "")) {
      lista.push("Prazo limite de troca de dupla alterado");
    }
    if (pdfFile) lista.push("PDF do regulamento substituído");
    if (!pdfUrl && initial.regulamentoPdfUrl) lista.push("PDF do regulamento removido");
    if (initial.usaMotorCategoria) {
      lista.push("Recomendação de categoria desativada na V1");
    }

    const removidas = categorias.filter((c) => c._delete && c.id);
    for (const c of removidas) lista.push(`Categoria removida: ${c.nome}`);

    const adicionadas = categorias.filter((c) => !c._delete && !c.id && c.nome.trim());
    for (const c of adicionadas) lista.push(`Nova categoria adicionada: ${c.nome}`);

    const iniciais = initial.categorias;
    for (const c of categorias.filter((c) => c.id && !c._delete)) {
      const orig = iniciais.find((o) => o.id === c.id);
      if (!orig) continue;
      const mudou =
        c.nome !== orig.nome ||
        c.genero !== orig.genero ||
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
    if (lista.length === 0) {
      sair();
      return;
    }
    setMudancas(lista);
    setShowConfirm(true);
  }

  function handleClickSair() {
    const lista = detectarMudancas();
    if (lista.length === 0) {
      sair();
      return;
    }
    setShowExitConfirm(true);
  }

  const confirmarSalvar = useCallback(() => {
    setShowConfirm(false);
    setError(null);
    if (!dataInicio || !dataFim) {
      setError("Informe as datas de início e fim do evento.");
      setActiveTab("datas");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (dataFim < dataInicio) {
      setError("A data de fim do evento não pode ser antes do início.");
      setActiveTab("datas");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!inscricoesInicio || !inscricoesFim) {
      setError("Informe a abertura e o encerramento das inscrições.");
      setActiveTab("datas");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (inscricoesFim < inscricoesInicio) {
      setError("O encerramento das inscrições não pode ser antes da abertura.");
      setActiveTab("datas");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if ((prevendaInicio && !prevendaFim) || (!prevendaInicio && prevendaFim)) {
      setError("Preencha as duas datas da pré-venda, ou deixe as duas em branco.");
      setActiveTab("datas");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (prevendaInicio && prevendaFim && prevendaFim < prevendaInicio) {
      setError("A data de fim da pré-venda não pode ser antes do início.");
      setActiveTab("datas");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    startTransition(async () => {
      let regulamentoPdfUrl: string | null = pdfUrl;
      if (pdfFile) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Sessão expirada.");
          return;
        }
        const filename = `${Date.now()}-${pdfFile.name.replace(/\s+/g, "_")}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("regulamentos")
          .upload(`${user.id}/${filename}`, pdfFile, { contentType: "application/pdf" });
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
        id: c.id,
        nome: c.nome,
        genero: c.genero,
        valorInscricao: Number(c.valorInscricao) || 0,
        maxDuplas: Number(c.maxDuplas) || undefined,
        _delete: c._delete,
      }));

      const res = await updateChampionship(champId, {
        nome,
        descricao,
        regulamento,
        regulamentoPdfUrl,
        dataInicio,
        dataFim,
        inscricoesInicio: inscricoesInicio || undefined,
        inscricoesFim: inscricoesFim || undefined,
        prevendaInicio: prevendaInicio || undefined,
        prevendaFim: prevendaFim || undefined,
        cidade,
        estado,
        local,
        liveUrl,
        status,
        usaMotorCategoria: false,
        permiteTrocaDupla,
        prazoLimiteTrocaDupla: prazoLimiteTrocaDupla.trim() || undefined,
        categorias: payload,
      });

      if (res && !res.ok) {
        const message = res.error ?? "Erro ao salvar.";
        setError(message);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, [
    champId,
    nome,
    descricao,
    regulamento,
    pdfUrl,
    pdfFile,
    dataInicio,
    dataFim,
    inscricoesInicio,
    inscricoesFim,
    prevendaInicio,
    prevendaFim,
    cidade,
    estado,
    local,
    liveUrl,
    status,
    permiteTrocaDupla,
    prazoLimiteTrocaDupla,
    categorias,
  ]);

  const changesPreview = detectarMudancas();

  return (
    <>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Confirmar alterações</p>
                <p className="text-xs text-gray-500">As seguintes informações serão atualizadas:</p>
              </div>
            </div>

            <ul className="mb-5 space-y-1.5 rounded-2xl bg-surface-2 p-4">
              {mudancas.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                  {m}
                </li>
              ))}
            </ul>

            {notificaAtletas && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-brand-border bg-brand-soft p-4 text-sm text-ink"
              >
                <p className="font-semibold">Aviso automático aos atletas</p>
                <p className="mt-1">
                  Ao salvar alterações na data ou no local, todos os atletas com inscrição paga e ativa receberão um e-mail e uma notificação com as informações anteriores e novas.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={confirmarSalvar}
                disabled={pending}
                className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                {pending ? "Salvando…" : "Sim, salvar alterações"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={pending}
                className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-60"
              >
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowExitConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <p className="font-semibold text-gray-900">Sair sem salvar?</p>
            <p className="mt-1 text-sm text-gray-500">As alterações feitas serão perdidas.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={sair}
                className="w-full rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Sim, sair sem salvar
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        {/* Navegação em 5 Abas */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-1.5">
          <div className="flex min-w-max gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? t.id === "risco"
                        ? "bg-rose-600 text-white"
                        : "bg-brand text-white shadow-xs"
                      : t.id === "risco"
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Conteúdo da Aba Selecionada */}
          <div className="min-w-0 space-y-6">
            {activeTab === "geral" && (
              <>
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <h2 className="mb-3 text-sm font-bold text-ink">Status do campeonato</h2>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(opt.value)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                          status === opt.value
                            ? "bg-brand-dark text-white"
                            : "bg-surface-2 text-ink-muted hover:text-ink"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">
                    &ldquo;Inscrições abertas&rdquo; torna o campeonato visível na vitrine pública.
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
                  <h2 className="text-sm font-bold text-ink">Informações gerais & Local</h2>

                  <div>
                    <label className={labelClass}>Nome do campeonato *</label>
                    <input
                      className={inputClass}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Descrição curta</label>
                    <input
                      className={inputClass}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Uma linha que resume o evento"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5rem]">
                    <div>
                      <label className={labelClass}>Cidade *</label>
                      <input
                        className={inputClass}
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>UF *</label>
                      <input
                        maxLength={2}
                        className={`${inputClass} uppercase`}
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Local (nome do espaço)</label>
                    <input
                      className={inputClass}
                      value={local}
                      onChange={(e) => setLocal(e.target.value)}
                      placeholder="Ex.: Praia do Gonzaga, Quadras 4 a 8"
                    />
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
                    <p className="mt-1 text-xs text-ink-muted">
                      Aparece como botão &ldquo;Ver ao vivo&rdquo; na página pública do evento.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === "banner" && (
              <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
                <div>
                  <h2 className="text-sm font-bold text-ink">Banner oficial do evento</h2>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    O envio de imagem do banner é salvo imediatamente e atualizado na vitrine pública.
                  </p>
                </div>
                <ChampBannerForm
                  champId={champId}
                  initialBannerUrl={initialBannerUrl}
                  bannerFrom="from-brand-dark"
                  bannerTo="to-brand-dark-2"
                />
              </div>
            )}

            {activeTab === "datas" && (
              <>
                <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
                  <h2 className="text-sm font-bold text-ink">Calendário oficial</h2>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-ink-muted">Campeonato</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label className={labelClass}>Início *</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={dataInicio}
                          onChange={(e) => setDataInicio(e.target.value)}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className={labelClass}>Fim *</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink-muted">Pré-venda</p>
                      {(prevendaInicio || prevendaFim) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPrevendaInicio("");
                            setPrevendaFim("");
                          }}
                          className="text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          Remover data
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label className={labelClass}>Início</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={prevendaInicio}
                          onChange={(e) => setPrevendaInicio(e.target.value)}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className={labelClass}>Fim</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={prevendaFim}
                          onChange={(e) => setPrevendaFim(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-ink-muted">
                      Opcional. Se preencher, informe as duas datas.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-ink-muted">Inscrições</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label className={labelClass}>Abertura *</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={inscricoesInicio}
                          onChange={(e) => setInscricoesInicio(e.target.value)}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className={labelClass}>Encerramento *</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={inscricoesFim}
                          onChange={(e) => setInscricoesFim(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
                  <div>
                    <h2 className="text-sm font-bold text-ink">Alteração de Duplas / Parceiro</h2>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Defina se o atleta titular poderá substituir seu parceiro e até quando isso é permitido.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={permiteTrocaDupla}
                      onChange={(e) => setPermiteTrocaDupla(e.target.checked)}
                      className="size-4 rounded border-border text-brand focus:ring-brand"
                    />
                    Permitir que o titular substitua o parceiro de dupla
                  </label>

                  {!permiteTrocaDupla ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                      A troca de duplas estará bloqueada. O atleta verá um aviso no checkout informando que este evento não permite alteração após o pagamento.
                    </p>
                  ) : (
                    <div>
                      <label className={labelClass}>
                        Prazo limite para troca de dupla (opcional)
                      </label>
                      <input
                        type="datetime-local"
                        className={inputClass}
                        value={prazoLimiteTrocaDupla}
                        onChange={(e) => setPrazoLimiteTrocaDupla(e.target.value)}
                      />
                      <p className="mt-1 text-xs text-ink-muted">
                        Se deixar em branco, a troca será permitida até o início do campeonato ou confirmação do chaveamento.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "categorias" && (
              <>
                <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
                  <div>
                    <h2 className="text-sm font-bold text-ink">Categorias *</h2>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Clique nos atalhos para adicionar. Pelo menos uma categoria é obrigatória.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS_PRESET.map((preset) => {
                      const ativa = visiveis.some((c) => c.nome === preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={ativa}
                          onClick={() => {
                            if (!ativa) {
                              setCategorias((cs) => [
                                ...cs,
                                {
                                  nome: preset,
                                  genero: "masculino",
                                  valorInscricao: "",
                                  maxDuplas: "",
                                },
                              ]);
                            }
                          }}
                          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                            ativa
                              ? "cursor-default border-brand-border bg-brand-soft text-brand-ink"
                              : "border-border bg-surface text-ink-muted hover:border-brand-border hover:bg-brand-soft hover:text-brand-ink"
                          }`}
                        >
                          {ativa ? "✓ " : "+ "}
                          {preset}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addCat}
                      className="rounded-full border border-dashed border-border px-3 py-1 text-sm font-medium text-ink-muted hover:border-ink-muted hover:text-ink"
                    >
                      + Outros
                    </button>
                  </div>

                  <div className="space-y-3">
                    {categorias.map((cat, i) => {
                      if (cat._delete) return null;
                      return (
                        <div
                          key={cat.id ?? `new-${i}`}
                          className="rounded-xl border border-border bg-surface-2/40 p-3"
                        >
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
                              className="mb-1 inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
                  <h2 className="text-sm font-bold text-ink">Regulamento</h2>

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

                    {pdfUrl && !pdfFile && (
                      <div className="mt-1 flex items-center gap-3 rounded-lg border border-brand-border bg-brand-soft px-3 py-2">
                        <FileText className="size-4 shrink-0 text-brand" />
                        <span className="flex-1 truncate text-sm text-ink">PDF salvo</span>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-ink hover:text-brand"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setPdfUrl(null);
                          }}
                          className="text-gray-400 hover:text-rose-500"
                          title="Remover PDF"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    )}

                    {pdfFile && (
                      <div className="mt-1 flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                        <FileText className="size-4 shrink-0 text-brand" />
                        <span className="flex-1 truncate text-sm text-ink">{pdfFile.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPdfFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="text-gray-400 hover:text-rose-500"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    )}

                    {!pdfFile && (
                      <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-ink-muted hover:border-brand hover:text-brand-ink">
                        <FileText className="size-4" />
                        {pdfUrl ? "Substituir PDF" : "Clique para selecionar o PDF"}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            const validation = await validatePdfUpload(file);
                            if (!validation.ok) {
                              setError(validation.error);
                              return;
                            }
                            setPdfFile(file);
                          }}
                        />
                      </label>
                    )}

                    <p className="mt-1 text-xs text-ink-muted">
                      Será disponibilizado para download na página do campeonato.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === "risco" && (
              <div className="rounded-2xl border border-danger/25 bg-danger-bg p-6 space-y-4">
                <div>
                  <h2 className="text-base font-bold text-danger">Zona de perigo</h2>
                  <p className="mt-1 text-sm text-danger/85">
                    Excluir apaga o campeonato permanentemente — inscrições, chaveamento e resultados deixarão de existir caso ainda não haja movimentação financeira.
                  </p>
                </div>
                <ExcluirCampeonatoButton champId={champId} champNome={initial.nome} />
              </div>
            )}
          </div>

          {/* Barra Lateral Sticky de Resumo e Publicação */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Resumo do cadastro
                </p>
                <p className="mt-1 truncate text-base font-bold text-ink">{nome || "Sem nome"}</p>
                <p className="text-xs text-ink-muted">
                  {cidade || "Cidade"} — {(estado || "UF").toUpperCase()}
                </p>
              </div>

              <div className="space-y-2 border-y border-border py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Status atual</span>
                  <span className="font-semibold text-ink">{STATUS_LABEL[status]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Categorias ativas</span>
                  <span className="font-semibold text-ink">{visiveis.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Troca de dupla</span>
                  <span className="font-semibold text-ink">
                    {permiteTrocaDupla ? "Permitida" : "Bloqueada"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Alterações pendentes</span>
                  <span
                    className={`font-bold ${
                      changesPreview.length > 0 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {changesPreview.length > 0 ? `${changesPreview.length} item(ns)` : "Em dia"}
                  </span>
                </div>
              </div>

              {changesPreview.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold">Você editou:</p>
                  <ul className="space-y-0.5">
                    {changesPreview.slice(0, 4).map((m, idx) => (
                      <li key={idx} className="truncate">
                        • {m}
                      </li>
                    ))}
                    {changesPreview.length > 4 && (
                      <li className="font-medium">+ {changesPreview.length - 4} outras</li>
                    )}
                  </ul>
                </div>
              )}

              {changesPreview.length === 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  Nenhuma alteração pendente de salvar.
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleClickSalvar}
                  disabled={pending}
                  className="w-full rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
                >
                  {pending ? "Salvando…" : "Salvar alterações"}
                </button>
                <button
                  type="button"
                  onClick={handleClickSair}
                  disabled={pending}
                  className="w-full rounded-xl border border-border px-5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
                >
                  {changesPreview.length > 0 ? "Sair sem salvar" : "Voltar à visão geral"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
