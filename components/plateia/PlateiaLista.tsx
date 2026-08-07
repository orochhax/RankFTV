import { CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/format";

export type PlateiaItem = {
  id: string;
  comprador_nome: string;
  comprador_email: string;
  tipo_nome: string | null;
  valor: number;
  quantidade: number | null;
  status_pagamento: string;
  checked_in: boolean;
  code: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pago: { label: "Pago", cls: "bg-blue-100 text-blue-700" },
  pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
  estornado: { label: "Estornado", cls: "bg-red-100 text-red-600" },
  expirado: { label: "Expirado", cls: "bg-gray-100 text-gray-600" },
};

export function PlateiaLista({ itens }: { itens: PlateiaItem[] }) {
  if (itens.length === 0) {
    return <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">Nenhum ingresso encontrado.</p>;
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
      {itens.map((item) => {
        const status = STATUS[item.status_pagamento] ?? { label: item.status_pagamento, cls: "bg-gray-100 text-gray-500" };
        return (
          <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-medium text-gray-900">
                {item.comprador_nome}
                {item.checked_in && <CheckCircle2 className="size-3.5 shrink-0 text-blue-500" />}
              </p>
              <p className="truncate text-xs text-gray-400">
                {item.comprador_email}
                {item.tipo_nome && ` - ${item.tipo_nome}`}
                {Number(item.quantidade) > 1 && ` - ${item.quantidade} ingressos`}
                {item.code && ` - ${item.code}`}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-gray-700">{formatBRL(Number(item.valor))}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${status.cls}`}>{status.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
