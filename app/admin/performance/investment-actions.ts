"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isPerformanceOwner } from "@/lib/performance-owner";
import { monthsBetweenDates, nominalToRealValue } from "@/lib/investment-route";
import { createClient } from "@/lib/supabase/server";

const PERFORMANCE_PATH = "/admin/performance";
const TIME_ZONE = "America/Bahia";
const MAX_MONEY = 999_999_999_999.99;
const MAX_VARIATION_PERCENTAGE = 99_999_999.9999;

export type InvestmentActionCode =
  | "ACCESS_DENIED"
  | "ACTIVE_PLAN_EXISTS"
  | "CHECKIN_EXISTS"
  | "MIGRATION_REQUIRED"
  | "NOT_FOUND"
  | "PLAN_CLOSED"
  | "REVISION_CONFLICT"
  | "SAVE_FAILED"
  | "TARGET_NOT_REACHED"
  | "VALIDATION_ERROR";

export type InvestmentActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  code?: InvestmentActionCode;
  conflict?: {
    date: string;
    totalValue: number;
  };
};

export type InvestmentPlanRow = {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvestmentPlanRevisionRow = {
  id: string;
  plan_id: string;
  user_id: string;
  version: number;
  effective_from: string;
  baseline_date: string;
  baseline_value: number | string;
  target_value: number | string;
  target_date: string;
  value_mode: "real" | "nominal";
  value_reference_date: string;
  planned_monthly_contribution: number | string;
  annual_return_conservative: number | string;
  annual_return_base: number | string;
  annual_return_favorable: number | string;
  annual_inflation: number | string;
  change_note: string | null;
  created_at: string;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isPerformanceOwner(supabase, user))) return null;
  return { supabase, user };
}

function revalidatePerformance() {
  revalidatePath(PERFORMANCE_PATH);
}

function todayInBahia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function firstDayOfNextMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
}

function lastDayOfMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const day = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizedSingleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseDecimalInput(value: unknown): unknown {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== "string") return Number.NaN;

  const compact = value.trim().replace(/\s/g, "");
  if (!compact) return Number.NaN;

  let normalized = compact;
  if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(compact)) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d+(?:,\d+)?$/.test(compact)) {
    normalized = compact.replace(",", ".");
  } else if (!/^-?\d+(?:\.\d+)?$/.test(compact)) {
    return Number.NaN;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isValidCivilDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isAtMostOneHundredYears(start: string, end: string): boolean {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  if (endYear < startYear + 100) return true;
  if (endYear > startYear + 100) return false;
  if (endMonth < startMonth) return true;
  if (endMonth > startMonth) return false;
  return endDay <= startDay;
}

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
}

function hasAtMostSixDecimalPlaces(value: number): boolean {
  return Math.abs(value * 1_000_000 - Math.round(value * 1_000_000)) < 1e-6;
}

const uuidSchema = z.string().uuid("Identificador inválido.");
const civilDateSchema = z
  .string()
  .refine(isValidCivilDate, "Informe uma data válida.");
const moneySchema = z.preprocess(
  parseDecimalInput,
  z
    .number("Informe um valor válido.")
    .finite("Informe um valor finito.")
    .min(0, "O valor não pode ser negativo.")
    .max(MAX_MONEY, "O valor informado é muito alto.")
    .refine(hasAtMostTwoDecimalPlaces, "Use no máximo duas casas decimais."),
);
const positiveMoneySchema = moneySchema.refine(
  (value) => value > 0,
  "O valor precisa ser maior que zero.",
);
const percentagePointsSchema = z.preprocess(
  parseDecimalInput,
  z
    .number("Informe uma taxa válida.")
    .finite("Informe uma taxa finita.")
    .gt(-100, "A taxa anual precisa ser maior que -100%.")
    .max(1000, "A taxa anual não pode ultrapassar 1.000%.")
    .refine(
      hasAtMostSixDecimalPlaces,
      "Use no máximo seis casas decimais na taxa.",
    ),
);

