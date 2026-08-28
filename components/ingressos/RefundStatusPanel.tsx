type RefundStatusPanelProps = {
  billingType: string | null;
  requestedAt: string | null;
};

function formatDateTime(date: string | null) {
  if (!date) return "Data da solicitação em confirmação";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bahia",
  }).format(new Date(date));
}

export function RefundStatusPanel({ billingType, requestedAt }: RefundStatusPanelProps) {
  const isCard = billingType === "CREDIT_CARD" || billingType === "DEBIT_CARD";
  const paymentMethod = isCard ? "cartão" : billingType === "PIX" ? "Pix" : "forma de pagamento usada";

  return (
    <section className="space-y-4" aria-label="Acompanhamento do estorno">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-center text-lg font-semibold text-amber-950">Estorno solicitado</h2>
        <p className="mt-2 text-center text-sm text-amber-900">
          Sua solicitação foi registrada. Você não precisa fazer nada nem repetir a solicitação.
        </p>

        <ol className="mt-5 space-y-4 border-l-2 border-amber-300 pl-5 text-left">
          <li className="relative">
            <span className="absolute -left-[1.86rem] top-1.5 size-3 rounded-full border-2 border-amber-50 bg-amber-600" />
            <p className="text-sm font-semibold text-amber-950">Estorno solicitado</p>
            <p className="mt-0.5 text-sm text-amber-900">{formatDateTime(requestedAt)}</p>
          </li>
          <li className="relative">
            <span className="absolute -left-[1.86rem] top-1.5 size-3 rounded-full border-2 border-amber-50 bg-amber-300" />
            <p className="text-sm font-semibold text-amber-950">Aguardando confirmação do Asaas</p>
            <p className="mt-0.5 text-sm text-amber-900">
              Quando o estorno for confirmado, este ingresso será cancelado e a vaga será liberada.
            </p>
          </li>
        </ol>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Prazos do estorno</h3>
        <p className="mt-1 text-sm text-slate-600">
          Forma de pagamento deste ingresso: <strong>{paymentMethod}</strong>.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li>
            <strong>Pix:</strong> após a confirmação do Asaas, a devolução é processada para a conta usada no pagamento. O prazo pode variar conforme a instituição financeira.
          </li>
          <li>
            <strong>Cartão:</strong> após a confirmação, o cancelamento pode levar até 10 dias úteis para aparecer na fatura.
          </li>
        </ul>
      </aside>
    </section>
  );
}
