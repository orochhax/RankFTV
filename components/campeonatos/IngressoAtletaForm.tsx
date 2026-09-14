"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, Loader2, Trophy, Check, CreditCard, QrCode } from "lucide-react";
import {
  comprarIngressoAtleta,
  expirarReservaCategoriaAtleta,
  reservarCategoriaAtleta,
  type ComprarAtletaField,
  type ComprarAtletaState,
} from "@/app/campeonatos/[id]/comprar/actions";
import { formatBRL } from "@/lib/format";
import { calcularTaxaComprador, calcularTotalComprador } from "@/lib/taxas";
import { CupomInput, type CupomAplicado } from "@/components/ui/CupomInput";
import type { LoteComStatus } from "@/lib/lotes";
import { PERGUNTAS_NIVEL } from "@/lib/motor-categoria";
import { formatCpf } from "@/lib/cpf";
import { resolveCategoryPriceComposition } from "@/lib/category-price-display";
import {
  setAthleteEmail,
  type AthleteEmailField,
} from "@/lib/athlete-email-suggestion";
import { trackPublicFunnel } from "@/lib/public-funnel-client";
import { LegalDocumentDialog } from "@/components/legal/LegalDocumentDialog";
import type { AthleteCheckoutReservation } from "@/lib/checkout-reservation";
import { ReservationCountdown } from "@/components/checkout/ReservationCountdown";
import {
  athleteCheckoutDraftStorageKey,
  parseAthleteCheckoutDraft,
} from "@/lib/athlete-checkout-draft";
import {
  AthleteCheckoutCompletedSteps,
  AthleteCheckoutFooterSummary,
} from "@/components/checkout/AthleteCheckoutSummary";

export type CategoriaOpcao = {
  id: string;
  nome: string;
  genero: string;
  valorInscricao: number;
  corteRatingMin: number;
  corteRatingMax: number;
  lotes: LoteComStatus[];
  esgotado: boolean;
  vagasDisponiveis: number | null;
};

export type AuthenticatedAthleteProfile = {
  name: string;
  email: string;
  cpf: string;
  whatsapp: string;
  gender: string;
  shirt: string;
};

const CAMISAS = ["PP", "P", "M", "G", "GG", "XG", "XGG"];

type Etapa = "categoria" | "dados" | "revisao";
const ETAPAS: { key: Etapa; label: string }[] = [
  { key: "categoria", label: "Categoria" },
  { key: "dados", label: "Dados dos atletas" },
  { key: "revisao", label: "Revisão e pagamento" },
];