const planInputSchema = z
  .object({
    name: z
      .string()
      .transform(normalizedSingleLine)
      .pipe(
        z
          .string()
          .min(1, "Informe o nome do destino.")
          .max(120, "Use até 120 caracteres no nome."),
      ),
    baselineDate: civilDateSchema,
    baselineValue: moneySchema,
    targetValue: positiveMoneySchema,
    targetDate: civilDateSchema,
    valueMode: z.enum(["real", "nominal"], {
      error: "Escolha valores reais ou nominais.",
    }),
    valueReferenceDate: civilDateSchema,
    plannedMonthlyContribution: moneySchema,
    annualReturnConservative: percentagePointsSchema,
    annualReturnBase: percentagePointsSchema,
    annualReturnFavorable: percentagePointsSchema,
    annualInflation: percentagePointsSchema,
    effectiveFrom: civilDateSchema,
    changeNote: z
      .string()
      .trim()
      .max(1000, "Use até 1.000 caracteres na observação.")
      .nullable(),
    revision: z.boolean(),
    today: civilDateSchema,
  })
  .superRefine((input, context) => {
    if (input.baselineDate > input.today) {
      context.addIssue({
        code: "custom",
        path: ["baselineDate"],
        message: "A data-base não pode estar no futuro.",
      });
    }
    if (input.valueReferenceDate > input.today) {
      context.addIssue({
        code: "custom",
        path: ["valueReferenceDate"],
        message: "A data-base dos valores não pode estar no futuro.",
      });
    }
    if (input.targetDate <= input.baselineDate) {
      context.addIssue({
        code: "custom",
        path: ["targetDate"],
        message: "A data-alvo precisa ser posterior à data-base.",
      });
    }
    if (
      isValidCivilDate(input.baselineDate) &&
      isValidCivilDate(input.targetDate) &&
      !isAtMostOneHundredYears(input.baselineDate, input.targetDate)
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetDate"],
        message: "O horizonte do plano não pode ultrapassar 100 anos.",
      });
    }
    if (
      input.effectiveFrom < input.baselineDate ||
      input.effectiveFrom > input.targetDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveFrom"],
        message: "A vigência precisa ficar entre a data-base e a data-alvo.",
      });
    }
    if (input.revision && input.effectiveFrom < input.today) {
      context.addIssue({
        code: "custom",
        path: ["effectiveFrom"],
        message: "Uma nova revisão não pode alterar meses passados.",
      });
    }
    if (!input.revision && input.effectiveFrom !== input.today) {
      context.addIssue({
        code: "custom",
        path: ["effectiveFrom"],
        message: "O plano inicial precisa começar hoje.",
      });
    }
    if (
      input.revision &&
      input.effectiveFrom !== input.today &&
      input.effectiveFrom !== firstDayOfNextMonth(input.today)
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveFrom"],
        message: "Escolha vigência imediata ou no primeiro dia do próximo mês.",
      });
    }
    if (input.annualReturnConservative > input.annualReturnBase) {
      context.addIssue({
        code: "custom",
        path: ["annualReturnConservative"],
        message: "A taxa conservadora não pode superar a taxa-base.",
      });
    }
    if (input.annualReturnBase > input.annualReturnFavorable) {
      context.addIssue({
        code: "custom",
        path: ["annualReturnFavorable"],
        message: "A taxa favorável não pode ser menor que a taxa-base.",
      });
    }
  });

const movementInputSchema = z.object({
  date: civilDateSchema,
  amount: positiveMoneySchema,
  institution: z
    .string()
    .trim()
    .max(120, "Use até 120 caracteres na instituição.")
    .nullable(),
  notes: z
    .string()
    .trim()
    .max(1000, "Use até 1.000 caracteres na observação.")
    .nullable(),
});

const checkinInputSchema = z.object({
  date: civilDateSchema,
  totalValue: moneySchema,
  notes: z
    .string()
    .trim()
    .max(1000, "Use até 1.000 caracteres na observação.")
    .nullable(),
  replaceExisting: z.boolean(),
});

type PlanInput = z.infer<typeof planInputSchema>;

function parsePlanInput(formData: FormData, revision: boolean) {
  const today = todayInBahia();
  const baselineDate = formString(formData, "baseline_date");
  const requestedTargetDate = formString(formData, "target_date");
  const requestedEffectiveFrom = formString(formData, "effective_from");

  return planInputSchema.safeParse({
    name: formString(formData, "name") || "Meu destino",
    baselineDate,
    baselineValue: formString(formData, "baseline_value"),
    targetValue: formString(formData, "target_value"),
    targetDate: isValidCivilDate(requestedTargetDate)
      ? lastDayOfMonth(requestedTargetDate)
      : requestedTargetDate,
    valueMode: formString(formData, "value_mode"),
    valueReferenceDate: formString(formData, "value_reference_date"),
    plannedMonthlyContribution: formString(
      formData,
      "planned_monthly_contribution",
    ),
    annualReturnConservative: formString(
      formData,
      "annual_return_conservative",
    ),
    annualReturnBase: formString(formData, "annual_return_base"),
    annualReturnFavorable: formString(formData, "annual_return_favorable"),
    annualInflation: formString(formData, "annual_inflation"),
    effectiveFrom:
      requestedEffectiveFrom ||
      (revision ? firstDayOfNextMonth(today) : baselineDate),
    changeNote: optionalText(formString(formData, "change_note")),
    revision,
    today,
  });
}

