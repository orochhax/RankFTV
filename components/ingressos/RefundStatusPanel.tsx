import Link from "next/link";
import { buildRefundTimeline, type RefundTimelineStep } from "@/lib/refund-timeline";

type RefundStatusPanelProps = {
  billingType: string | null;
  refundStatus: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

type TimelineEvent = {
  key: RefundTimelineStep["key"];
  title: string;
  description: string;
  date: string | null;
  tone: "amber" | "emerald" | "red";
};

const TIMELINE_COPY: Record<
  RefundTimelineStep["key"],
  Pick<TimelineEvent, "title" | "description" | "tone">
> = {
  requested: {
    title: "Estorno solicitado",
    description: "Solicitação registrada e protegida contra repetição.",
    tone: "amber",
  },
  awaiting: {
    title: "Aguardando confirmação do reembolso",
    description: "Você não precisa repetir a solicitação.",
    tone: "amber",
  },
  completed: {
    title: "Estorno confirmado",
    description: "O processamento do reembolso foi confirmado.",
    tone: "emerald",
  },
  cancelled: {
    title: "Ingresso cancelado",
    description: "O cancelamento foi finalizado e o ingresso não pode mais ser usado.",
    tone: "red",
  },
};

function formatDateTime(date: string | null, fallback: string) {
  if (!date) return fallback;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bahia",
  }).format(parsed);
}

function TimelineItem({ event, last }: { event: TimelineEvent; last: boolean }) {
  const dot = event.tone === "emerald"
    ? "bg-emerald-600"
    : event.tone === "red"
      ? "bg-red-600"
      : "bg-amber-600";

  return (
    <li className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
      <span className="relative flex justify-center">
        {!last && <span className="absolute top-3 h-[calc(100%+1.25rem)] w-px bg-slate-300" />}
        <span className={`relative z-10 mt-1 size-3 rounded-full border-2 border-white ${dot}`} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-950">{event.title}</p>
        <p className="mt-0.5 text-sm text-slate-600">{formatDateTime(event.date, event.description)}</p>
        {event.date && <p className="mt-1 text-xs text-slate-500">{event.description}</p>}
      </div>
    </li>
  );
}

export function RefundStatusPanel({
  billingType,
  refundStatus,
  requestedAt,
  completedAt,
  cancelledAt,
}: RefundStatusPanelProps) {
  const hasRefund = Boolean(refundStatus || requestedAt);
  const refundCompleted = refundStatus === "refunded";
  const isCard = billingType === "CREDIT_CARD" || billingType === "DEBIT_CARD";
  const paymentMethod = isCard ? "cartão" : billingType === "PIX" ? "Pix" : "forma de pagamento usada";

  const events: TimelineEvent[] = buildRefundTimeline({
    refundStatus,
    requestedAt,
    completedAt,
    cancelledAt,
  }).map((step) => ({ ...step, ...TIMELINE_COPY[step.key] }));

  const title = refundCompleted
    ? "Reembolso concluído"
    : hasRefund
      ? "Estorno solicitado"
      : "Ingresso cancelado";
  const summary = refundCompleted
    ? "O reembolso foi confirmado, a vaga está liberada e este ingresso não pode mais ser usado."
    : hasRefund
      ? "Sua solicitação foi registrada. Você não precisa fazer nada nem repetir a solicitação."
      : "A compra foi cancelada sem cobrança. A vaga está liberada e este ingresso não pode mais ser usado.";
  const summaryTone = refundCompleted
    ? "border-emerald-200 bg-emerald-50"
    : hasRefund
      ? "border-amber-200 bg-amber-50"
      : "border-red-200 bg-red-50";

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Histórico do cancelamento e do estorno">
      <div className={`rounded-2xl border p-6 ${summaryTone}`}>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{summary}</p>

        <ol className="mt-6 space-y-5 text-left">
          {events.map((event, index) => (
            <TimelineItem key={event.key} event={event} last={index === events.length - 1} />
          ))}
        </ol>
      </div>

      <aside className="flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
        <h3 className="text-base font-semibold text-slate-950">
          {hasRefund ? "Prazo do reembolso" : "Resumo do cancelamento"}
        </h3>
        {hasRefund ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Forma de pagamento deste ingresso: <strong>{paymentMethod}</strong>.
            </p>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {isCard ? (
                <p>No cartão, após a confirmação, o crédito pode levar até 10 dias úteis para aparecer na fatura.</p>
              ) : billingType === "PIX" ? (
                <p>No Pix, a devolução é enviada à conta usada no pagamento. O prazo final depende da instituição financeira.</p>
              ) : (
                <p>O prazo final depende da forma de pagamento e da instituição financeira.</p>
              )}
            </div>
            <p className={`mt-4 text-sm font-semibold ${refundCompleted ? "text-emerald-700" : "text-amber-700"}`}>
              {refundCompleted ? "Processamento do reembolso confirmado." : "Confirmação do reembolso ainda pendente."}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Nenhum valor precisava ser reembolsado. O pedido permanece apenas no histórico da sua conta.
          </p>
        )}
        <Link href="/minhas-compras" className="mt-auto pt-6 text-sm font-semibold text-blue-600 hover:underline">
          Ver todas as minhas compras
        </Link>
      </aside>
    </section>
  );
}
