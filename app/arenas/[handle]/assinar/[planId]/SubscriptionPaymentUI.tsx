"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard, Loader2, AlertCircle, CheckCircle, ArrowLeft,
  ArrowRight, User, Dumbbell,
} from "lucide-react";
import Link from "next/link";
import { assinarPlano, assinarGratuito, salvarOnboardingAtleta } from "./actions";
import { formatBRL } from "@/lib/format";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + "." + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6);
  return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
}
function formatCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function formatExpiry(v: string, prev: string) {
  if (v.length < prev.length) return v;
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

const TAXA = 0.10;
const inputCls = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelCls = "block text-xs font-medium text-gray-500";

// ── tipos ─────────────────────────────────────────────────────────────────────

type Step = "pagamento" | "perfil" | "nivel" | "concluido";

type Props = {
  planId:               string;
  handle:               string;
  planNome:             string;
  valorBase:            number;
  cpfSalvo:             string | null;
  nomeSalvo:            string;
  dataNascimentoSalva:  string | null;
  generoSalvo:          string | null;
};

// ── step 1: Pagamento ─────────────────────────────────────────────────────────

function StepPagamento({
  planId, handle, valorBase, cpfSalvo,
  onSuccess,
}: Props & { onSuccess: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [cpf,    setCpf]    = useState(cpfSalvo ? formatCPF(cpfSalvo) : "");
  const [cep,    setCep]    = useState("");
  const [numeroEndereco, setNumeroEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [nome,   setNome]   = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv,    setCvv]    = useState("");

  const valorTotal = parseFloat((valorBase * (1 + TAXA)).toFixed(2));
  const taxa       = parseFloat((valorBase * TAXA).toFixed(2));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cpfNum = cpf.replace(/\D/g, "");
    if (cpfNum.length !== 11) { setError("CPF inválido."); return; }
    const [mes, ano] = expiry.split("/");
    if (!mes || !ano || mes.length !== 2 || ano.length !== 2) { setError("Validade inválida. Use MM/AA."); return; }
    const digits = numero.replace(/\s/g, "");
    if (digits.length < 16) { setError("Número do cartão incompleto."); return; }
    if (cvv.length < 3)     { setError("CVV inválido."); return; }
    if (!nome.trim())       { setError("Digite o nome como está no cartão."); return; }

    if (cep.replace(/\D/g, "").length !== 8) { setError("CEP invalido."); return; }
    if (!numeroEndereco.trim()) { setError("Informe o numero do endereco do titular."); return; }

    startTransition(async () => {
      const res = await assinarPlano({
        planId, handle, cpf: cpfNum, numero: digits, cep, numeroEndereco,
        nomeTitular: nome, mesValidade: mes, anoValidade: "20" + ano, cvv,
      });
      if (!res.ok) { setError(res.error); return; }
      onSuccess();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className={labelCls}>CPF do titular</label>
        <input className={inputCls} placeholder="000.000.000-00" value={cpf}
          onChange={(e) => setCpf(formatCPF(e.target.value))} inputMode="numeric" maxLength={14} required />
      </div>
      <div>
        <label className={labelCls}>Número do cartão</label>
        <div className="relative">
          <input className={`${inputCls} pr-10 font-mono tracking-widest`}
            placeholder="0000 0000 0000 0000" value={numero}
            onChange={(e) => setNumero(formatCardNumber(e.target.value))}
            inputMode="numeric" autoComplete="cc-number" required />
          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
        </div>
      </div>
      <div>
        <label className={labelCls}>Nome no cartão</label>
        <input className={`${inputCls} uppercase`} placeholder="CARLOS ROCHA"
          value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())}
          autoComplete="cc-name" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>CEP do titular</label>
          <input className={inputCls} placeholder="00000-000" value={cep}
            onChange={(e) => setCep(formatCEP(e.target.value))} inputMode="numeric"
            autoComplete="postal-code" maxLength={9} required />
        </div>
        <div>
          <label className={labelCls}>Numero</label>
          <input className={inputCls} placeholder="123" value={numeroEndereco}
            onChange={(e) => setNumeroEndereco(e.target.value.slice(0, 20))}
            autoComplete="address-line2" maxLength={20} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Validade</label>
          <input className={inputCls} placeholder="MM/AA" value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value, expiry))}
            inputMode="numeric" autoComplete="cc-exp" maxLength={5} required />
        </div>
        <div>
          <label className={labelCls}>CVV</label>
          <input className={inputCls} placeholder="•••" value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric" autoComplete="cc-csc" maxLength={4} required />
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-black/5">
        <div className="flex justify-between text-gray-500"><span>Mensalidade</span><span>{formatBRL(valorBase)}</span></div>
        <div className="mt-1 flex justify-between text-gray-500"><span>Taxa de serviço (10%)</span><span>+ {formatBRL(taxa)}</span></div>
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
          <span>Total por mês</span><span>{formatBRL(valorTotal)}</span>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">Cobrado automaticamente todo mês. Cancele a qualquer momento.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button type="submit" disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
        {pending ? <><Loader2 className="size-4 animate-spin" /> Processando…</> : `Assinar por ${formatBRL(valorTotal)}/mês`}
      </button>
      <p className="text-center text-xs text-gray-400">
        Seus dados de cartão são processados com segurança e não ficam armazenados.
      </p>
    </form>
  );
}