function parseMovementInput(formData: FormData) {
  return movementInputSchema.safeParse({
    date: formString(formData, "date"),
    amount: formString(formData, "amount"),
    institution: optionalText(formString(formData, "institution")),
    notes: optionalText(formString(formData, "notes")),
  });
}

function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revise os dados informados.";
}

function validationFailure(error: z.ZodError): InvestmentActionResult {
  return {
    ok: false,
    code: "VALIDATION_ERROR",
    error: firstValidationMessage(error),
  };
}

function accessDenied(): InvestmentActionResult {
  return { ok: false, code: "ACCESS_DENIED", error: "Acesso negado." };
}

function isMissingMigration(error: SupabaseErrorLike): boolean {
  const message = error.message ?? "";
  const namesInvestmentRouteTable =
    /(?:perf_investment_(?:plan|contribution|withdrawal)|perf_portfolio_snapshot)/i.test(
      message,
    );
  const explicitlyReportsMissingSchema =
    /(?:does not exist|schema cache)/i.test(message);

  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    (namesInvestmentRouteTable && explicitlyReportsMissingSchema)
  );
}

function saveFailure(
  error: SupabaseErrorLike,
  fallback: string,
): InvestmentActionResult {
  if (
    error.code === "P0001" &&
    /investment target not reached/i.test(error.message ?? "")
  ) {
    return {
      ok: false,
      code: "TARGET_NOT_REACHED",
      error:
        "O patrimônio estimado ainda não atingiu o alvo vigente. Faça um check-in ou continue acompanhando a rota.",
    };
  }
  if (error.code === "23505") {
    return {
      ok: false,
      code: "ACTIVE_PLAN_EXISTS",
      error: "Já existe um plano principal ativo.",
    };
  }
  if (error.code === "40001") {
    return {
      ok: false,
      code: "REVISION_CONFLICT",
      error:
        "O plano mudou em outra sessão. Recarregue a página antes de salvar este ajuste.",
    };
  }
  if (isMissingMigration(error)) {
    return {
      ok: false,
      code: "MIGRATION_REQUIRED",
      error:
        "A estrutura da Carteira em Rota ainda não foi instalada neste ambiente.",
    };
  }
  if (error.code === "55000") {
    return {
      ok: false,
      code: "PLAN_CLOSED",
      error: "Este plano já foi encerrado.",
    };
  }
  return { ok: false, code: "SAVE_FAILED", error: fallback };
}

function rpcPlanPayload(input: PlanInput) {
  return {
    p_name: input.name,
    p_baseline_date: input.baselineDate,
    p_baseline_value: input.baselineValue,
    p_target_value: input.targetValue,
    p_target_date: input.targetDate,
    p_value_mode: input.valueMode,
    p_value_reference_date: input.valueReferenceDate,
    p_planned_monthly_contribution: input.plannedMonthlyContribution,
    // O formulário usa pontos percentuais humanos; o banco e a engine usam frações.
    p_annual_return_conservative: input.annualReturnConservative / 100,
    p_annual_return_base: input.annualReturnBase / 100,
    p_annual_return_favorable: input.annualReturnFavorable / 100,
    p_annual_inflation: input.annualInflation / 100,
    p_effective_from: input.effectiveFrom,
    p_change_note: input.changeNote,
  };
}

function baselineValueInPlanMode(input: PlanInput): number {
  if (input.valueMode === "nominal") return input.baselineValue;
  const months = monthsBetweenDates(
    input.valueReferenceDate,
    input.baselineDate,
  );
  const converted = nominalToRealValue(
    input.baselineValue,
    input.annualInflation / 100,
    months,
  );
  return Math.round((converted + Number.EPSILON) * 100) / 100;
}

