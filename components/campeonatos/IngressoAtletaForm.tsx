"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Trophy, Check, CreditCard, QrCode } from "lucide-react";
import {
  comprarIngressoAtleta,
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

export type CategoriaOpcao = {
  id: string;
  nome: string;
  genero: string;
  valorInscricao: number;
  corteRatingMin: number;
  corteRatingMax: number;
  lotes: LoteComStatus[];
  esgotado: boolean;
};

const CAMISAS = ["PP", "P", "M", "G", "GG", "XG", "XGG"];

type Etapa = "categoria" | "dados";
const ETAPAS: { key: Etapa | "pagamento"; label: string }[] = [
  { key: "categoria", label: "Categoria" },
  { key: "dados", label: "Dados dos atletas" },
  { key: "pagamento", label: "Pagamento" },
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
          <label className="block text-sm font-medium text-gray-700">{p.pergunta}</label>
          <select
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
  authenticatedEmail,
}: {
  championshipId: string;
  categorias: CategoriaOpcao[];
  isElite: boolean;
  usaMotorCategoria: boolean;
  authenticatedEmail: string | null;
}) {
  const [etapa, setEtapa] = useState<Etapa>("categoria");
  const [catSelecionada, setCat] = useState<CategoriaOpcao | null>(null);
  const [cupom, setCupom] = useState<CupomAplicado | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "cartao">("pix");
  const [values, setValues] = useState<Record<string, string>>({});
  const [dismissedErrors, setDismissedErrors] = useState<Partial<Record<ComprarAtletaField, number>>>({});
  const [state, formAction, pending] = useActionState<ComprarAtletaState, FormData>(
    comprarIngressoAtleta,
    {},
  );
  const compradorNomeRef = useRef<HTMLInputElement>(null);
  const compradorCpfRef = useRef<HTMLInputElement>(null);
  const compradorEmailRef = useRef<HTMLInputElement>(null);
  const parceiroNomeRef = useRef<HTMLInputElement>(null);
  const parceiroCpfRef = useRef<HTMLInputElement>(null);
  const parceiroEmailRef = useRef<HTMLInputElement>(null);

  const visibleFieldError = (field: ComprarAtletaField) =>
    dismissedErrors[field] === state.validationAttempt ? undefined : state.fieldErrors?.[field];

  function updateValue(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (state.fieldErrors?.[field as ComprarAtletaField]) {
      setDismissedErrors((current) => ({
        ...current,
        [field]: state.validationAttempt ?? 0,
      }));
    }
  }

  function updateAthleteEmail(field: AthleteEmailField, email: string) {
    setValues((current) => setAthleteEmail(current, field, email));
    if (state.fieldErrors?.[field]) {
      setDismissedErrors((current) => ({
        ...current,
        [field]: state.validationAttempt ?? 0,
      }));
    }
  }

  useEffect(() => {
    const refs = {
      comprador_nome: compradorNomeRef,
      comprador_cpf: compradorCpfRef,
      comprador_email: compradorEmailRef,
      parceiro_nome: parceiroNomeRef,
      parceiro_cpf: parceiroCpfRef,
      parceiro_email: parceiroEmailRef,
    };
    const firstInvalid = ([
      "comprador_nome",
      "comprador_cpf",
      "comprador_email",
      "parceiro_nome",
      "parceiro_cpf",
      "parceiro_email",
    ] as ComprarAtletaField[]).find((field) => state.fieldErrors?.[field]);
    if (firstInvalid) refs[firstInvalid].current?.focus();
  }, [state.fieldErrors, state.validationAttempt]);

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const select =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const valor      = catSelecionada?.valorInscricao ?? 0;
  const valorFinal = cupom ? Math.max(0, valor - cupom.desconto) : valor;
  const isGratis   = valorFinal <= 0;
  const metodoTaxa = metodoPagamento === "cartao" ? "credito" : "pix";
  const taxa       = calcularTaxaComprador(valorFinal, metodoTaxa, isElite);
  const total      = calcularTotalComprador(valorFinal, metodoTaxa, isElite);
  const emailDaConta = authenticatedEmail?.trim() || null;

  return (
    <div className="space-y-6">
      <BarraDeProgresso etapa={etapa} />

      {/* Etapa 1 — escolha da categoria */}
      {etapa === "categoria" && (
        <div className="space-y-2">
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
                onClick={() => { setCat(sel ? null : cat); setCupom(null); }}
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
                    ) : loteAtivo && (
                      <p className="text-xs text-amber-600">
                        {loteAtivo.nome}
                        {loteAtivo.dataFim && ` · até ${new Date(loteAtivo.dataFim).toLocaleDateString("pt-BR")}`}
                      </p>
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
            onClick={() => catSelecionada && setEtapa("dados")}
            disabled={!catSelecionada}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}

      {/* Etapa 2 — dados dos atletas + pagamento */}
      {etapa === "dados" && catSelecionada && (
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="championship_id" value={championshipId} />
          <input type="hidden" name="category_id"     value={catSelecionada.id} />
          <input type="hidden" name="categoria_nome"  value={catSelecionada.nome} />
          <input type="hidden" name="metodo_pagamento" value={metodoPagamento} />

          {/* Resumo da categoria escolhida */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Categoria escolhida</p>
              <p className="font-medium text-gray-900">Categoria {catSelecionada.nome}</p>
            </div>
            <button
              type="button"
              onClick={() => { setEtapa("categoria"); setCupom(null); }}
              className="shrink-0 text-xs font-semibold text-blue-600 hover:underline"
            >
              Trocar
            </button>
          </div>

          {/* Seus dados */}
          <section className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Seus dados (atleta 1)</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome completo</label>
              <input
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
                <label className="block text-sm font-medium text-gray-700">CPF</label>
                <input
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
                <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input
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
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
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
              <p className="mt-1 text-xs text-gray-400">O ingresso e QR de entrada chegam nesse e-mail.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Gênero</label>
                <select
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
                <p className="mt-1 text-xs text-gray-400">
                  {catSelecionada.genero !== "mista"
                    ? `Categoria restrita ao gênero ${catSelecionada.genero === "masculino" ? "masculino" : "feminino"}.`
                    : "Categoria mista — aceita qualquer gênero."}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Camisa (kit)</label>
                <select
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
          <section className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Dados do parceiro (atleta 2)</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome completo</label>
              <input
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
                <label className="block text-sm font-medium text-gray-700">CPF</label>
                <input
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
                <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input
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
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
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
              <p className="mt-1 text-xs text-gray-400">O ingresso e QR de entrada chegam nesse e-mail.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Gênero</label>
                <select
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
                <p className="mt-1 text-xs text-gray-400">
                  {catSelecionada.genero !== "mista"
                    ? `Categoria restrita ao gênero ${catSelecionada.genero === "masculino" ? "masculino" : "feminino"}.`
                    : "Categoria mista — aceita qualquer gênero."}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Camisa (kit)</label>
                <select
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

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isGratis
              ? "Confirmar inscrição grátis"
              : `Continuar com ${metodoPagamento === "pix" ? "Pix" : "cartão"} — ${formatBRL(total)}`}
          </button>
        </form>
      )}
    </div>
  );
}
