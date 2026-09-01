import { AlertTriangle, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format";
import type { RefundPolicyDecision } from "@/lib/refund-policy";

function formatDateTimeBahia(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Bahia",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function purchaseDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Bahia",
  });
}

export function RefundPolicySummary({
  decision,
  purchasedAt,
  eventStartDate,
  baseAmount,
  paidAmount,
}: {
  decision: RefundPolicyDecision;
  purchasedAt: string;
  eventStartDate: string | null;
  baseAmount: number;
  paidAmount?: number | null;
}) {
  const allowed = decision.allowed;
  const tone = allowed
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : "bg-red-50 text-red-800 ring-red-200";
  const Icon = allowed ? CheckCircle2 : AlertTriangle;

  let title = "Cancelamento indisponível";
  let description = "Não foi possível validar as condições deste ingresso.";

  switch (decision.code) {
    case "cancel_without_charge":
      title = "Cancelamento disponível sem cobrança";
      description = "Este ingresso ainda não possui uma cobrança paga. Ao confirmar, ele será cancelado e a vaga será liberada.";
      break;
    case "full_refund":
      title = "Reembolso integral disponível";
      description = paidAmount != null
        ? `Você receberá ${formatBRL(paidAmount)}, incluindo a taxa de serviço.`
        : "Você receberá todo o valor pago, incluindo a taxa de serviço.";
      break;
    case "partial_refund":
      title = "Reembolso parcial disponível";
      description = `Você receberá ${formatBRL(baseAmount)} referentes ao ingresso. A taxa de serviço não será devolvida.`;
      break;
    case "blocked_checked_in":
      description = "O QR Code deste ingresso já foi utilizado no check-in.";
      break;
    case "blocked_event_started":
      description = "A data do evento já começou e o ingresso não pode mais ser cancelado pelo autoatendimento.";
      break;
    case "blocked_late":
      description = "A compra passou de 7 dias e faltam menos de 72 horas para o evento.";
      break;
    case "blocked_invalid_dates":
      description = "As datas da compra ou do evento precisam ser conferidas pelo suporte.";
      break;
  }

  return (
    <div className={`rounded-2xl p-4 ring-1 ${tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm opacity-90">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 border-t border-current/10 pt-3 text-xs opacity-80 sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <CalendarDays className="size-3.5 shrink-0" /> Compra: {purchaseDate(purchasedAt)}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays className="size-3.5 shrink-0" /> Evento: {eventStartDate ? formatDateBR(eventStartDate) : "data não disponível"}
        </p>
        {decision.code === "partial_refund" && decision.partialRefundDeadlineAt && (
          <p className="flex items-center gap-2 sm:col-span-2">
            <Clock3 className="size-3.5 shrink-0" /> Disponível até {formatDateTimeBahia(decision.partialRefundDeadlineAt)}
          </p>
        )}
      </div>

      {!allowed && (
        <p className="mt-3 text-xs opacity-80">
          Cancelamento do evento, alteração relevante, cobrança duplicada ou falha da plataforma continuam sujeitos a atendimento e reembolso integral.
        </p>
      )}
    </div>
  );
}