export async function criarPlanoInvestimento(
  formData: FormData,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsed = parsePlanInput(formData, false);
  if (!parsed.success) return validationFailure(parsed.error);
  const createInitialSnapshot = booleanFormValue(
    formData.get("create_initial_snapshot"),
  );
  const initialSnapshotNotes = optionalText(
    formString(formData, "initial_snapshot_notes"),
  );
  if (createInitialSnapshot && parsed.data.baselineDate !== parsed.data.today) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error: "O primeiro check-in precisa usar a data de hoje.",
    };
  }
  if (initialSnapshotNotes && initialSnapshotNotes.length > 1000) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error: "Use até 1.000 caracteres na observação do check-in inicial.",
    };
  }
  let baselineForPlan: number;
  try {
    baselineForPlan = baselineValueInPlanMode(parsed.data);
  } catch {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error:
        "A conversão do valor inicial para a data-base escolhida não é válida.",
    };
  }
  if (
    !Number.isFinite(baselineForPlan) ||
    baselineForPlan < 0 ||
    baselineForPlan > MAX_MONEY
  ) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error: "O valor inicial convertido ficou fora do limite aceito.",
    };
  }

  const { error } = await context.supabase.rpc("perf_create_investment_plan", {
    ...rpcPlanPayload({ ...parsed.data, baselineValue: baselineForPlan }),
    p_create_initial_snapshot: createInitialSnapshot,
    p_initial_snapshot_value: parsed.data.baselineValue,
    p_initial_snapshot_notes: initialSnapshotNotes,
  });
  if (
    error?.code === "23505" &&
    createInitialSnapshot &&
    /perf_portfolio_snapshot/i.test(error.message ?? "")
  ) {
    return {
      ok: false,
      code: "SAVE_FAILED",
      error:
        "Não foi possível salvar o plano e o check-in inicial juntos. Recarregue a página e tente novamente.",
    };
  }
  if (error)
    return saveFailure(
      error,
      "Não foi possível criar o plano. Tente novamente.",
    );

  revalidatePerformance();
  return {
    ok: true,
    message: createInitialSnapshot
      ? "Plano e primeiro check-in salvos. Sua rota foi calculada."
      : "Plano salvo. Sua rota foi calculada.",
  };
}

export async function revisarPlanoInvestimento(
  planId: string,
  formData: FormData,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsedId = uuidSchema.safeParse(planId);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = parsePlanInput(formData, true);
  if (!parsed.success) return validationFailure(parsed.error);
  const expectedVersion = z.coerce
    .number()
    .int()
    .positive()
    .safeParse(formString(formData, "expected_version"));
  if (!expectedVersion.success) return validationFailure(expectedVersion.error);

  const { error } = await context.supabase.rpc(
    "perf_create_investment_plan_revision",
    {
      p_plan_id: parsedId.data,
      ...rpcPlanPayload(parsed.data),
      p_expected_version: expectedVersion.data,
    },
  );
  if (error)
    return saveFailure(
      error,
      "Não foi possível ajustar o plano. Tente novamente.",
    );

  revalidatePerformance();
  return {
    ok: true,
    message: "Plano ajustado. A revisão anterior foi preservada.",
  };
}

async function closePlan(
  planId: string,
  status: "completed" | "archived",
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsedId = uuidSchema.safeParse(planId);
  if (!parsedId.success) return validationFailure(parsedId.error);

  const { error } = await context.supabase.rpc("perf_close_investment_plan", {
    p_plan_id: parsedId.data,
    p_status: status,
  });
  if (error)
    return saveFailure(
      error,
      "Não foi possível encerrar o plano. Tente novamente.",
    );

  revalidatePerformance();
  return {
    ok: true,
    message:
      status === "completed"
        ? "Destino marcado como concluído."
        : "Plano arquivado.",
  };
}

export async function concluirPlanoInvestimento(
  planId: string,
): Promise<InvestmentActionResult> {
  return closePlan(planId, "completed");
}

export async function arquivarPlanoInvestimento(
  planId: string,
): Promise<InvestmentActionResult> {
  return closePlan(planId, "archived");
}

function booleanFormValue(value: FormDataEntryValue | null): boolean {
  return (
    typeof value === "string" &&
    ["1", "true", "on", "yes"].includes(value.toLowerCase())
  );
}

function portfolioVariation(totalValue: number, previousValue: number | null) {
  if (previousValue == null) {
    return {
      previousValue: null,
      variationAmount: null,
      variationPercentage: null,
      movement: "stable" as const,
    };
  }

  const variationAmount = totalValue - previousValue;
  const rawVariationPercentage =
    previousValue > 0 ? (variationAmount / previousValue) * 100 : null;
  const variationPercentage =
    rawVariationPercentage != null &&
    Number.isFinite(rawVariationPercentage) &&
    Math.abs(rawVariationPercentage) <= MAX_VARIATION_PERCENTAGE
      ? rawVariationPercentage
      : null;

  return {
    previousValue,
    variationAmount,
    variationPercentage,
    movement:
      variationAmount > 0
        ? ("up" as const)
        : variationAmount < 0
          ? ("down" as const)
          : ("stable" as const),
  };
}