function BarraDeProgresso({ etapa }: { etapa: Etapa }) {
  const idx = ETAPAS.findIndex((e) => e.key === etapa);
  return (
    <div className="grid grid-cols-3">
      {ETAPAS.map((e, i) => {
        const feita = i < idx;
        const atual = i === idx;
        return (
          <div key={e.key} className="relative flex flex-col items-center gap-1">
            {i > 0 && (
              <div className={`absolute left-0 top-3 h-px w-1/2 ${i <= idx ? "bg-blue-600" : "bg-gray-200"}`} />
            )}
            {i < ETAPAS.length - 1 && (
              <div className={`absolute right-0 top-3 h-px w-1/2 ${i < idx ? "bg-blue-600" : "bg-gray-200"}`} />
            )}
            <div
              className={`relative z-10 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                feita || atual ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {feita ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span className={`text-center text-[11px] font-medium leading-tight ${atual ? "text-blue-600" : "text-gray-400"}`}>
              {e.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SugestaoEmailDaConta({
  email,
  atleta,
  onUse,
}: {
  email: string;
  atleta: "atleta 1" | "atleta 2";
  onUse: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-blue-50 px-3 py-2 text-xs ring-1 ring-blue-100">
      <span className="text-blue-700">Usar e-mail da sua conta:</span>
      <button
        type="button"
        onClick={onUse}
        aria-label={`Usar ${email} no e-mail do ${atleta}`}
        className="max-w-full break-all font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
      >
        {email}
      </button>
    </div>
  );
}

// Bloco do questionário de 5 perguntas pra UM atleta — usado duas vezes
// (comprador e parceiro) quando o campeonato tem o motor de categoria
// ligado. Os names ficam prefixados ("comprador_quiz_"/"parceiro_quiz_")
// pro server action calcular o rating de cada um separadamente.
function QuestionarioNivel({
  prefixo,
  titulo,
  values,
  onChange,
}: {
  prefixo: string;
  titulo: string;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
}) {
  const select =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  return (
    <section className="space-y-3 rounded-2xl bg-blue-50/60 p-4 ring-1 ring-blue-100">
      <div>
        <p className="text-sm font-semibold text-gray-800">{titulo}</p>
        <p className="text-xs text-gray-500">
          Este campeonato recomenda a categoria pelo nível — responda as 5 perguntas abaixo.
        </p>
      </div>
      {PERGUNTAS_NIVEL.map((p) => (
        <div key={p.key}>
          <label htmlFor={`${prefixo}${p.key}`} className="block text-sm font-medium text-gray-700">{p.pergunta}</label>
          <select
            id={`${prefixo}${p.key}`}
            name={`${prefixo}${p.key}`}
            className={`mt-1 ${select}`}
            value={values[`${prefixo}${p.key}`] ?? ""}
            onChange={(event) => onChange(`${prefixo}${p.key}`, event.target.value)}
            required
          >
            <option value="" disabled>Selecione</option>
            {p.opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
    </section>
  );
}

export function IngressoAtletaForm({
  championshipId,
  categorias,
  isElite,
  usaMotorCategoria,
  authenticatedAthlete,
  initialCategoryId,
  waitlistInviteToken,
  initialReservation,
}: {
  championshipId: string;
  categorias: CategoriaOpcao[];
  isElite: boolean;
  usaMotorCategoria: boolean;
  authenticatedAthlete: AuthenticatedAthleteProfile | null;
  initialCategoryId?: string | null;
  waitlistInviteToken?: string | null;
  initialReservation?: AthleteCheckoutReservation | null;
}) {
  const reservedCategory = categorias.find(
    (category) => category.id === initialReservation?.categoryId,
  ) ?? null;
  const initialCategory = reservedCategory ?? categorias.find(
    (category) => category.id === initialCategoryId && !category.esgotado,
  ) ?? null;
  const [etapa, setEtapa] = useState<Etapa>(reservedCategory ? "dados" : "categoria");
  const [catSelecionada, setCat] = useState<CategoriaOpcao | null>(initialCategory);
  const [reservation, setReservation] = useState<AthleteCheckoutReservation | null>(initialReservation ?? null);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [reservationPending, startReservationTransition] = useTransition();
  const [cupom, setCupom] = useState<CupomAplicado | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao">("pix");
  const [usarMesmoEmail, setUsarMesmoEmail] = useState(false);
  const [usarDadosDaConta, setUsarDadosDaConta] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [draftReadyKey, setDraftReadyKey] = useState<string | null>(null);
  const [dismissedErrors, setDismissedErrors] = useState<Partial<Record<ComprarAtletaField, number>>>({});
  const [reviewErrors, setReviewErrors] = useState<Partial<Record<ComprarAtletaField, string>>>({});
  const [state, formAction, pending] = useActionState<ComprarAtletaState, FormData>(
    comprarIngressoAtleta,
    {},
  );
  const [dismissedServerErrorState, setDismissedServerErrorState] = useState<ComprarAtletaState | null>(null);
  const compradorNomeRef = useRef<HTMLInputElement>(null);
  const compradorCpfRef = useRef<HTMLInputElement>(null);
  const compradorEmailRef = useRef<HTMLInputElement>(null);
  const compradorEmailConfirmacaoRef = useRef<HTMLInputElement>(null);
  const parceiroNomeRef = useRef<HTMLInputElement>(null);
  const parceiroCpfRef = useRef<HTMLInputElement>(null);
  const parceiroEmailRef = useRef<HTMLInputElement>(null);
  const parceiroEmailConfirmacaoRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const expirationDialogRef = useRef<HTMLDialogElement>(null);
  const categorySectionRef = useRef<HTMLDivElement>(null);
  const initialDataTracked = useRef(false);
  const valuesBeforeAccountAutofill = useRef<Record<string, string> | null>(null);
  const checkoutDraftKey = reservation
    ? athleteCheckoutDraftStorageKey(championshipId, reservation.id)
    : null;

  useEffect(() => {
    if (!reservedCategory || initialDataTracked.current) return;
    initialDataTracked.current = true;
    trackPublicFunnel({
      event: "athlete_data_started",
      championshipId,
      categoryId: reservedCategory.id,
    });
  }, [championshipId, reservedCategory]);

  useEffect(() => {
    if (!checkoutDraftKey || !reservation) return;

    const timer = window.setTimeout(() => {
      try {
        const draft = parseAthleteCheckoutDraft(
          window.sessionStorage.getItem(checkoutDraftKey),
          reservation.expiresAt,
        );
        if (!draft) {
          window.sessionStorage.removeItem(checkoutDraftKey);
        } else {
          setValues(draft.values);
          setMetodoPagamento(draft.paymentMethod);
          setUsarMesmoEmail(draft.useSameEmail);
        }
      } catch {
        // Storage pode estar bloqueado pelo navegador; o checkout continua funcional.
      }
      setDraftReadyKey(checkoutDraftKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkoutDraftKey, reservation]);

  useEffect(() => {
    if (!checkoutDraftKey || !reservation || draftReadyKey !== checkoutDraftKey) return;
    try {
      window.sessionStorage.setItem(checkoutDraftKey, JSON.stringify({
        version: 1,
        expiresAt: reservation.expiresAt,
        values,
        paymentMethod: metodoPagamento,
        useSameEmail: usarMesmoEmail,
      }));
    } catch {
      // Não interrompe a inscrição se o armazenamento temporário estiver indisponível.
    }
  }, [checkoutDraftKey, draftReadyKey, metodoPagamento, reservation, usarMesmoEmail, values]);

  const visibleFieldError = (field: ComprarAtletaField) =>
    reviewErrors[field]
      ?? (dismissedErrors[field] === state.validationAttempt ? undefined : state.fieldErrors?.[field]);

  function updateValue(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setReviewErrors((current) => ({ ...current, [field]: undefined }));
    if (state.fieldErrors?.[field as ComprarAtletaField]) {
      setDismissedErrors((current) => ({
        ...current,
        [field]: state.validationAttempt ?? 0,
      }));
    }
  }

  function updateAthleteEmail(field: AthleteEmailField, email: string) {
    setValues((current) => {
      const next = setAthleteEmail(current, field, email);
      if (field === "comprador_email" && usarMesmoEmail) {
        return {
          ...next,
          parceiro_email: email,
          parceiro_email_confirmacao: email,
        };
      }
      return next;
    });
    setReviewErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === "comprador_email" && usarMesmoEmail
        ? { parceiro_email: undefined, parceiro_email_confirmacao: undefined }
        : {}),
    }));
    if (state.fieldErrors?.[field]) {
      setDismissedErrors((current) => ({
        ...current,
        [field]: state.validationAttempt ?? 0,
      }));
    }
  }

  function toggleMesmoEmail(checked: boolean) {
    setUsarMesmoEmail(checked);
    setValues((current) => ({
      ...current,
      parceiro_email: checked ? current.comprador_email ?? "" : "",
      parceiro_email_confirmacao: checked ? current.comprador_email ?? "" : "",
    }));
    setReviewErrors((current) => ({
      ...current,
      parceiro_email: undefined,
      parceiro_email_confirmacao: undefined,
    }));
  }

  function toggleDadosDaConta(checked: boolean) {
    if (!authenticatedAthlete) return;

    setUsarDadosDaConta(checked);
    setValues((current) => {
      if (!checked) {
        const previous = valuesBeforeAccountAutofill.current;
        valuesBeforeAccountAutofill.current = null;
        return previous ?? current;
      }

      valuesBeforeAccountAutofill.current = current;
      const next: Record<string, string> = {
        ...current,
        comprador_nome: authenticatedAthlete.name || current.comprador_nome || "",
        comprador_cpf: authenticatedAthlete.cpf
          ? formatCpf(authenticatedAthlete.cpf)
          : current.comprador_cpf || "",
        comprador_zap: authenticatedAthlete.whatsapp || current.comprador_zap || "",
        comprador_email: authenticatedAthlete.email || current.comprador_email || "",
        comprador_email_confirmacao:
          authenticatedAthlete.email || current.comprador_email_confirmacao || "",
        comprador_genero: authenticatedAthlete.gender || current.comprador_genero || "",
        comprador_camisa: authenticatedAthlete.shirt || current.comprador_camisa || "",
      };

      if (usarMesmoEmail && next.comprador_email) {
        next.parceiro_email = next.comprador_email;
        next.parceiro_email_confirmacao = next.comprador_email;
      }
      return next;
    });
    setReviewErrors((current) => ({
      ...current,
      comprador_nome: undefined,
      comprador_cpf: undefined,
      comprador_email: undefined,
      comprador_email_confirmacao: undefined,
    }));
  }

  useEffect(() => {
    const refs = {
      comprador_nome: compradorNomeRef,
      comprador_cpf: compradorCpfRef,
      comprador_email: compradorEmailRef,
      comprador_email_confirmacao: compradorEmailConfirmacaoRef,
      parceiro_nome: parceiroNomeRef,
      parceiro_cpf: parceiroCpfRef,
      parceiro_email: parceiroEmailRef,
      parceiro_email_confirmacao: parceiroEmailConfirmacaoRef,
    };
    const firstInvalid = ([
      "comprador_nome",
      "comprador_cpf",
      "comprador_email",
      "comprador_email_confirmacao",
      "parceiro_nome",
      "parceiro_cpf",
      "parceiro_email",
      "parceiro_email_confirmacao",
    ] as ComprarAtletaField[]).find((field) => state.fieldErrors?.[field]);
    if (firstInvalid) {
      requestAnimationFrame(() => {
        setEtapa("dados");
        requestAnimationFrame(() => refs[firstInvalid].current?.focus());
      });
    }
  }, [state.fieldErrors, state.validationAttempt]);

  useEffect(() => {
    if (!state.error?.includes("tempo da reserva")) return;
    const timeout = window.setTimeout(() => {
      if (checkoutDraftKey) window.sessionStorage.removeItem(checkoutDraftKey);
      setReservation(null);
      setEtapa("categoria");
      setDismissedServerErrorState(state);
      expirationDialogRef.current?.showModal();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [checkoutDraftKey, state.error]);

  function continuarComCategoria() {
    if (!catSelecionada) return;
    setReservationError(null);
    startReservationTransition(async () => {
      const result = await reservarCategoriaAtleta(championshipId, catSelecionada.id);
      if (!result.ok) {
        setReservationError(result.error);
        return;
      }
      const selectedWithReservedPrice = {
        ...catSelecionada,
        valorInscricao: result.price,
        esgotado: false,
      };
      setCat(selectedWithReservedPrice);
      setCupom(null);
      setReservation(result);
      trackPublicFunnel({
        event: "athlete_data_started",
        championshipId,
        categoryId: selectedWithReservedPrice.id,
      });
      setEtapa("dados");
    });
  }

  function handleReservationExpired() {
    if (checkoutDraftKey) window.sessionStorage.removeItem(checkoutDraftKey);
    setReservation(null);
    setReservationError(null);
    setEtapa("categoria");
    expirationDialogRef.current?.showModal();
    startReservationTransition(async () => {
      await expirarReservaCategoriaAtleta(championshipId);
    });
  }

  function acknowledgeReservationExpiration() {
    expirationDialogRef.current?.close();
    requestAnimationFrame(() => {
      categorySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function abrirRevisao() {
    if (!formRef.current?.reportValidity()) return;

    const compradorEmail = (values.comprador_email ?? "").trim().toLowerCase();
    const compradorConfirmacao = (values.comprador_email_confirmacao ?? "").trim().toLowerCase();
    const parceiroEmail = (values.parceiro_email ?? "").trim().toLowerCase();
    const parceiroConfirmacao = (values.parceiro_email_confirmacao ?? "").trim().toLowerCase();
    const errors: Partial<Record<ComprarAtletaField, string>> = {};

    if (compradorEmail !== compradorConfirmacao) {
      errors.comprador_email_confirmacao = "A confirmação precisa ser igual ao e-mail do atleta 1.";
    }
    if (parceiroEmail !== parceiroConfirmacao) {
      errors.parceiro_email_confirmacao = "A confirmação precisa ser igual ao e-mail do atleta 2.";
    }
    if (compradorEmail && compradorEmail === parceiroEmail && !usarMesmoEmail) {
      errors.parceiro_email = "Use um e-mail diferente para cada atleta receber sua própria credencial.";
    }

    setReviewErrors(errors);
    const firstInvalid = errors.comprador_email_confirmacao
      ? compradorEmailConfirmacaoRef
      : errors.parceiro_email
        ? parceiroEmailRef
        : errors.parceiro_email_confirmacao
          ? parceiroEmailConfirmacaoRef
          : null;
    if (firstInvalid) {
      firstInvalid.current?.focus();
      return;
    }
    trackPublicFunnel({
      event: "checkout_reviewed",
      championshipId,
      categoryId: catSelecionada?.id,
    });
    setEtapa("revisao");
  }

  const input =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const select =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500";

  const valor      = catSelecionada?.valorInscricao ?? 0;
  const valorFinal = cupom ? Math.max(0, valor - cupom.desconto) : valor;
  const isGratis   = valorFinal <= 0;
  const metodoTaxa = metodoPagamento === "cartao" ? "credito" : "pix";
  const taxa       = calcularTaxaComprador(valorFinal, metodoTaxa, isElite);
  const total      = calcularTotalComprador(valorFinal, metodoTaxa, isElite);
  const emailDaConta = authenticatedAthlete?.email.trim() || null;
  const podeCompartilharEmail = (values.comprador_email ?? "").trim().includes("@");

  return (
    <div className="space-y-6 pb-28 sm:pb-24">
      <dialog
        ref={expirationDialogRef}
        aria-labelledby="reservation-expired-title"
        aria-describedby="reservation-expired-description"
        className="m-auto w-[min(calc(100%-2rem),400px)] rounded-3xl bg-white p-0 text-gray-950 shadow-2xl backdrop:bg-gray-950/70"
      >
        <div className="p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
            <AlertCircle aria-hidden="true" className="size-6" />
          </div>
          <h2 id="reservation-expired-title" className="mt-4 text-xl font-bold">
            O tempo da reserva terminou
          </h2>
          <p id="reservation-expired-description" className="mt-2 text-sm leading-6 text-gray-600">
            A vaga foi liberada. Escolha novamente a categoria para iniciar uma nova reserva.
          </p>
          <button
            type="button"
            autoFocus
            onClick={acknowledgeReservationExpiration}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            OK
          </button>
        </div>
      </dialog>

      <BarraDeProgresso etapa={etapa} />

      {reservation && (
        <ReservationCountdown
          key={reservation.id}
          id={reservation.id}
          expiresAt={reservation.expiresAt}
          serverNow={reservation.serverNow}
          onExpired={handleReservationExpired}
        />
      )}

      {/* Etapa 1 — escolha da categoria */}
      {etapa === "categoria" && (
        <div ref={categorySectionRef} className="scroll-mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Escolha a categoria da dupla</p>
          {categorias.map((cat) => {
            const sel = catSelecionada?.id === cat.id;
            const v   = cat.valorInscricao;
            const price = resolveCategoryPriceComposition(v, isElite);
            const loteAtivo = cat.lotes.find((l) => l.status === "ativo");
            return (
              <button
                key={cat.id}
                type="button"
                disabled={cat.esgotado}
                aria-pressed={sel}
                onClick={() => {
                  setCat(sel ? null : cat);
                  setCupom(null);
                  setReservationError(null);
                  if (!sel) trackPublicFunnel({ event: "category_selected", championshipId, categoryId: cat.id });
                }}
                className={`flex w-full flex-col items-stretch gap-3 rounded-2xl border p-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  cat.esgotado
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                    : sel ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${sel && !cat.esgotado ? "bg-blue-600" : "bg-gray-100"}`}>
                    <Trophy className={`size-5 ${sel && !cat.esgotado ? "text-white" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      Categoria {cat.nome}
                      {cat.genero !== "mista" && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                          · {cat.genero === "masculino" ? "Masculino" : "Feminino"}
                        </span>
                      )}
                      {cat.genero === "mista" && (
                        <span className="ml-1.5 text-xs font-normal text-gray-400">· Mista</span>
                      )}
                    </p>
                    {cat.esgotado ? (
                      <p className="text-xs text-gray-400">Vagas esgotadas</p>
                    ) : (
                      <>
                        {loteAtivo ? (
                          <p className="text-xs text-amber-600">
                            {loteAtivo.nome}
                            {loteAtivo.dataFim && ` · até ${new Date(loteAtivo.dataFim).toLocaleDateString("pt-BR")}`}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-500">
                          {cat.vagasDisponiveis === null
                            ? "Sem limite de vagas informado"
                            : `${cat.vagasDisponiveis} ${cat.vagasDisponiveis === 1 ? "vaga disponível" : "vagas disponíveis"}`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-auto sm:min-w-60 sm:shrink-0 sm:text-right">
                  {cat.esgotado ? (
                    <span className="font-semibold text-gray-400">Esgotado</span>
                  ) : v <= 0 ? (
                    <span className="font-semibold text-blue-600">Grátis</span>
                  ) : (
                    <div
                      className={`rounded-xl px-3 py-2 ring-1 ring-black/5 ${sel ? "bg-white/80" : "bg-gray-50"}`}
                      aria-label={`Valor da inscrição ${formatBRL(price.basePrice)}, mais ${formatBRL(price.serviceFee)} de taxa de serviço. Total no Pix ${formatBRL(price.pixTotal)}.`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Valor da inscrição
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:justify-end">
                        <span className="text-lg font-bold text-blue-600">{formatBRL(price.basePrice)}</span>
                        <span className="text-sm text-gray-400">+</span>
                        <span className="text-sm font-medium text-gray-700">
                          {formatBRL(price.serviceFee)} de taxa de serviço
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Total no Pix: {formatBRL(price.pixTotal)}
                      </p>
                    </div>
                  )}
                  {sel && !cat.esgotado && (
                    <div className="ml-auto mt-1 flex size-4 items-center justify-center rounded-full bg-blue-600">
                      <Check className="size-3 text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={continuarComCategoria}
            disabled={!catSelecionada || reservationPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {reservationPending && <Loader2 className="size-4 animate-spin" />}
            {reservationPending ? "Reservando vaga…" : "Continuar com esta categoria"}
          </button>
          {reservationError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700" aria-live="polite">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm">{reservationError}</p>
            </div>
          )}
        </div>
      )}

      {/* Etapa 2 — dados dos atletas + pagamento */}
      {etapa !== "categoria" && catSelecionada && (
        <form ref={formRef} action={formAction} className="space-y-6">
          <input type="hidden" name="championship_id" value={championshipId} />
          <input type="hidden" name="category_id"     value={catSelecionada.id} />
          <input type="hidden" name="categoria_nome"  value={catSelecionada.nome} />
          <input type="hidden" name="metodo_pagamento" value={metodoPagamento} />
          <input type="hidden" name="usar_mesmo_email" value={usarMesmoEmail ? "1" : "0"} />
          {waitlistInviteToken && <input type="hidden" name="waitlist_invite" value={waitlistInviteToken} />}

          <AthleteCheckoutCompletedSteps
            step={etapa}
            categoryName={catSelecionada.nome}
            categoryGender={catSelecionada.genero}
            buyerName={values.comprador_nome ?? "Atleta 1"}
            buyerEmail={values.comprador_email ?? ""}
            partnerName={values.parceiro_nome ?? "Atleta 2"}
            partnerEmail={values.parceiro_email ?? ""}
            onChangeCategory={() => {
              setEtapa("categoria");
              setCupom(null);
            }}
            onEditParticipants={() => {
              setDismissedServerErrorState(state);
              setEtapa("dados");
            }}
          />

          <div hidden={etapa !== "dados"} className="space-y-5">
          {/* Seus dados */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-labelledby="atleta-1-title">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-blue-50/70 px-4 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span>
              <div>
                <h2 id="atleta-1-title" className="text-sm font-semibold text-gray-950">Atleta 1</h2>
                <p className="text-xs text-gray-500">Dados da primeira pessoa da dupla</p>
              </div>
            </div>
            <div className="space-y-4 p-4">
            {authenticatedAthlete && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
                <input
                  type="checkbox"
                  checked={usarDadosDaConta}
                  onChange={(event) => toggleDadosDaConta(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-blue-600"
                />
                <span className="text-sm text-blue-950">
                  <span className="block font-semibold">Você é um dos atletas?</span>
                  <span className="mt-0.5 block text-xs text-blue-700">
                    Sim, sou o atleta 1. Preencher meus dados usando a conta logada.
                  </span>
                </span>
              </label>
            )}
            <div>
              <label htmlFor="comprador_nome" className="block text-sm font-medium text-gray-700">Nome completo</label>
              <input
                id="comprador_nome"
                ref={compradorNomeRef}
                name="comprador_nome"
                className={`mt-1 ${input} ${visibleFieldError("comprador_nome") ? "border-red-400 ring-1 ring-red-300 focus:ring-red-400" : ""}`}
                placeholder="Como vai aparecer no ingresso"
                value={values.comprador_nome ?? ""}
                onChange={(event) => updateValue("comprador_nome", event.target.value)}
                aria-invalid={!!visibleFieldError("comprador_nome")}
                aria-describedby={visibleFieldError("comprador_nome") ? "comprador-nome-error" : undefined}
                autoComplete="name"
                required
              />
              {visibleFieldError("comprador_nome") && (
                <p id="comprador-nome-error" className="mt-1 text-xs font-medium text-red-600">
                  {visibleFieldError("comprador_nome")}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="comprador_cpf" className="block text-sm font-medium text-gray-700">CPF</label>
                <input
                  id="comprador_cpf"
                  ref={compradorCpfRef}
                  name="comprador_cpf"
                  inputMode="numeric"
                  className={`mt-1 ${input} ${visibleFieldError("comprador_cpf") ? "border-red-400 ring-1 ring-red-300 focus:ring-red-400" : ""}`}
                  placeholder="000.000.000-00"
                  value={values.comprador_cpf ?? ""}
                  onChange={(event) => updateValue("comprador_cpf", formatCpf(event.target.value))}
                  aria-invalid={!!visibleFieldError("comprador_cpf")}
                  aria-describedby={visibleFieldError("comprador_cpf") ? "comprador-cpf-error" : undefined}
                  autoComplete="off"
                  required
                  maxLength={14}
                />
                {visibleFieldError("comprador_cpf") && (
                  <p id="comprador-cpf-error" className="mt-1 text-xs font-medium text-red-600">
                    {visibleFieldError("comprador_cpf")}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="comprador_zap" className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input
                  id="comprador_zap"
                  name="comprador_zap"
                  inputMode="numeric"
                  className={`mt-1 ${input}`}
                  placeholder="DDD + número"
                  value={values.comprador_zap ?? ""}
                  onChange={(event) => updateValue("comprador_zap", event.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
            <div>
              <label htmlFor="comprador_email" className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                id="comprador_email"
                ref={compradorEmailRef}
                name="comprador_email"
                type="email"
                className={`mt-1 ${input} ${visibleFieldError("comprador_email") ? "border-red-400 ring-1 ring-red-300 focus:ring-red-400" : ""}`}
                placeholder="voce@email.com"
                value={values.comprador_email ?? ""}
                onChange={(event) => updateAthleteEmail("comprador_email", event.target.value)}
                aria-invalid={!!visibleFieldError("comprador_email")}
                aria-describedby={visibleFieldError("comprador_email") ? "comprador-email-error" : undefined}
                autoComplete="off"
                required
              />
              {visibleFieldError("comprador_email") && (
                <p id="comprador-email-error" className="mt-1 text-xs font-medium text-red-600">
                  {visibleFieldError("comprador_email")}
                </p>
              )}
              {emailDaConta && (
                <SugestaoEmailDaConta
                  email={emailDaConta}
                  atleta="atleta 1"
                  onUse={() => updateAthleteEmail("comprador_email", emailDaConta)}
                />
              )}
              <p className="mt-1 text-xs text-gray-500">Enviaremos o ingresso e o QR para este endereço.</p>
            </div>
            {podeCompartilharEmail && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={usarMesmoEmail}
                  onChange={(event) => toggleMesmoEmail(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-800">
                    Usar este e-mail para os dois atletas
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Os ingressos continuam individuais, mesmo na mesma caixa de entrada.
                  </span>
                </span>
              </label>
            )}
            <div>
              <label htmlFor="comprador_email_confirmacao" className="block text-sm font-medium text-gray-700">Confirme seu e-mail</label>
              <input
                id="comprador_email_confirmacao"
                ref={compradorEmailConfirmacaoRef}
                name="comprador_email_confirmacao"
                type="email"
                className={`mt-1 ${input} ${visibleFieldError("comprador_email_confirmacao") ? "border-red-400 ring-1 ring-red-300 focus:ring-red-400" : ""}`}
                placeholder="Repita o e-mail"
                value={values.comprador_email_confirmacao ?? ""}
                onChange={(event) => updateValue("comprador_email_confirmacao", event.target.value)}
                aria-invalid={!!visibleFieldError("comprador_email_confirmacao")}
                aria-describedby={visibleFieldError("comprador_email_confirmacao") ? "comprador-email-confirmacao-error" : undefined}
                autoComplete="off"
                required
              />
              {visibleFieldError("comprador_email_confirmacao") && (
                <p id="comprador-email-confirmacao-error" className="mt-1 text-xs font-medium text-red-600">
                  {visibleFieldError("comprador_email_confirmacao")}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="comprador_genero" className="block text-sm font-medium text-gray-700">Gênero</label>
                <select
                  id="comprador_genero"
                  name="comprador_genero"
                  className={`mt-1 ${select}`}
                  value={values.comprador_genero ?? ""}
                  onChange={(event) => updateValue("comprador_genero", event.target.value)}
                  required
                >
                  <option value="" disabled>Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label htmlFor="comprador_camisa" className="block text-sm font-medium text-gray-700">Camisa (kit)</label>
                <select
                  id="comprador_camisa"
                  name="comprador_camisa"
                  className={`mt-1 ${select}`}
                  value={values.comprador_camisa ?? ""}
                  onChange={(event) => updateValue("comprador_camisa", event.target.value)}
                >
                  <option value="">Não informar</option>
                  {CAMISAS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            </div>
          </section>

          {usaMotorCategoria && (
            <QuestionarioNivel
              prefixo="comprador_quiz_"
              titulo="Nível do atleta 1 (você)"
              values={values}
              onChange={updateValue}
            />
          )}

          {/* Dados do parceiro */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-labelledby="atleta-2-title">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-emerald-50/70 px-4 py-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">2</span>
              <div>
                <h2 id="atleta-2-title" className="text-sm font-semibold text-gray-950">Atleta 2</h2>
                <p className="text-xs text-gray-500">Dados da segunda pessoa da dupla</p>
              </div>
            </div>
            <div className="space-y-4 p-4">
            <div>
              <label htmlFor="parceiro_nome" className="block text-sm font-medium text-gray-700">Nome completo</label>
              <input
                id="parceiro_nome"
                ref={parceiroNomeRef}
                name="parceiro_nome"
                className={`mt-1 ${input} ${visibleFieldError("parceiro_nome") ? "border-red-400 ring-1 ring-red-300 focus:ring-red-400" : ""}`}
                placeholder="Nome completo do parceiro"
                value={values.parceiro_nome ?? ""}
                onChange={(event) => updateValue("parceiro_nome", event.target.value)}
                aria-invalid={!!visibleFieldError("parceiro_nome")}
                aria-describedby={visibleFieldError("parceiro_nome") ? "parceiro-nome-error" : undefined}
                autoComplete="off"
                required
              />
              {visibleFieldError("parceiro_nome") && (
                <p id="parceiro-nome-error" className="mt-1 text-xs font-medium text-red-600">
                  {visibleFieldError("parceiro_nome")}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="parceiro_cpf" className="block text-sm font-medium text-gray-700">CPF</label>
                <input
                  id="parceiro_cpf"
                  ref={parceiroCpfRef}
                  name="parceiro_cpf"
                  inputMode="numeric"
                  className={`mt-1 ${input} ${visibleFieldError("parceiro_cpf") ? "border-red-400 ring-1 ring-red-300 focus:ring-red-400" : ""}`}
                  placeholder="000.000.000-00"
                  value={values.parceiro_cpf ?? ""}
                  onChange={(event) => updateValue("parceiro_cpf", formatCpf(event.target.value))}
                  aria-invalid={!!visibleFieldError("parceiro_cpf")}
                  aria-describedby={visibleFieldError("parceiro_cpf") ? "parceiro-cpf-error" : undefined}
                  autoComplete="off"
                  required
                  maxLength={14}
                />
                {visibleFieldError("parceiro_cpf") && (
                  <p id="parceiro-cpf-error" className="mt-1 text-xs font-medium text-red-600">
                    {visibleFieldError("parceiro_cpf")}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="parceiro_zap" className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input
                  id="parceiro_zap"
                  name="parceiro_zap"
                  inputMode="numeric"
                  className={`mt-1 ${input}`}
                  placeholder="DDD + número"
                  value={values.parceiro_zap ?? ""}
                  onChange={(event) => updateValue("parceiro_zap", event.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            {!usarMesmoEmail ? (
            <>
            <div>
              <label htmlFor="parceiro_email" className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                id="parceiro_email"
                ref={parceiroEmailRef}
                name="parceiro_email"
                type="email"
                className={`mt-1 ${input} ${visibleFieldError("parceiro_email") ? "border-red-400 ring-1 ring-red-300 focus:ring-red-400" : ""}`}
                placeholder="parceiro@email.com"
                value={values.parceiro_email ?? ""}
                onChange={(event) => updateAthleteEmail("parceiro_email", event.target.value)}
                aria-invalid={!!visibleFieldError("parceiro_email")}
                aria-describedby={visibleFieldError("parceiro_email") ? "parceiro-email-error" : undefined}
                autoComplete="off"
                required
              />
              {visibleFieldError("parceiro_email") && (
                <p id="parceiro-email-error" className="mt-1 text-xs font-medium text-red-600">
                  {visibleFieldError("parceiro_email")}
                </p>
              )}
              {emailDaConta && (
                <SugestaoEmailDaConta
                  email={emailDaConta}
                  atleta="atleta 2"
                  onUse={() => updateAthleteEmail("parceiro_email", emailDaConta)}
                />
              )}
              <p className="mt-1 text-xs text-gray-500">Enviaremos o ingresso e o QR para este endereço.</p>
            </div>
            <div>
              <label htmlFor="parceiro_email_confirmacao" className="block text-sm font-medium text-gray-700">Confirme o e-mail do parceiro</label>
              <input
                id="parceiro_email_confirmacao"
                ref={parceiroEmailConfirmacaoRef}
                name="parceiro_email_confirmacao"
                type="email"
                className={`mt-1 ${input} ${visibleFieldError("parceiro_email_confirmacao") ? "border-red-400 ring-1 ring-red-300 focus:ring-red-400" : ""}`}
                placeholder="Repita o e-mail"
                value={values.parceiro_email_confirmacao ?? ""}
                onChange={(event) => updateValue("parceiro_email_confirmacao", event.target.value)}
                aria-invalid={!!visibleFieldError("parceiro_email_confirmacao")}
                aria-describedby={visibleFieldError("parceiro_email_confirmacao") ? "parceiro-email-confirmacao-error" : undefined}
                autoComplete="off"
                required
              />
              {visibleFieldError("parceiro_email_confirmacao") && (
                <p id="parceiro-email-confirmacao-error" className="mt-1 text-xs font-medium text-red-600">
                  {visibleFieldError("parceiro_email_confirmacao")}
                </p>
              )}
            </div>
            </>
            ) : (
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 ring-1 ring-gray-200">
                O ingresso do atleta 2 também será enviado para <strong className="break-all">{values.comprador_email}</strong>.
                <input type="hidden" name="parceiro_email" value={values.comprador_email ?? ""} />
                <input type="hidden" name="parceiro_email_confirmacao" value={values.comprador_email ?? ""} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="parceiro_genero" className="block text-sm font-medium text-gray-700">Gênero</label>
                <select
                  id="parceiro_genero"
                  name="parceiro_genero"
                  className={`mt-1 ${select}`}
                  value={values.parceiro_genero ?? ""}
                  onChange={(event) => updateValue("parceiro_genero", event.target.value)}
                  required
                >
                  <option value="" disabled>Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label htmlFor="parceiro_camisa" className="block text-sm font-medium text-gray-700">Camisa (kit)</label>
                <select
                  id="parceiro_camisa"
                  name="parceiro_camisa"
                  className={`mt-1 ${select}`}
                  value={values.parceiro_camisa ?? ""}
                  onChange={(event) => updateValue("parceiro_camisa", event.target.value)}
                >
                  <option value="">Não informar</option>
                  {CAMISAS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            </div>
          </section>

          {usaMotorCategoria && (
            <QuestionarioNivel
              prefixo="parceiro_quiz_"
              titulo="Nível do parceiro (atleta 2)"
              values={values}
              onChange={updateValue}
            />
          )}

          {/* Cupom de desconto */}
          {valor > 0 && (
            <CupomInput
              championshipId={championshipId}
              aplicaEm="atleta"
              valorBase={valor}
              onChange={setCupom}
            />
          )}

          {!isGratis && (
            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Forma de pagamento</p>
                <p className="text-xs text-gray-400">Escolha antes de gerar a cobrança.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "pix" as const, label: "Pix", icon: QrCode },
                  { value: "cartao" as const, label: "Cartão", icon: CreditCard },
                ]).map(({ value: option, label, icon: Icon }) => {
                  const selected = metodoPagamento === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMetodoPagamento(option)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                        selected
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="size-4" /> {label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Resumo do valor */}
          {!isGratis && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between text-gray-500">
                <span>Inscrição da dupla</span>
                <span>{formatBRL(valor)}</span>
              </div>
              {cupom && (
                <div className="mt-1 flex items-center justify-between text-blue-600">
                  <span>Cupom {cupom.codigo}</span>
                  <span>- {formatBRL(cupom.desconto)}</span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between text-gray-500">
                <span>Taxa de serviço</span>
                <span>+ {formatBRL(taxa)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>{metodoPagamento === "pix" ? "Total no Pix" : "Total no cartão"}</span>
                <span>{formatBRL(total)}</span>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                Um dos atletas paga o valor cheio da dupla.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={abrirRevisao}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Revisar dados antes de pagar
          </button>
          </div>

          {etapa === "revisao" && (
            <section className="space-y-5" aria-labelledby="revisao-title">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p id="revisao-title" className="text-sm font-semibold text-blue-900">Revise antes de confirmar</p>
                <p className="mt-1 text-xs text-blue-700">
                  Cada ingresso e QR será enviado somente para o e-mail mostrado abaixo.
                </p>
              </div>

              {usarMesmoEmail && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Você escolheu receber as duas credenciais no mesmo e-mail. Quem tiver acesso a essa caixa poderá acessar e recuperar os dois ingressos individuais.
                </div>
              )}

              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Atleta 1</p>
                  <p className="mt-1 font-semibold text-gray-900">{values.comprador_nome}</p>
                  <p className="break-all text-sm text-blue-700">{values.comprador_email?.trim().toLowerCase()}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Atleta 2</p>
                  <p className="mt-1 font-semibold text-gray-900">{values.parceiro_nome}</p>
                  <p className="break-all text-sm text-blue-700">{values.parceiro_email?.trim().toLowerCase()}</p>
                </div>
                <div className="space-y-2 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">Categoria {catSelecionada.nome}</p>
                      <p className="text-gray-500">
                        {isGratis ? "Inscrição gratuita" : metodoPagamento === "pix" ? "Pagamento por Pix" : "Pagamento por cartão"}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-gray-900">{isGratis ? "Grátis" : formatBRL(total)}</p>
                  </div>
                  {!isGratis ? (
                    <div className="space-y-1 border-t border-gray-100 pt-2 text-xs text-gray-500">
                      <div className="flex justify-between"><span>Inscrição</span><span>{formatBRL(valor)}</span></div>
                      {cupom ? <div className="flex justify-between text-blue-700"><span>Cupom {cupom.codigo}</span><span>- {formatBRL(cupom.desconto)}</span></div> : null}
                      <div className="flex justify-between"><span>Taxa de serviço</span><span>+ {formatBRL(taxa)}</span></div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                <input
                  id="aceite-termos-atleta"
                  type="checkbox"
                  name="aceite_termos"
                  required
                  className="mt-0.5 size-4 shrink-0 cursor-pointer accent-blue-600"
                />
                <div className="min-w-0 text-sm leading-relaxed text-gray-600">
                  <label htmlFor="aceite-termos-atleta" className="cursor-pointer">
                    Li e concordo com os documentos da RankFTV:
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <LegalDocumentDialog document="terms" />
                    <span aria-hidden="true" className="text-gray-300">•</span>
                    <LegalDocumentDialog document="privacy" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setDismissedServerErrorState(state);
                    setEtapa("dados");
                  }}
                  disabled={pending}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Corrigir dados
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {isGratis
                    ? "Confirmar inscrição grátis"
                    : `Pagar com ${metodoPagamento === "pix" ? "Pix" : "cartão"}`}
                </button>
              </div>
            </section>
          )}

          {state.error && dismissedServerErrorState !== state && (
            <p
              aria-live="polite"
              className={`rounded-lg px-3 py-2 text-sm ring-1 ${
                state.error.startsWith("Pagamento recebido para processamento")
                  ? "bg-amber-50 text-amber-800 ring-amber-200"
                  : "bg-red-50 text-red-600 ring-red-100"
              }`}
            >
              {state.error}
            </p>
          )}
        </form>
      )}

      {etapa !== "categoria" && catSelecionada ? (
        <AthleteCheckoutFooterSummary
          categoryName={catSelecionada.nome}
          basePrice={valor}
          couponCode={cupom?.codigo}
          discount={cupom?.desconto ?? 0}
          serviceFee={taxa}
          total={total}
          paymentMethod={metodoPagamento}
        />
      ) : null}
    </div>
  );
}
