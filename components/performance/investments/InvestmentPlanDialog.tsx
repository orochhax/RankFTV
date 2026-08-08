"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { AccessibleDialog } from "@/components/performance/investments/AccessibleDialog";
import {
  Field,
  inputClass,
  money,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/performance/investments/ui";
import {
  monthsBetweenDates,
  nominalToRealValue,
  projectPortfolio,
} from "@/lib/investment-route";

export type InvestmentPlanFormValues = {
  planId?: string;
  expectedVersion?: number;
  name: string;
  baselineDate: string;
  baselineValue: number;
  targetValue: number;
  targetDate: string;
  valueMode: "real" | "nominal";
  valueReferenceDate: string;
  plannedMonthlyContribution: number;
  annualReturnConservative: number;
  annualReturnBase: number;
  annualReturnFavorable: number;
  annualInflation: number;
  effectiveFrom: string;
  changeNote: string;
  allowImmediateRevision: boolean;
  baselineValueLocked: boolean;
  baselineDateLocked: boolean;
};

type ActionResult = { ok: boolean; error?: string; message?: string };

type PlanFieldId =
  | "plan-target"
  | "plan-target-date"
  | "plan-baseline"
  | "plan-monthly"
  | "plan-baseline-date"
  | "plan-reference-date"
  | "plan-conservative"
  | "plan-base-rate"
  | "plan-favorable"
  | "plan-inflation"
  | "plan-effective"
  | "plan-confirmation";
type PlanFieldErrors = Partial<Record<PlanFieldId, string>>;

const PLAN_FIELD_BY_VALUE: Partial<
  Record<keyof InvestmentPlanFormValues, PlanFieldId>
> = {
  baselineDate: "plan-baseline-date",
  baselineValue: "plan-baseline",
  targetValue: "plan-target",
  targetDate: "plan-target-date",
  valueReferenceDate: "plan-reference-date",
  plannedMonthlyContribution: "plan-monthly",
  annualReturnConservative: "plan-conservative",
  annualReturnBase: "plan-base-rate",
  annualReturnFavorable: "plan-favorable",
  annualInflation: "plan-inflation",
  effectiveFrom: "plan-effective",
};
const RATE_FIELD_IDS = new Set<PlanFieldId>([
  "plan-conservative",
  "plan-base-rate",
  "plan-favorable",
  "plan-inflation",
]);

export function InvestmentPlanDialog({
  open,
  mode,
  today,
  initial,
  onClose,
  onSubmit,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  today: string;
  initial: InvestmentPlanFormValues;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<ActionResult>;
  onSuccess: (message: string) => void;
}) {
  if (!open) return null;
  return (
    <InvestmentPlanDialogContent
      mode={mode}
      today={today}
      initial={initial}
      onClose={onClose}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
    />
  );
}

function InvestmentPlanDialogContent({
  mode,
  today,
  initial,
  onClose,
  onSubmit,
  onSuccess,
}: Omit<Parameters<typeof InvestmentPlanDialog>[0], "open">) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState(initial);
  const [advanced, setAdvanced] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PlanFieldErrors>({});

  const update = <K extends keyof InvestmentPlanFormValues>(
    key: K,
    value: InvestmentPlanFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    const fieldId = PLAN_FIELD_BY_VALUE[key];
    const relatedFieldIds: PlanFieldId[] =
      key === "annualReturnConservative" ||
      key === "annualReturnBase" ||
      key === "annualReturnFavorable"
        ? ["plan-conservative", "plan-base-rate", "plan-favorable"]
        : fieldId
          ? [fieldId]
          : [];
    if (relatedFieldIds.length) {
      setFieldErrors((current) => {
        if (!relatedFieldIds.some((id) => current[id])) return current;
        const next = { ...current };
        for (const id of relatedFieldIds) delete next[id];
        return next;
      });
    }
    setError(null);
  };
  const validateStep = (): PlanFieldErrors => {
    const issues: PlanFieldErrors = {};

    if (step === 1) {
      if (!Number.isFinite(values.targetValue) || values.targetValue <= 0) {
        issues["plan-target"] =
          "Informe um valor desejado maior que zero.";
      }
      if (!values.targetDate) {
        issues["plan-target-date"] = "Escolha o mês desejado.";
      } else if (
        values.baselineDate &&
        values.targetDate <= values.baselineDate
      ) {
        issues["plan-target-date"] =
          "Escolha um mês posterior à data de início do plano.";
      } else if (
        values.effectiveFrom &&
        values.targetDate < values.effectiveFrom
      ) {
        issues["plan-target-date"] =
          "Escolha um mês igual ou posterior à vigência do plano.";
      }
    }

    if (step === 2) {
      if (!values.baselineDate) {
        issues["plan-baseline-date"] = "Informe a data do valor observado.";
      } else if (values.baselineDate > today) {
        issues["plan-baseline-date"] = "A data não pode estar no futuro.";
      }
      if (!Number.isFinite(values.baselineValue) || values.baselineValue < 0) {
        issues["plan-baseline"] =
          "Informe um valor atual igual ou maior que zero.";
      }
      if (
        !Number.isFinite(values.plannedMonthlyContribution) ||
        values.plannedMonthlyContribution < 0
      ) {
        issues["plan-monthly"] =
          "Informe um aporte mensal igual ou maior que zero.";
      }
      if (!values.valueReferenceDate) {
        issues["plan-reference-date"] = "Informe a data-base dos valores.";
      } else if (values.valueReferenceDate > today) {
        issues["plan-reference-date"] =
          "A data-base não pode estar no futuro.";
      }
    }

    if (step === 3) {
      const rates: Array<{
        id: PlanFieldId;
        value: number;
        label: string;
      }> = [
        {
          id: "plan-conservative",
          value: values.annualReturnConservative,
          label: "taxa conservadora",
        },
        {
          id: "plan-base-rate",
          value: values.annualReturnBase,
          label: "taxa base",
        },
        {
          id: "plan-favorable",
          value: values.annualReturnFavorable,
          label: "taxa favorável",
        },
        {
          id: "plan-inflation",
          value: values.annualInflation,
          label: "inflação",
        },
      ];
      for (const rate of rates) {
        if (!Number.isFinite(rate.value)) {
          issues[rate.id] = `Informe a ${rate.label}.`;
        } else if (rate.value <= -100) {
          issues[rate.id] = `A ${rate.label} precisa ser maior que -100%.`;
        }
      }
      if (
        Number.isFinite(values.annualReturnConservative) &&
        Number.isFinite(values.annualReturnBase) &&
        values.annualReturnConservative > values.annualReturnBase
      ) {
        issues["plan-conservative"] =
          "A taxa conservadora deve ser menor ou igual à taxa base.";
        issues["plan-base-rate"] =
          "A taxa base deve ser maior ou igual à conservadora.";
      }
      if (
        Number.isFinite(values.annualReturnBase) &&
        Number.isFinite(values.annualReturnFavorable) &&
        values.annualReturnBase > values.annualReturnFavorable
      ) {
        issues["plan-base-rate"] =
          "A taxa base deve ser menor ou igual à favorável.";
        issues["plan-favorable"] =
          "A taxa favorável deve ser maior ou igual à taxa base.";
      }
      if (!values.effectiveFrom) {
        issues["plan-effective"] = "Escolha quando a revisão começa a valer.";
      } else if (values.targetDate < values.effectiveFrom) {
        issues["plan-effective"] =
          "A vigência não pode ser posterior ao mês do destino.";
      }
      if (!confirmed) {
        issues["plan-confirmation"] =
          "Confirme que você entende o caráter estimado das projeções.";
      }
    }

    return issues;
  };

  const showFieldErrors = (issues: PlanFieldErrors) => {
    setFieldErrors(issues);
    const ids = Object.keys(issues) as PlanFieldId[];
    if (ids.some((id) => id.startsWith("plan-") && RATE_FIELD_IDS.has(id))) {
      setAdvanced(true);
    }
    const firstId = ids[0];
    if (firstId) {
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 0);
    }
  };

  const next = () => {
    const issues = validateStep();
    if (Object.keys(issues).length) return showFieldErrors(issues);
    setFieldErrors({});
    setError(null);
    setStep((current) => Math.min(3, current + 1));
  };
  const save = async () => {
    const issues = validateStep();
    if (Object.keys(issues).length) return showFieldErrors(issues);
    setFieldErrors({});
    setError(null);
    setPending(true);
    try {
      const data = new FormData();
      data.set("name", values.name);
      data.set("baseline_date", values.baselineDate);
      data.set("baseline_value", String(values.baselineValue));
      data.set("target_value", String(values.targetValue));
      data.set("target_date", values.targetDate);
      data.set("value_mode", values.valueMode);
      data.set("value_reference_date", values.valueReferenceDate);
      data.set(
        "planned_monthly_contribution",
        String(values.plannedMonthlyContribution),
      );
      data.set(
        "annual_return_conservative",
        String(values.annualReturnConservative),
      );
      data.set("annual_return_base", String(values.annualReturnBase));
      data.set("annual_return_favorable", String(values.annualReturnFavorable));
      data.set("annual_inflation", String(values.annualInflation));
      data.set("effective_from", values.effectiveFrom);
      data.set("change_note", values.changeNote);
      if (values.expectedVersion != null)
        data.set("expected_version", String(values.expectedVersion));
      const result = await onSubmit(data);
      if (!result.ok)
        setError(result.error ?? "Não foi possível salvar o plano.");
      else {
        onSuccess(
          result.message ??
            (mode === "create"
              ? "Plano criado. Sua rota foi calculada."
              : "Plano ajustado. Uma nova revisão foi criada."),
        );
        onClose();
      }
    } catch {
      setError(
        navigator.onLine
          ? "Não foi possível salvar o plano. Tente novamente."
          : "Você está sem conexão. Nada foi salvo ainda.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <AccessibleDialog
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      wide
      title={mode === "create" ? "Criar meu plano" : "Ajustar plano"}
      description={
        mode === "create"
          ? "Defina seu destino em três etapas curtas."
          : "O ajuste cria uma nova revisão e preserva o plano anterior."
      }
    >
      <ol className="grid grid-cols-3 gap-2" aria-label="Etapas do plano">
        {["Destino", "Ritmo", "Cenários"].map((label, index) => {
          const number = index + 1;
          const active = number === step;
          const done = number < step;
          return (
            <li
              key={label}
              className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold ${active ? "border-blue-400/35 bg-blue-400/10 text-blue-200" : done ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200" : "border-white/10 text-white/60"}`}
              aria-current={active ? "step" : undefined}
            >
              {done ? (
                <Check className="mx-auto size-4" aria-hidden="true" />
              ) : (
                <span>{number}</span>
              )}
              <span className="mt-1 block">{label}</span>
            </li>
          );
        })}
      </ol>
      <div
        className="mt-6 min-h-[360px]"
        role="group"
        aria-describedby={error ? "investment-plan-error" : undefined}
      >
        {step === 1 && (
          <PlanDestination
            values={values}
            update={update}
            editing={mode === "edit"}
            errors={fieldErrors}
          />
        )}
        {step === 2 && (
          <PlanPace
            values={values}
            update={update}
            today={today}
            editing={mode === "edit"}
            errors={fieldErrors}
          />
        )}
        {step === 3 && (
          <PlanScenarios
            values={values}
            update={update}
            advanced={advanced}
            setAdvanced={setAdvanced}
            confirmed={confirmed}
            mode={mode}
            today={today}
            errors={fieldErrors}
            onConfirm={(value) => {
              setConfirmed(value);
              setFieldErrors((current) => {
                if (!current["plan-confirmation"]) return current;
                const next = { ...current };
                delete next["plan-confirmation"];
                return next;
              });
              setError(null);
            }}
          />
        )}
      </div>
      {error && (
        <p
          id="investment-plan-error"
          role="alert"
          className="mt-4 rounded-lg border border-red-300/15 bg-red-300/[0.07] px-3 py-2 text-sm leading-6 text-red-200"
        >
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setFieldErrors({});
            setStep((current) => Math.max(1, current - 1));
          }}
          disabled={step === 1 || pending}
          className={secondaryButtonClass}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className={primaryButtonClass}
            aria-describedby={error ? "investment-plan-error" : undefined}
          >
            Continuar
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className={primaryButtonClass}
            aria-describedby={error ? "investment-plan-error" : undefined}
          >
            {pending ? (
              <Loader2
                className="size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {pending
              ? "Salvando…"
              : mode === "create"
                ? "Salvar plano e ver minha rota"
                : "Salvar nova revisão"}
          </button>
        )}
      </div>
    </AccessibleDialog>
  );
}

type Update = <K extends keyof InvestmentPlanFormValues>(
  key: K,
  value: InvestmentPlanFormValues[K],
) => void;
function PlanDestination({
  values,
  update,
  editing,
  errors,
}: {
  values: InvestmentPlanFormValues;
  update: Update;
  editing: boolean;
  errors: PlanFieldErrors;
}) {
  const minimumDate =
    values.effectiveFrom > values.baselineDate
      ? values.effectiveFrom
      : values.baselineDate;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-300/70">
          Etapa 1
        </p>
        <h3 className="mt-1 text-xl font-semibold">Onde você quer chegar?</h3>
        <p className="mt-1 text-sm leading-6 text-white/65">
          Escolha um destino claro. Ele poderá ser revisado sem apagar o plano
          original.
        </p>
      </div>
      <Field label="Nome do objetivo" htmlFor="plan-name" hint="Opcional">
        <input
          data-autofocus
          id="plan-name"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          maxLength={120}
          placeholder="Ex.: Independência financeira"
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput
          id="plan-target"
          label="Valor desejado"
          value={values.targetValue}
          onChange={(value) => update("targetValue", value)}
          error={errors["plan-target"]}
        />
        <Field
          label="Mês desejado"
          htmlFor="plan-target-date"
          hint="A projeção usa o último dia do mês escolhido."
          error={errors["plan-target-date"]}
        >
          <input
            id="plan-target-date"
            type="month"
            min={earliestTargetMonthEnd(minimumDate).slice(0, 7)}
            value={values.targetDate.slice(0, 7)}
            onChange={(event) =>
              update(
                "targetDate",
                event.target.value
                  ? endOfMonth(`${event.target.value}-01`)
                  : "",
              )
            }
            className={inputClass}
          />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-white/80">
          Como interpretar esse valor?
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ModeCard
            checked={values.valueMode === "real"}
            disabled={editing}
            label="Valor real"
            detail="Poder de compra da data-base. Recomendado para metas longas."
            onChange={() => update("valueMode", "real")}
          />
          <ModeCard
            checked={values.valueMode === "nominal"}
            disabled={editing}
            label="Valor nominal"
            detail="Número de reais esperado na data-alvo, sem ajuste de poder de compra."
            onChange={() => update("valueMode", "nominal")}
          />
        </div>
      </fieldset>
      {editing && (
        <p className="rounded-lg border border-amber-300/15 bg-amber-300/[0.055] px-3 py-2 text-xs leading-5 text-amber-100">
          O modo monetário e a data-base ficam fixos durante este plano para não
          reinterpretar valores silenciosamente. Para outro referencial, arquive
          este destino e crie um novo.
        </p>
      )}
      {values.valueMode === "real" && (
        <p className="rounded-lg border border-blue-300/15 bg-blue-300/[0.06] px-3 py-2 text-xs leading-5 text-blue-100">
          Valor real representa poder de compra. A tela identificará a data-base
          usada.
        </p>
      )}
    </div>
  );
}
function PlanPace({
  values,
  update,
  today,
  editing,
  errors,
}: {
  values: InvestmentPlanFormValues;
  update: Update;
  today: string;
  editing: boolean;
  errors: PlanFieldErrors;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-300/70">
          Etapa 2
        </p>
        <h3 className="mt-1 text-xl font-semibold">
          Qual ritmo sustenta o plano?
        </h3>
        <p className="mt-1 text-sm leading-6 text-white/65">
          Use o valor observado da carteira. A soma dos aportes não substitui um
          check-in.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput
          id="plan-baseline"
          label="Valor atual da carteira"
          value={values.baselineValue}
          disabled={values.baselineValueLocked}
          hint={
            values.baselineValueLocked
              ? editing
                ? "Posição atual calculada pela rota. Faça um check-in para alterar o valor observado."
                : "Estimativa de hoje a partir do último snapshot e dos fluxos registrados. Faça um check-in para corrigir o valor observado."
              : "Este valor será salvo como seu primeiro check-in de hoje."
          }
          onChange={(value) => update("baselineValue", value)}
          error={errors["plan-baseline"]}
        />
        <NumberInput
          id="plan-monthly"
          label="Aporte mensal planejado"
          value={values.plannedMonthlyContribution}
          onChange={(value) => update("plannedMonthlyContribution", value)}
          error={errors["plan-monthly"]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Data de início"
          htmlFor="plan-baseline-date"
          hint={
            values.baselineDateLocked
              ? "Alinhada à data do valor observado para não fabricar histórico."
              : undefined
          }
          error={errors["plan-baseline-date"]}
        >
          <input
            id="plan-baseline-date"
            type="date"
            max={today}
            value={values.baselineDate}
            disabled={values.baselineDateLocked}
            onChange={(event) => update("baselineDate", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Data-base dos valores"
          htmlFor="plan-reference-date"
          hint={
            editing
              ? "Este referencial permanece fixo para preservar o significado dos valores."
              : values.valueMode === "real"
                ? "O valor observado será convertido pela inflação configurada para este poder de compra."
                : "Referência registrada para explicar a premissa nominal."
          }
          error={errors["plan-reference-date"]}
        >
          <input
            id="plan-reference-date"
            type="date"
            max={today}
            value={values.valueReferenceDate}
            disabled={editing}
            onChange={(event) =>
              update("valueReferenceDate", event.target.value)
            }
            className={inputClass}
          />
        </Field>
      </div>
      <div className="rounded-lg border border-white/[0.07] bg-[#0f1318] p-4">
        <p className="text-xs text-white/60">Resumo do ritmo</p>
        <p className="mt-2 text-lg font-semibold">
          {money(values.plannedMonthlyContribution)} por mês
        </p>
        <p className="mt-1 text-xs text-white/60">
          Partindo de {money(values.baselineValue)} em{" "}
          {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
            new Date(`${values.baselineDate}T12:00:00Z`),
          )}
          .
        </p>
      </div>
    </div>
  );
}
function PlanScenarios({
  values,
  update,
  advanced,
  setAdvanced,
  confirmed,
  mode,
  today,
  errors,
  onConfirm,
}: {
  values: InvestmentPlanFormValues;
  update: Update;
  advanced: boolean;
  setAdvanced: (value: boolean) => void;
  confirmed: boolean;
  mode: "create" | "edit";
  today: string;
  errors: PlanFieldErrors;
  onConfirm: (value: boolean) => void;
}) {
  const preview = buildPlanPreview(values);
  const rateMode =
    values.valueMode === "real" ? "reais líquidas" : "nominais líquidas";
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-300/70">
          Etapa 3
        </p>
        <h3 className="mt-1 text-xl font-semibold">Revise os cenários</h3>
        <p className="mt-1 text-sm leading-6 text-white/65">
          São premissas ilustrativas e editáveis — não recomendações nem
          garantia de resultado. As taxas abaixo são {rateMode} ao ano.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <RatePreview
          label="Conservador"
          value={values.annualReturnConservative}
        />
        <RatePreview label="Base" value={values.annualReturnBase} emphasized />
        <RatePreview label="Favorável" value={values.annualReturnFavorable} />
      </div>
      <div className="rounded-lg border border-blue-300/15 bg-blue-300/[0.055] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/80">
          Prévia da faixa no mês-alvo
        </p>
        {preview ? (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <PreviewValue label="Conservador" value={preview.conservative} />
              <PreviewValue label="Base" value={preview.base} />
              <PreviewValue label="Favorável" value={preview.favorable} />
            </div>
            <p className="mt-3 text-xs leading-5 text-blue-100/80">
              Faixa de {money(preview.conservative)} a{" "}
              {money(preview.favorable)} em {formatPlanDate(values.targetDate)}.{" "}
              {values.valueMode === "real"
                ? `Valores em poder de compra de ${formatPlanDate(values.valueReferenceDate)}; a conversão do snapshot pela inflação configurada é aproximada.`
                : "Valores nominais na data-alvo."}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-amber-100">
            Revise datas, valores e taxas para formar a prévia.
          </p>
        )}
      </div>
      <dl className="grid gap-3 rounded-lg border border-white/[0.07] bg-[#0f1318] p-4 text-sm sm:grid-cols-2">
        <SummaryItem
          label="Destino"
          value={`${money(values.targetValue)} · ${formatPlanDate(values.targetDate)}`}
        />
        <SummaryItem
          label="Ponto de partida"
          value={`${money(preview?.baselineInPlanMode ?? values.baselineValue)} · ${formatPlanDate(values.baselineDate)}`}
        />
        <SummaryItem
          label="Aporte planejado"
          value={`${money(values.plannedMonthlyContribution)} por mês`}
        />
        <SummaryItem
          label="Referencial"
          value={
            values.valueMode === "real"
              ? `Reais de ${formatPlanDate(values.valueReferenceDate)}`
              : "Nominal"
          }
        />
      </dl>
      <button
        type="button"
        onClick={() => setAdvanced(!advanced)}
        className={secondaryButtonClass}
        aria-expanded={advanced}
      >
        <Sparkles className="size-4" aria-hidden="true" />
        {advanced ? "Recolher premissas" : "Revisar premissas avançadas"}
      </button>
      {advanced && (
        <div className="grid gap-4 rounded-lg border border-white/[0.07] bg-[#0f1318] p-4 sm:grid-cols-2">
          <NumberInput
            id="plan-conservative"
            label="Taxa conservadora (% a.a.)"
            value={values.annualReturnConservative}
            onChange={(value) => update("annualReturnConservative", value)}
            step="0.1"
            min={-99.99}
            error={errors["plan-conservative"]}
          />
          <NumberInput
            id="plan-base-rate"
            label="Taxa base (% a.a.)"
            value={values.annualReturnBase}
            onChange={(value) => update("annualReturnBase", value)}
            step="0.1"
            min={-99.99}
            error={errors["plan-base-rate"]}
          />
          <NumberInput
            id="plan-favorable"
            label="Taxa favorável (% a.a.)"
            value={values.annualReturnFavorable}
            onChange={(value) => update("annualReturnFavorable", value)}
            step="0.1"
            min={-99.99}
            error={errors["plan-favorable"]}
          />
          <NumberInput
            id="plan-inflation"
            label="Inflação (% a.a.)"
            value={values.annualInflation}
            onChange={(value) => update("annualInflation", value)}
            step="0.1"
            min={-99.99}
            disabled={mode === "edit" && values.valueMode === "real"}
            error={errors["plan-inflation"]}
            hint={
              mode === "edit" && values.valueMode === "real"
                ? "Fixa neste plano para não reinterpretar silenciosamente o ponto de partida em reais."
                : undefined
            }
          />
        </div>
      )}
      {mode === "edit" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Vigência da revisão"
            htmlFor="plan-effective"
            hint={
              values.allowImmediateRevision
                ? "O próximo mês é recomendado. A opção de hoje aplica a mudança imediatamente e fica registrada."
                : "Já existe uma revisão agendada; o novo ajuste também valerá no primeiro dia do próximo mês."
            }
            error={errors["plan-effective"]}
          >
            <select
              id="plan-effective"
              value={values.effectiveFrom}
              onChange={(event) => update("effectiveFrom", event.target.value)}
              className={inputClass}
            >
              <option value={nextMonthStart(today)}>
                Primeiro dia do próximo mês
              </option>
              {values.allowImmediateRevision && (
                <option value={today}>Hoje — vigência imediata</option>
              )}
            </select>
          </Field>
          <Field
            label="Motivo da mudança"
            htmlFor="plan-note"
            hint="Ajuda a reconstruir as decisões no diário de bordo."
          >
            <input
              id="plan-note"
              value={values.changeNote}
              onChange={(event) => update("changeNote", event.target.value)}
              maxLength={500}
              className={inputClass}
            />
          </Field>
        </div>
      )}
      <label
        htmlFor="plan-confirmation"
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-white/15 p-4 text-sm leading-6 text-white/65 focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-[#15191f]"
      >
        <input
          id="plan-confirmation"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirm(event.target.checked)}
          aria-invalid={Boolean(errors["plan-confirmation"])}
          aria-describedby={
            errors["plan-confirmation"]
              ? "plan-confirmation-error"
              : undefined
          }
          className="mt-0.5 size-5 shrink-0 accent-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15191f]"
        />
        <span>
          Entendo que as projeções são estimativas baseadas nessas premissas e
          não garantem resultados futuros.
        </span>
      </label>
      {errors["plan-confirmation"] && (
        <p
          id="plan-confirmation-error"
          role="alert"
          className="-mt-3 text-xs leading-5 text-red-200"
        >
          {errors["plan-confirmation"]}
        </p>
      )}
    </div>
  );
}