async function currentCheckinConflict(
  context: NonNullable<Awaited<ReturnType<typeof requireOwner>>>,
  date: string,
): Promise<InvestmentActionResult> {
  const { data, error } = await context.supabase
    .from("perf_portfolio_snapshot")
    .select("total_value")
    .eq("user_id", context.user.id)
    .eq("date", date)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      code: "SAVE_FAILED",
      error:
        "Outro check-in foi salvo nesta data. Recarregue a página antes de tentar novamente.",
    };
  }

  return {
    ok: false,
    code: "CHECKIN_EXISTS",
    error:
      "Já existe um check-in nesta data. Confirme para substituir o valor atual.",
    conflict: {
      date,
      totalValue: Number(data.total_value),
    },
  };
}

export async function fazerCheckinInvestimento(
  formData: FormData,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsed = checkinInputSchema.safeParse({
    date: formString(formData, "date"),
    totalValue: formString(formData, "total_value"),
    notes: optionalText(formString(formData, "notes")),
    replaceExisting: booleanFormValue(formData.get("replace_existing")),
  });
  if (!parsed.success) return validationFailure(parsed.error);
  if (parsed.data.date > todayInBahia()) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      error: "A data do check-in não pode estar no futuro.",
    };
  }

  const { data: existing, error: existingError } = await context.supabase
    .from("perf_portfolio_snapshot")
    .select("id, total_value")
    .eq("user_id", context.user.id)
    .eq("date", parsed.data.date)
    .maybeSingle();
  if (existingError) {
    return saveFailure(
      existingError,
      "Não foi possível verificar o check-in existente.",
    );
  }
  if (existing && !parsed.data.replaceExisting) {
    return {
      ok: false,
      code: "CHECKIN_EXISTS",
      error:
        "Já existe um check-in nesta data. Confirme para substituir o valor atual.",
      conflict: {
        date: parsed.data.date,
        totalValue: Number(existing.total_value),
      },
    };
  }

  const { data: previous, error: previousError } = await context.supabase
    .from("perf_portfolio_snapshot")
    .select("total_value")
    .eq("user_id", context.user.id)
    .lt("date", parsed.data.date)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousError) {
    return saveFailure(
      previousError,
      "Não foi possível consultar o check-in anterior.",
    );
  }

  // Estes campos derivados preservam a compatibilidade antiga. A análise da
  // rota deve sempre recalcular intervalos a partir das fontes canônicas.
  const variation = portfolioVariation(
    parsed.data.totalValue,
    previous ? Number(previous.total_value) : null,
  );
  const snapshotValues = {
    date: parsed.data.date,
    total_value: parsed.data.totalValue,
    previous_value: variation.previousValue,
    variation_amount: variation.variationAmount,
    variation_percentage: variation.variationPercentage,
    movement: variation.movement,
    notes: parsed.data.notes,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data: updated, error } = await context.supabase
      .from("perf_portfolio_snapshot")
      .update(snapshotValues)
      .eq("id", existing.id)
      .eq("user_id", context.user.id)
      .select("id")
      .maybeSingle();
    if (error)
      return saveFailure(error, "Não foi possível atualizar o check-in.");
    if (!updated)
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "Check-in não encontrado.",
      };
  } else {
    const { error } = await context.supabase
      .from("perf_portfolio_snapshot")
      .insert({
        user_id: context.user.id,
        ...snapshotValues,
      });
    if (error?.code === "23505")
      return currentCheckinConflict(context, parsed.data.date);
    if (error) return saveFailure(error, "Não foi possível salvar o check-in.");
  }

  revalidatePerformance();
  return {
    ok: true,
    message: existing
      ? "Check-in atualizado. Sua rota foi recalculada."
      : "Check-in salvo. Sua rota foi recalculada.",
  };
}

function movementDateFailure(date: string): InvestmentActionResult | null {
  if (date <= todayInBahia()) return null;
  return {
    ok: false,
    code: "VALIDATION_ERROR",
    error: "A data da movimentação não pode estar no futuro.",
  };
}

