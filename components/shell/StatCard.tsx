import { Surface } from "@/components/shell/Surface";

type Tone = "default" | "success" | "warning" | "danger";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-ink",
  success: "text-success",
  warning: "text-warning",
  danger:  "text-danger",
};

const ICON_TONE: Record<Tone, string> = {
  default: "bg-blue-50 text-blue-600",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger:  "bg-danger-bg text-danger",
};

// Cartão de indicador numérico — usado em grids de métricas (dashboards do
// organizador, arena, admin). Só deve renderizar quando o valor vem de uma
// consulta real; nunca preencher com dado inventado.
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <Surface padding="md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        {Icon && (
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[tone]}`}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className={`mt-2 text-2xl font-bold ${VALUE_TONE[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </Surface>
  );
}