function nextMonthStart(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01`;
}
function endOfMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(new Date(Date.UTC(year, month, 0, 12)).getUTCDate()).padStart(2, "0")}`;
}
function earliestTargetMonthEnd(date: string): string {
  const currentMonthEnd = endOfMonth(date);
  if (currentMonthEnd > date) return currentMonthEnd;
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return endOfMonth(value.toISOString().slice(0, 10));
}
function buildPlanPreview(
  values: InvestmentPlanFormValues,
): {
  conservative: number;
  base: number;
  favorable: number;
  baselineInPlanMode: number;
} | null {
  try {
    const months = monthsBetweenDates(
      values.baselineDate,
      endOfMonth(values.targetDate),
    );
    if (months < 0) return null;
    const baselineInPlanMode =
      !values.planId && values.valueMode === "real"
        ? nominalToRealValue(
            values.baselineValue,
            values.annualInflation / 100,
            monthsBetweenDates(values.valueReferenceDate, values.baselineDate),
          )
        : values.baselineValue;
    const project = (annualRate: number) =>
      projectPortfolio({
        initialBalance: baselineInPlanMode,
        annualRate: annualRate / 100,
        startDate: values.baselineDate,
        months,
        monthlyContribution: values.plannedMonthlyContribution,
      }).finalBalance;
    return {
      conservative: project(values.annualReturnConservative),
      base: project(values.annualReturnBase),
      favorable: project(values.annualReturnFavorable),
      baselineInPlanMode,
    };
  } catch {
    return null;
  }
}
function formatPlanDate(value: string): string {
  if (!value) return "Indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${value}T12:00:00Z`))
    .replace(" de ", " ")
    .replace(".", "");
}
function ModeCard({
  checked,
  disabled = false,
  label,
  detail,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  detail: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex min-h-24 items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 focus-within:ring-offset-[#15191f] ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${checked ? "border-blue-400/40 bg-blue-400/[0.08]" : "border-white/15 bg-[#0f1318] hover:border-white/25"}`}
    >
      <input
        type="radio"
        name="value-mode"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 size-5 shrink-0 accent-blue-500 focus-visible:outline-none"
      />
      <span>
        <strong className="block text-sm text-white/90">{label}</strong>
        <span className="mt-1 block text-xs leading-5 text-white/60">
          {detail}
        </span>
      </span>
    </label>
  );
}
function NumberInput({
  id,
  label,
  value,
  onChange,
  step = "0.01",
  min = 0,
  disabled = false,
  hint,
  error,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
  min?: number;
  disabled?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? Number.NaN : Number(event.target.value),
          )
        }
        className={inputClass}
      />
    </Field>
  );
}
function RatePreview({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${emphasized ? "border-blue-300/25 bg-blue-300/[0.07]" : "border-white/[0.07] bg-[#0f1318]"}`}
    >
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
          value,
        )}
        % a.a.
      </p>
    </div>
  );
}
function PreviewValue({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-blue-100/70">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-white">
        {money(value)}
      </p>
    </div>
  );
}
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-white/60">{label}</dt>
      <dd className="mt-1 font-medium text-white/80">{value}</dd>
    </div>
  );
}
