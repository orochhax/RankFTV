"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { AccessibleDialog } from "@/components/performance/investments/AccessibleDialog";
import {
  Field,
  inputClass,
  primaryButtonClass,
} from "@/components/performance/investments/ui";

type MovementKind = "contribution" | "withdrawal";
type Item = {
  amount: number;
  date: string;
  institution: string | null;
  notes: string | null;
};
type ActionResult = { ok: boolean; error?: string; message?: string };
type MovementField = "amount" | "date";
type MovementFieldErrors = Partial<Record<MovementField, string>>;

export function InvestmentMovementDialog({
  open,
  kind,
  today,
  item,
  onClose,
  onSubmit,
  onSuccess,
}: {
  open: boolean;
  kind: MovementKind;
  today: string;
  item?: Item | null;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<ActionResult>;
  onSuccess: (message: string) => void;
}) {
  if (!open) return null;
  return (
    <InvestmentMovementDialogContent
      kind={kind}
      today={today}
      item={item}
      onClose={onClose}
      onSubmit={onSubmit}
      onSuccess={onSuccess}
    />
  );
}

function InvestmentMovementDialogContent({
  kind,
  today,
  item,
  onClose,
  onSubmit,
  onSuccess,
}: Omit<Parameters<typeof InvestmentMovementDialog>[0], "open">) {
  const [amount, setAmount] = useState(item ? item.amount.toFixed(2) : "");
  const [date, setDate] = useState(item?.date ?? today);
  const [institution, setInstitution] = useState(item?.institution ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<MovementFieldErrors>({});

  const label = kind === "contribution" ? "aporte" : "retirada";
  const clearFieldError = (field: MovementField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setError(null);
  };
  const validate = (): MovementFieldErrors => {
    const issues: MovementFieldErrors = {};
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      issues.amount = "Informe um valor maior que zero.";
    }
    if (!date) {
      issues.date = "Informe a data da movimentação.";
    } else if (date > today) {
      issues.date = "A data não pode estar no futuro.";
    }
    return issues;
  };

  return (
    <AccessibleDialog
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      title={`${item ? "Editar" : "Registrar"} ${label}`}
      description={
        kind === "contribution"
          ? "Registre o dinheiro novo que entrou na carteira."
          : "Retiradas afetam a rota, mas não reduzem sua aderência mensal."
      }
    >
      <form
        noValidate
        aria-busy={pending}
        aria-describedby={error ? `${kind}-form-error` : undefined}
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          const issues = validate();
          if (Object.keys(issues).length) {
            setFieldErrors(issues);
            const firstField = (Object.keys(issues) as MovementField[])[0];
            window.setTimeout(
              () => document.getElementById(`${kind}-${firstField}`)?.focus(),
              0,
            );
            return;
          }

          setFieldErrors({});
          setPending(true);
          try {
            const data = new FormData();
            data.set("amount", amount);
            data.set("date", date);
            data.set("institution", institution);
            data.set("notes", notes);
            const result = await onSubmit(data);
            if (!result.ok) {
              setError(
                result.error ?? `Não foi possível salvar ${label}.`,
              );
            } else {
              onSuccess(
                result.message ??
                  `${kind === "contribution" ? "Aporte" : "Retirada"} salvo${kind === "contribution" ? "" : "a"}.`,
              );
              onClose();
            }
          } catch {
            setError(
              navigator.onLine
                ? "Não foi possível salvar. Tente novamente."
                : "Você está sem conexão. Nada foi salvo ainda.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Valor"
            htmlFor={`${kind}-amount`}
            error={fieldErrors.amount}
          >
            <input
              data-autofocus
              id={`${kind}-amount`}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                clearFieldError("amount");
              }}
              required
              className={inputClass}
            />
          </Field>
          <Field
            label="Data"
            htmlFor={`${kind}-date`}
            error={fieldErrors.date}
          >
            <input
              id={`${kind}-date`}
              type="date"
              max={today}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                clearFieldError("date");
              }}
              required
              className={inputClass}
            />
          </Field>
        </div>
        <Field
          label="Instituição"
          htmlFor={`${kind}-institution`}
          hint="Opcional"
        >
          <input
            id={`${kind}-institution`}
            value={institution}
            onChange={(event) => {
              setInstitution(event.target.value);
              setError(null);
            }}
            maxLength={120}
            className={inputClass}
          />
        </Field>
        <Field
          label="Observação"
          htmlFor={`${kind}-notes`}
          hint="Opcional"
        >
          <textarea
            id={`${kind}-notes`}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setError(null);
            }}
            maxLength={1000}
            rows={3}
            className={inputClass}
          />
        </Field>
        {error && (
          <p
            id={`${kind}-form-error`}
            role="alert"
            className="rounded-lg border border-red-300/20 bg-red-300/[0.08] px-3 py-2 text-sm leading-6 text-red-100"
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
          {pending ? "Salvando…" : `Salvar ${label}`}
        </button>
      </form>
    </AccessibleDialog>
  );
}