export async function registrarAporteInvestimento(
  formData: FormData,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsed = parseMovementInput(formData);
  if (!parsed.success) return validationFailure(parsed.error);
  const dateFailure = movementDateFailure(parsed.data.date);
  if (dateFailure) return dateFailure;

  const { error } = await context.supabase
    .from("perf_investment_contribution")
    .insert({
      user_id: context.user.id,
      date: parsed.data.date,
      amount: parsed.data.amount,
      institution: parsed.data.institution,
      notes: parsed.data.notes,
      source: "manual",
      source_entry_id: null,
    });
  if (error) return saveFailure(error, "Não foi possível registrar o aporte.");

  revalidatePerformance();
  return { ok: true, message: "Aporte registrado." };
}

export async function editarAporteInvestimento(
  id: string,
  formData: FormData,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = parseMovementInput(formData);
  if (!parsed.success) return validationFailure(parsed.error);
  const dateFailure = movementDateFailure(parsed.data.date);
  if (dateFailure) return dateFailure;

  const { data, error } = await context.supabase
    .from("perf_investment_contribution")
    .update({
      date: parsed.data.date,
      amount: parsed.data.amount,
      institution: parsed.data.institution,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsedId.data)
    .eq("user_id", context.user.id)
    .eq("source", "manual")
    .is("source_entry_id", null)
    .select("id")
    .maybeSingle();
  if (error) return saveFailure(error, "Não foi possível editar o aporte.");
  if (!data)
    return { ok: false, code: "NOT_FOUND", error: "Aporte não encontrado." };

  revalidatePerformance();
  return { ok: true, message: "Aporte atualizado." };
}

export async function removerAporteInvestimento(
  id: string,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const { data, error } = await context.supabase
    .from("perf_investment_contribution")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", context.user.id)
    .eq("source", "manual")
    .is("source_entry_id", null)
    .select("id")
    .maybeSingle();
  if (error) return saveFailure(error, "Não foi possível remover o aporte.");
  if (!data)
    return { ok: false, code: "NOT_FOUND", error: "Aporte não encontrado." };

  revalidatePerformance();
  return { ok: true, message: "Aporte removido." };
}

export async function registrarRetiradaInvestimento(
  formData: FormData,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsed = parseMovementInput(formData);
  if (!parsed.success) return validationFailure(parsed.error);
  const dateFailure = movementDateFailure(parsed.data.date);
  if (dateFailure) return dateFailure;

  const { error } = await context.supabase
    .from("perf_investment_withdrawal")
    .insert({
      user_id: context.user.id,
      date: parsed.data.date,
      amount: parsed.data.amount,
      institution: parsed.data.institution,
      notes: parsed.data.notes,
    });
  if (error)
    return saveFailure(error, "Não foi possível registrar a retirada.");

  revalidatePerformance();
  return { ok: true, message: "Retirada registrada." };
}

export async function editarRetiradaInvestimento(
  id: string,
  formData: FormData,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const parsed = parseMovementInput(formData);
  if (!parsed.success) return validationFailure(parsed.error);
  const dateFailure = movementDateFailure(parsed.data.date);
  if (dateFailure) return dateFailure;

  const { data, error } = await context.supabase
    .from("perf_investment_withdrawal")
    .update({
      date: parsed.data.date,
      amount: parsed.data.amount,
      institution: parsed.data.institution,
      notes: parsed.data.notes,
    })
    .eq("id", parsedId.data)
    .eq("user_id", context.user.id)
    .select("id")
    .maybeSingle();
  if (error) return saveFailure(error, "Não foi possível editar a retirada.");
  if (!data)
    return { ok: false, code: "NOT_FOUND", error: "Retirada não encontrada." };

  revalidatePerformance();
  return { ok: true, message: "Retirada atualizada." };
}

export async function removerRetiradaInvestimento(
  id: string,
): Promise<InvestmentActionResult> {
  const context = await requireOwner();
  if (!context) return accessDenied();

  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) return validationFailure(parsedId.error);
  const { data, error } = await context.supabase
    .from("perf_investment_withdrawal")
    .delete()
    .eq("id", parsedId.data)
    .eq("user_id", context.user.id)
    .select("id")
    .maybeSingle();
  if (error) return saveFailure(error, "Não foi possível remover a retirada.");
  if (!data)
    return { ok: false, code: "NOT_FOUND", error: "Retirada não encontrada." };

  revalidatePerformance();
  return { ok: true, message: "Retirada removida." };
}