// ── step 2: Dados pessoais ────────────────────────────────────────────────────

function StepPerfil({
  nomeSalvo, dataNascimentoSalva, generoSalvo, onNext,
}: { nomeSalvo: string; dataNascimentoSalva: string | null; generoSalvo: string | null; onNext: (data: { nome: string; dataNascimento: string; genero: string }) => void }) {
  const [nome,           setNome]           = useState(nomeSalvo);
  const [dataNascimento, setDataNascimento] = useState(dataNascimentoSalva ?? "");
  const [genero,         setGenero]         = useState(generoSalvo ?? "");
  const [error,          setError]          = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim())       { setError("Nome é obrigatório."); return; }
    if (!dataNascimento)    { setError("Informe sua data de nascimento."); return; }
    if (!genero)            { setError("Selecione seu gênero."); return; }
    onNext({ nome: nome.trim(), dataNascimento, genero });
  }

  const generos = [
    { value: "masculino", label: "Masculino" },
    { value: "feminino",  label: "Feminino"  },
    { value: "outro",     label: "Outro"     },
  ];

  // Data máxima = 10 anos atrás (mínimo para praticar esporte)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 10);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className={labelCls}>Nome completo</label>
        <input className={inputCls} placeholder="Seu nome" value={nome}
          onChange={(e) => setNome(e.target.value)} required />
      </div>
      <div>
        <label className={labelCls}>Data de nascimento</label>
        <input type="date" className={inputCls} value={dataNascimento}
          max={maxDateStr} onChange={(e) => setDataNascimento(e.target.value)} required />
      </div>
      <div>
        <label className={labelCls}>Gênero</label>
        <div className="mt-1 flex gap-2">
          {generos.map((g) => (
            <button key={g.value} type="button"
              onClick={() => setGenero(g.value)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                genero === g.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
        Continuar <ArrowRight className="size-4" />
      </button>
    </form>
  );
}

// ── step 3: Nível do atleta ───────────────────────────────────────────────────

type NivelData = {
  experiencia:   string;
  esportes:      string[];
  frequencia:    string;
  autoavaliacao: string;
};

function StepNivel({ onNext }: { onNext: (data: NivelData) => void }) {
  const [experiencia,   setExperiencia]   = useState("");
  const [esportes,      setEsportes]      = useState<string[]>([]);
  const [frequencia,    setFrequencia]    = useState("");
  const [autoavaliacao, setAutoavaliacao] = useState("");
  const [error,         setError]         = useState<string | null>(null);

  function toggleEsporte(v: string) {
    setEsportes((prev) =>
      prev.includes(v) ? prev.filter((e) => e !== v) : [...prev, v]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!experiencia || !frequencia || !autoavaliacao) {
      setError("Responda todas as perguntas."); return;
    }
    onNext({ experiencia, esportes, frequencia, autoavaliacao });
  }

  const opcaoBtn = (value: string, current: string, setter: (v: string) => void, label: string) => (
    <button key={value} type="button" onClick={() => setter(value)}
      className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-colors ${
        current === value
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-gray-200 text-gray-600 hover:border-gray-300"
      }`}>
      {label}
    </button>
  );

  const esporteBtn = (value: string, label: string) => (
    <button key={value} type="button" onClick={() => toggleEsporte(value)}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
        esportes.includes(value)
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-gray-200 text-gray-600 hover:border-gray-300"
      }`}>
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* Experiência */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Há quanto tempo você pratica futevôlei?</p>
        <div className="space-y-2">
          {opcaoBtn("iniciante", experiencia, setExperiencia, "Estou começando agora")}
          {opcaoBtn("menos1",   experiencia, setExperiencia, "Menos de 1 ano")}
          {opcaoBtn("1a3",      experiencia, setExperiencia, "De 1 a 3 anos")}
          {opcaoBtn("mais3",    experiencia, setExperiencia, "Mais de 3 anos")}
        </div>
      </div>

      {/* Esportes */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Você pratica ou já praticou algum destes esportes?</p>
        <div className="flex flex-wrap gap-2">
          {esporteBtn("futebol", "Futebol")}
          {esporteBtn("volei", "Vôlei / Beach Vôlei")}
          {esporteBtn("futsal", "Futsal")}
          {esporteBtn("outro", "Outro esporte")}
          {esporteBtn("nenhum", "Nenhum")}
        </div>
      </div>

      {/* Frequência */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Com que frequência você treina por semana?</p>
        <div className="space-y-2">
          {opcaoBtn("nao", frequencia, setFrequencia, "Não treino regularmente")}
          {opcaoBtn("1-2", frequencia, setFrequencia, "1 a 2 vezes por semana")}
          {opcaoBtn("3-4", frequencia, setFrequencia, "3 a 4 vezes por semana")}
          {opcaoBtn("5+",  frequencia, setFrequencia, "5 vezes ou mais")}
        </div>
      </div>

      {/* Autoavaliação */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Como você se avalia tecnicamente?</p>
        <div className="space-y-2">
          {opcaoBtn("basico",        autoavaliacao, setAutoavaliacao, "Básico — ainda aprendendo os fundamentos")}
          {opcaoBtn("intermediario", autoavaliacao, setAutoavaliacao, "Intermediário — domino os fundamentos, estou evoluindo")}
          {opcaoBtn("avancado",      autoavaliacao, setAutoavaliacao, "Avançado — bom nível técnico, já jogo competitivamente")}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
        Finalizar <ArrowRight className="size-4" />
      </button>
    </form>
  );
}

// ── componente principal ──────────────────────────────────────────────────────

export function SubscriptionPaymentUI(props: Props) {
  const { planId, handle, planNome, valorBase, nomeSalvo, dataNascimentoSalva, generoSalvo } = props;
  const router    = useRouter();
  const isGratuito = valorBase === 0;

  const [step, setStep] = useState<Step>(isGratuito ? "perfil" : "pagamento");
  const [initError, setInitError] = useState<string | null>(null);

  // Para planos gratuitos: registra o aluno como ativo assim que a página abre
  useEffect(() => {
    if (!isGratuito) return;
    assinarGratuito(planId).then((res) => {
      if (!res.ok) setInitError(res.error);
    });
  }, [isGratuito, planId]);

  // Dados acumulados entre steps
  const [perfilData,  setPerfilData]  = useState<{ nome: string; dataNascimento: string; genero: string } | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  async function handleNivelConcluido(nivelData: NivelData) {
    if (!perfilData) return;
    setSaving(true);
    setSaveError(null);
    const res = await salvarOnboardingAtleta({
      nome:          perfilData.nome,
      dataNascimento: perfilData.dataNascimento,
      genero:        perfilData.genero,
      experiencia:   nivelData.experiencia,
      esportes:      JSON.stringify(nivelData.esportes),
      frequencia:    nivelData.frequencia,
      autoavaliacao: nivelData.autoavaliacao,
    });
    setSaving(false);
    if (!res.ok) { setSaveError(res.error); return; }
    setStep("concluido");
  }

  // ── indicador de progresso ──
  const stepLabels = isGratuito ? ["Dados pessoais", "Nível"] : ["Pagamento", "Dados pessoais", "Nível"];
  const stepIndex  = isGratuito
    ? (step === "perfil" ? 0 : step === "nivel" ? 1 : 2)
    : (step === "pagamento" ? 0 : step === "perfil" ? 1 : step === "nivel" ? 2 : 3);

  if (step === "concluido") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle className="size-9 text-blue-500" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-gray-900">Tudo pronto!</h1>
          <p className="mt-2 text-sm text-gray-500">
            Você agora é aluno do plano <span className="font-medium text-gray-700">{planNome}</span>.
            Seu nível inicial foi definido com base nas suas respostas.
          </p>
          <button
            onClick={() => { router.push(`/arenas/${handle}`); router.refresh(); }}
            className="mt-8 block w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ir para a arena
          </button>
          <Link href="/perfil" className="mt-3 block text-sm text-gray-400 hover:text-gray-600">
            Ver meu perfil
          </Link>
        </div>
      </div>
    );
  }

  const stepIcon = step === "pagamento"
    ? <CreditCard className="size-5 text-blue-600" />
    : step === "perfil"
    ? <User className="size-5 text-blue-600" />
    : <Dumbbell className="size-5 text-blue-600" />;

  const stepTitle =
    step === "pagamento" ? planNome :
    step === "perfil"    ? "Seus dados" :
    "Nível no futevôlei";

  const stepSubtitle =
    step === "pagamento" ? `${formatBRL(valorBase)}/mês` :
    step === "perfil"    ? (isGratuito ? `${planNome} — gratuito` : "Para personalizar sua experiência") :
    "Para colocarmos na categoria certa";

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho escuro ── */}
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-lg space-y-4">
          <Link
            href={`/arenas/${handle}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>

          {/* Indicador de passos */}
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < stepIndex  ? "bg-blue-500 text-white" :
                  i === stepIndex ? "bg-white text-gray-900" :
                  "bg-white/20 text-white/40"
                }`}>
                  {i < stepIndex ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  i === stepIndex ? "text-white" : "text-white/40"
                }`}>{label}</span>
                {i < stepLabels.length - 1 && (
                  <div className={`h-px w-8 ${i < stepIndex ? "bg-blue-500" : "bg-white/20"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {stepIcon}
            <div>
              <h1 className="text-xl font-bold text-white">{stepTitle}</h1>
              <p className="text-sm text-white/50">{stepSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Área de conteúdo ── */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-lg">

          {initError && (
            <div className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{initError}</p>
            </div>
          )}

          {step === "pagamento" && (
            <StepPagamento {...props} onSuccess={() => setStep("perfil")} />
          )}

          {step === "perfil" && (
            <StepPerfil
              nomeSalvo={nomeSalvo}
              dataNascimentoSalva={dataNascimentoSalva}
              generoSalvo={generoSalvo}
              onNext={(data) => { setPerfilData(data); setStep("nivel"); }}
            />
          )}

          {step === "nivel" && (
            <div className="space-y-5">
              <StepNivel onNext={handleNivelConcluido} />
              {saving && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" /> Salvando seu perfil…
                </div>
              )}
              {saveError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                  <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">{saveError}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
