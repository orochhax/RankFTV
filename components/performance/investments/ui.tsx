import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

export const inputClass =
  "min-h-11 w-full rounded-lg border border-white/15 bg-[#0f1318] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/55 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-400/20 disabled:cursor-not-allowed disabled:opacity-55";

export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15191f] disabled:cursor-not-allowed disabled:opacity-50";

export function Surface({ children, className = "", as = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  const Component = as;
  return <Component className={`min-w-0 rounded-lg border border-white/10 bg-[#15191f] text-white shadow-[0_18px_45px_rgba(0,0,0,0.16)] ${className}`}>{children}</Component>;
}

type FieldControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  const child = isValidElement(children)
    ? (children as ReactElement<FieldControlProps>)
    : null;
  const generatedDescriptions = [
    hint && htmlFor ? `${htmlFor}-hint` : null,
    error && htmlFor ? `${htmlFor}-error` : null,
  ];
  const describedBy = [
    child?.props["aria-describedby"],
    ...generatedDescriptions,
  ]
    .filter(Boolean)
    .join(" ") || undefined;
  const isFormControl =
    child &&
    typeof child.type === "string" &&
    ["input", "select", "textarea"].includes(child.type);
  const control = isFormControl
    ? cloneElement(child, {
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : child.props["aria-invalid"],
      })
    : children;

  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-white/80"
      >
        {label}
      </label>
      <div className="mt-1.5">{control}</div>
      {hint && (
        <p
          id={htmlFor ? `${htmlFor}-hint` : undefined}
          className="mt-1.5 text-xs leading-5 text-white/60"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="mt-1.5 text-xs leading-5 text-red-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function IconButton({ label, className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${className}`} {...props}>{children}</button>;
}

export function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Indisponível";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

export function compactMoney(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function dateLabel(value: string | null | undefined): string {
  if (!value) return "Indisponível";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`))
    .replace(" de ", " ")
    .replace(".", "");
}

export function monthLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 7)}-01T12:00:00Z`));
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "Indisponível";
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}%`;
}

export function signedMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Indisponível";
  return `${value > 0 ? "+" : ""}${money(value)}`;
}

export function parseFormNumber(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
