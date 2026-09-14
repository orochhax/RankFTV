import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { formatBRL } from "@/lib/format";

type CheckoutStep = "dados" | "revisao";

type CompletedStepsProps = {
  categoryGender: string;
  categoryName: string;
  buyerEmail: string;
  buyerName: string;
  onChangeCategory: () => void;
  onEditParticipants: () => void;
  partnerEmail: string;
  partnerName: string;
  step: CheckoutStep;
};

function genderLabel(gender: string) {
  if (gender === "mista") return "Dupla mista";
  return gender === "feminino" ? "Dupla feminina" : "Dupla masculina";
}

function CompletedCard({
  action,
  actionLabel,
  children,
  label,
}: {
  action: () => void;
  actionLabel: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" aria-label={label}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">{children}</div>
        </div>
        <button
          type="button"
          onClick={action}
          className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

export function AthleteCheckoutCompletedSteps(props: CompletedStepsProps) {
  return (
    <div className="space-y-3">
      <CompletedCard action={props.onChangeCategory} actionLabel="Trocar" label="Categoria concluída">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Categoria escolhida</p>
        <p className="mt-0.5 truncate font-semibold text-gray-950">{props.categoryName}</p>
        <p className="text-xs text-gray-600">{genderLabel(props.categoryGender)}</p>
      </CompletedCard>

      {props.step === "revisao" ? (
        <CompletedCard action={props.onEditParticipants} actionLabel="Editar" label="Participantes concluídos">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Participantes</p>
          <p className="mt-0.5 truncate font-semibold text-gray-950">{props.buyerName} + {props.partnerName}</p>
          <p className="truncate text-xs text-gray-600">{props.buyerEmail}</p>
          <p className="truncate text-xs text-gray-600">{props.partnerEmail}</p>
        </CompletedCard>
      ) : null}
    </div>
  );
}

export function AthleteCheckoutFooterSummary({
  basePrice,
  categoryName,
  couponCode,
  discount,
  paymentMethod,
  serviceFee,
  total,
}: {
  basePrice: number;
  categoryName: string;
  couponCode?: string;
  discount: number;
  paymentMethod: "pix" | "cartao";
  serviceFee: number;
  total: number;
}) {
  return (
    <aside
      aria-label="Resumo da compra"
      className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20"
    >
      <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600">
          <div>
            <p className="text-xs font-medium text-gray-500">2 atletas · {paymentMethod === "pix" ? "Pix" : "Cartão"}</p>
            <p className="font-bold text-gray-950">Total {formatBRL(total)}</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-blue-700">
            Ver resumo
            <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="space-y-2 border-t border-gray-100 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4 text-gray-600"><span>Categoria</span><span className="truncate font-medium text-gray-900">{categoryName}</span></div>
          <div className="flex justify-between gap-4 text-gray-600"><span>Inscrição</span><span>{formatBRL(basePrice)}</span></div>
          {couponCode ? (
            <div className="flex justify-between gap-4 text-blue-700"><span>Cupom {couponCode}</span><span>- {formatBRL(discount)}</span></div>
          ) : null}
          <div className="flex justify-between gap-4 text-gray-600"><span>Taxa de serviço</span><span>+ {formatBRL(serviceFee)}</span></div>
          <div className="flex justify-between gap-4 border-t border-gray-100 pt-2 font-bold text-gray-950"><span>Total</span><span>{formatBRL(total)}</span></div>
        </div>
      </details>
    </aside>
  );
}
