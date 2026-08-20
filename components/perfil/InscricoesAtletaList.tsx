import Link from "next/link";
import { CalendarDays, MapPin, Shirt, Tag } from "lucide-react";
import { InscricaoMenu } from "@/components/inscricoes/InscricaoMenu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRangeBR, generoLabel } from "@/lib/format";
import type { CompraInscricaoRow } from "@/lib/minhas-compras";
import type { ChampionshipStatus } from "@/lib/types";

const TEAM_STATUS: Record<string, { label: string; className: string }> = {
  convite_pendente: {
    label: "Aguardando parceiro",
    className: "bg-amber-100 text-amber-700",
  },
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    className: "bg-amber-100 text-amber-700",
  },
  confirmado: {
    label: "Dupla confirmada",
    className: "bg-blue-100 text-blue-700",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-100 text-red-600",
  },
};

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  pendente: {
    label: "Aguardando pagamento",
    className: "bg-amber-100 text-amber-700",
  },
  pago: { label: "Pago", className: "bg-blue-100 text-blue-700" },
  estornado: { label: "Estornado", className: "bg-red-100 text-red-600" },
};

export function InscricoesAtletaList({
  teams,
  userId,
  semTamanho,
}: {
  teams: CompraInscricaoRow[];
  userId: string;
  semTamanho: boolean;
}) {
  return (
    <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      {teams.map((team) => {
        const championship = team.championships;
        if (!championship) return null;

        const category = team.championship_categories;
        const registration = team.registrations?.[0];
        const teamStatus = TEAM_STATUS[team.status] ?? {
          label: team.status,
          className: "bg-gray-100 text-gray-500",
        };
        const paymentStatus = registration
          ? PAYMENT_STATUS[registration.status_pagamento]
          : null;
        const uniformePendente =
          semTamanho && team.status === "confirmado" && team.atleta1_id !== userId;

        return (
          <li
            key={team.id}
            className="flex items-center gap-2 px-4 py-4 transition-colors hover:bg-gray-50"
          >
            <Link
              href={`/minhas-inscricoes/${championship.id}`}
              className="min-w-0 flex-1 space-y-1.5"
            >
              <p className="truncate font-semibold text-gray-900">{championship.nome}</p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {formatDateRangeBR(championship.data_inicio, championship.data_fim)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {championship.cidade} — {championship.estado}
                </span>
                {category && (
                  <span className="flex items-center gap-1">
                    <Tag className="size-3" />
                    {category.nome} · {generoLabel(category.genero as "masculino" | "feminino" | "mista")}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <StatusBadge status={championship.status as ChampionshipStatus} />
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${teamStatus.className}`}
                >
                  {teamStatus.label}
                </span>
                {paymentStatus && (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatus.className}`}
                  >
                    {paymentStatus.label}
                  </span>
                )}
                {uniformePendente && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    <Shirt className="size-3" /> Escolher tamanho do uniforme
                  </span>
                )}
              </div>
            </Link>

            <InscricaoMenu
              teamId={team.id}
              champId={championship.id}
              regId={registration?.id}
              teamStatus={team.status}
              pagStatus={registration?.status_pagamento}
            />
          </li>
        );
      })}
    </ol>
  );
}
