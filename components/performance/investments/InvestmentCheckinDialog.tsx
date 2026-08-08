"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { usePerformanceConfirm } from "@/components/performance/PerformanceConfirmDialog";
import { AccessibleDialog } from "@/components/performance/investments/AccessibleDialog";
import type { InvestmentWithdrawalRow } from "@/components/performance/investments/types";
import {
  dateLabel,
  Field,
  inputClass,
  money,
  primaryButtonClass,
  secondaryButtonClass,
  signedMoney,
} from "@/components/performance/investments/ui";
import type { PortfolioSnapshot } from "@/lib/performance-life-os";
import type { InvestmentContribution } from "@/lib/performance-widgets";

type CheckinResult = {
  ok: boolean;
  error?: string;
  message?: string;
  code?: string;
  errorCode?: string;
  conflict?: { date: string; totalValue: number };
};

export function InvestmentCheckinDialog({
  open,
  today,
  initialDate,
  initialValue,
  initialNotes,
  snapshots,
  contributions,
  withdrawals,
  onClose,
  onSubmit,
  onSuccess,
  onAddContribution,
  onAddWithdrawal,
}: {
  open: boolean;
  today: string;
  initialDate?: string;
  initialValue?: number | null;
  initialNotes?: string | null;
  snapshots: PortfolioSnapshot[];
  contributions: InvestmentContribution[];
  withdrawals: InvestmentWithdrawalRow[];
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<CheckinResult>;
  onSuccess: (message: string) => void;
  onAddContribution: () => void;
  onAddWithdrawal: () => void;
}) {
  if (!open) return null;
  return (
    <InvestmentCheckinDialogContent
      today={today}
      initialDate={initialDate}
      initialValue={initialValue}
      initialNotes={initialNotes}
      snapshots={snapshots}
      contributions={contributions}
      withdrawals={withdrawals}
      onClose={onClose}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
      onAddContribution={onAddContribution}
      onAddWithdrawal={onAddWithdrawal}
    />
  );
}

