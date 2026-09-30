"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

export const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none focus:border-blue-500";

export function Field({
  name,
  title,
  type = "text",
  required = false,
  value,
  onChange,
  placeholder,
  min,
}: {
  name: string;
  title: string;
  type?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="block text-xs font-medium text-white/45">
      {title}
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        value={onChange ? value : undefined}
        defaultValue={onChange ? undefined : value}
        placeholder={placeholder}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        className={`${inputClass} mt-1`}
      />
    </label>
  );
}
export function ActionForm({
  action,
  children,
  onDone,
}: {
  action: (data: FormData) => Promise<{ ok: boolean; error?: string }>;
  children: React.ReactNode;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = event.currentTarget;
        const data = new FormData(form);
        startTransition(async () => {
          const result = await action(data);
          if (!result.ok) setError(result.error ?? "Nao foi possivel salvar.");
          else {
            form.reset();
            onDone?.();
            router.refresh();
          }
        });
      }}
      className="space-y-3"
    >
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Salvar
      </button>
    </form>
  );
}