function InvestmentCheckinDialogContent({
  today,
  initialDate,
  initialValue,
  initialNotes,
  snapshots,
  contributions,
  withdrawals,
  onClose,
  onSubmit,
  onSuccess,
  onAddContribution,
  onAddWithdrawal,
}: Omit<Parameters<typeof InvestmentCheckinDialog>[0], "open">) {
  const confirm = usePerformanceConfirm();
  const [date, setDate] = useState(initialDate ?? today);
  const [value, setValue] = useState(
    initialValue == null ? "" : initialValue.toFixed(2),
  );
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{
    date?: string;
    value?: string;
  }>({});
  const interval = useMemo(() => {
    const previous =
      [...snapshots]
        .filter((item) => item.date < date)
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
    const after = previous?.date ?? "";
    const intervalContributions = contributions
      .filter((item) => item.date > after && item.date <= date)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const intervalWithdrawals = withdrawals
      .filter((item) => item.date > after && item.date <= date)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const contributionTotal = intervalContributions
      .reduce((total, item) => total + item.amount, 0);
    const withdrawalTotal = intervalWithdrawals
      .reduce((total, item) => total + item.amount, 0);
    return {
      previous,
      contributions: intervalContributions,
      withdrawals: intervalWithdrawals,
      contributionTotal,
      withdrawalTotal,
    };
  }, [contributions, date, snapshots, withdrawals]);
  const numericValue = value.trim() === "" ? null : Number(value);
  const previewResidual =
    numericValue != null && Number.isFinite(numericValue) && interval.previous
      ? numericValue -
        interval.previous.totalValue -
        interval.contributionTotal +
        interval.withdrawalTotal
      : null;
  const previewText =
    numericValue == null || !Number.isFinite(numericValue)
      ? "Informe o valor para visualizar o novo ponto da trajetória."
      : interval.previous && previewResidual != null
        ? `O histórico receberá ${money(numericValue)} em ${dateLabel(date)}. A variação total será ${signedMoney(numericValue - interval.previous.totalValue)} e o movimento residual estimado será ${signedMoney(previewResidual)}.`
        : `O histórico receberá ${money(numericValue)} em ${dateLabel(date)}. Este será o ponto inicial observado.`;

  const submit = async (replaceExisting: boolean) => {
    const nextFieldError: { date?: string; value?: string } = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today)
      nextFieldError.date = "Informe uma data válida, sem usar uma data futura.";
    if (value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0)
      nextFieldError.value = "Informe um valor de carteira não negativo.";
    if (nextFieldError.date || nextFieldError.value) {
      setFieldError(nextFieldError);
      return;
    }
    setFieldError({});
    setPending(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("date", date);
      data.set("total_value", value);
      data.set("notes", notes);
      data.set("replace_existing", replaceExisting ? "true" : "false");
      const result = await onSubmit(data);
      const conflictCode = result.code ?? result.errorCode;
      if (!result.ok && conflictCode === "CHECKIN_EXISTS") {
        setPending(false);
        const approved = await confirm({
          title: "Substituir check-in existente?",
          description: `Já existe um check-in em ${new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}${result.conflict ? ` no valor de ${money(result.conflict.totalValue)}` : ""}. O valor anterior será substituído, sem criar duplicidade.`,
          confirmLabel: "Substituir check-in",
          tone: "primary",
        });
        if (approved) await submit(true);
        return;
      }
      if (!result.ok)
        setError(result.error ?? "Não foi possível salvar o check-in.");
      else {
        onSuccess(
          result.message ?? "Check-in salvo. Sua rota foi recalculada.",
        );
        onClose();
      }
    } catch {
      setError(
        navigator.onLine
          ? "Não foi possível salvar o check-in. Tente novamente."
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
      title="Fazer check-in"
      description="Atualize o valor total observado para recalcular a rota com segurança."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(false);
        }}
        className="space-y-5"
        aria-describedby={error ? "investment-checkin-error" : undefined}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data" htmlFor="checkin-date">
            <input
              data-autofocus
              id="checkin-date"
              type="date"
              max={today}
              value={date}
              onChange={(event) => {
                const nextDate = event.target.value;
                const existing = snapshots.find((item) => item.date === nextDate);
                setDate(nextDate);
                setValue(existing ? existing.totalValue.toFixed(2) : "");
                setNotes(existing?.notes ?? "");
                setFieldError((current) => ({ ...current, date: undefined }));
              }}
              required
              aria-invalid={Boolean(fieldError.date)}
              aria-describedby={fieldError.date ? "checkin-date-error" : undefined}
              className={inputClass}
            />
            {fieldError.date && (
              <p id="checkin-date-error" className="text-xs leading-5 text-red-200">
                {fieldError.date}
              </p>
            )}
          </Field>
          <Field label="Valor total da carteira" htmlFor="checkin-value">
            <input
              id="checkin-value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setFieldError((current) => ({ ...current, value: undefined }));
              }}
              required
              aria-invalid={Boolean(fieldError.value)}
              aria-describedby={fieldError.value ? "checkin-value-error" : undefined}
              className={inputClass}
            />
            {fieldError.value && (
              <p id="checkin-value-error" className="text-xs leading-5 text-red-200">
                {fieldError.value}
              </p>
            )}
          </Field>
        </div>
        <div className="rounded-lg border border-white/[0.07] bg-[#0f1318] p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="size-4 text-blue-300" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Desde o check-in anterior</h3>
          </div>
          <p className="mt-1 text-xs text-white/50">
            {interval.previous
              ? `Movimentos em (${dateLabel(interval.previous.date)}, ${dateLabel(date)}].`
              : "Este será o primeiro ponto observado da carteira; os movimentos até a data escolhida aparecem abaixo."}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-white/50">Aportes</dt>
              <dd className="mt-1 font-semibold tabular-nums text-blue-200">
                + {money(interval.contributionTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Retiradas</dt>
              <dd className="mt-1 font-semibold tabular-nums text-amber-200">
                − {money(interval.withdrawalTotal)}
              </dd>
            </div>
          </dl>
          {interval.contributions.length || interval.withdrawals.length ? (
            <ul className="mt-4 max-h-36 space-y-1 overflow-auto border-t border-white/[0.07] pt-3 text-xs">
              {[
                ...interval.contributions.map((item) => ({
                  id: `contribution-${item.id}`,
                  date: item.date,
                  label: item.institution || item.notes || "Aporte",
                  amount: item.amount,
                  kind: "contribution" as const,
                })),
                ...interval.withdrawals.map((item) => ({
                  id: `withdrawal-${item.id}`,
                  date: item.date,
                  label: item.institution || item.notes || "Retirada",
                  amount: item.amount,
                  kind: "withdrawal" as const,
                })),
              ]
                .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
                .map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                    <span className="w-20 shrink-0 text-white/55">{dateLabel(item.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-white/65">{item.label}</span>
                    <span className={item.kind === "contribution" ? "text-blue-200" : "text-amber-200"}>
                      {item.kind === "contribution" ? "+ " : "− "}{money(item.amount)}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-4 border-t border-white/[0.07] pt-3 text-xs text-white/55">
              Nenhuma movimentação registrada neste intervalo.
            </p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onAddContribution}
              className={secondaryButtonClass}
            >
              <ArrowDownToLine className="size-4" aria-hidden="true" />
              Registrar aporte ausente
            </button>
            <button
              type="button"
              onClick={onAddWithdrawal}
              className={secondaryButtonClass}
            >
              <ArrowUpFromLine className="size-4" aria-hidden="true" />
              Registrar retirada ausente
            </button>
          </div>
        </div>
        <Field label="Observação" htmlFor="checkin-notes" hint="Opcional">
          <textarea
            id="checkin-notes"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="O que mudou desde o último check-in?"
            className={inputClass}
          />
        </Field>
        <div className="rounded-lg border border-blue-300/15 bg-blue-300/[0.055] px-4 py-3 text-sm leading-6 text-blue-100">
          <p className="font-semibold">Prévia do recálculo</p>
          <p className="mt-1">
            {previewText} O plano será preservado e a rota será recalculada.
          </p>
        </div>
        {error && (
          <p
            id="investment-checkin-error"
            role="alert"
            className="rounded-lg border border-red-300/15 bg-red-300/[0.07] px-3 py-2 text-sm leading-6 text-red-200"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClass} w-full sm:w-auto`}
        >
          {pending ? (
            <Loader2
              className="size-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {pending ? "Salvando…" : "Salvar e recalcular rota"}
        </button>
      </form>
    </AccessibleDialog>
  );
}
