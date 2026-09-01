import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShoppingBag, Ticket, Users } from "lucide-react";
import { VincularComprasForm } from "@/app/meus-ingressos/VincularComprasForm";
import type { Ingresso } from "@/components/ingressos/IngressoCard";
import { InscricoesAtletaList } from "@/components/perfil/InscricoesAtletaList";
import { MinhasComprasClient } from "@/components/perfil/MinhasComprasClient";
import { MinhasComprasTabs } from "@/components/perfil/MinhasComprasTabs";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { resolveComprasTab, type CompraInscricaoRow } from "@/lib/minhas-compras";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type TicketRow = {
  id: string;
  championship_id: string;
  championships: unknown;
  [key: string]: unknown;
};

function championshipName(row: TicketRow): string {
  return (row.championships as { nome?: string } | null)?.nome ?? "Campeonato";
}

export default async function MinhasComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; cancelamento?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [{ data: athleteBuyer }, { data: athletePartner }, { data: spectator }, teamsResult, profileResult] =
    await Promise.all([
      admin
        .from("athlete_tickets")
        .select(
          "id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("athlete_tickets")
        .select(
          "id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)",
        )
        .eq("parceiro_user_id", user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("spectator_tickets")
        .select(
          "id, championship_id, tipo_nome, comprador_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("teams")
        .select(`
          id, status, championship_id, category_id, atleta1_id,
          championships(id, nome, data_inicio, data_fim, cidade, estado, status),
          championship_categories(nome, genero, valor_inscricao),
          registrations(id, status_pagamento)
        `)
        .or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("tamanho_camisa").eq("id", user.id).maybeSingle(),
    ]);

  type IndividualCredentialRow = {
    id: string;
    athlete_ticket_id: string;
    athlete_slot: number;
    display_name_snapshot: string;
    access_token: string;
    code: string;
    checked_in: boolean;
  };
  const athleteTicketIdsForCredentials = [
    ...(athleteBuyer ?? []).map((row) => row.id),
    ...(athletePartner ?? []).map((row) => row.id),
  ];
  const credentialResult = athleteTicketIdsForCredentials.length > 0
    ? await admin
        .from("athlete_ticket_credentials")
        .select("id, athlete_ticket_id, athlete_slot, display_name_snapshot, access_token, code, checked_in")
        .in("athlete_ticket_id", athleteTicketIdsForCredentials)
    : { data: [] as IndividualCredentialRow[], error: null };
  const credentialMap = new Map<string, IndividualCredentialRow>();
  if (!credentialResult.error) {
    for (const credential of (credentialResult.data ?? []) as IndividualCredentialRow[]) {
      credentialMap.set(`${credential.athlete_ticket_id}:${credential.athlete_slot}`, credential);
    }
  }

  const athleteTickets: Ingresso[] = [
    ...(athleteBuyer ?? []).map((row) => {
      const credential = credentialMap.get(`${row.id}:1`);
      return {
        tipo: "atleta" as const,
        ticket_id: row.id,
        championship_id: row.championship_id,
        campeonato_nome: championshipName(row as TicketRow),
        categoria_nome: row.categoria_nome ?? null,
        tipo_nome: null,
        comprador_nome: row.comprador_nome,
        parceiro_nome: row.parceiro_nome ?? null,
        valor: Number(row.valor),
        status_pagamento: row.status_pagamento,
        code: credential?.code ?? row.code ?? null,
        access_token: row.access_token ?? null,
        checked_in: credential?.checked_in ?? row.checked_in,
        athlete_name: credential?.display_name_snapshot ?? row.comprador_nome,
        id: row.id,
      };
    }),
    ...(athletePartner ?? []).map((row) => {
      const credential = credentialMap.get(`${row.id}:2`);
      return {
        tipo: "atleta" as const,
        ticket_id: row.id,
        championship_id: row.championship_id,
        campeonato_nome: championshipName(row as TicketRow),
        categoria_nome: row.categoria_nome ?? null,
        tipo_nome: null,
        comprador_nome: row.comprador_nome,
        parceiro_nome: row.parceiro_nome ?? null,
        valor: Number(row.valor),
        status_pagamento: row.status_pagamento,
        code: credential?.code ?? row.code ?? null,
        access_token: null,
        credential_id: credential?.id ?? null,
        credential_access_token: credential?.access_token ?? null,
        checked_in: credential?.checked_in ?? row.checked_in,
        athlete_name: credential?.display_name_snapshot ?? row.parceiro_nome,
        id: row.id,
      };
    }),
  ];

  const seenAthleteTickets = new Set<string>();
  const uniqueAthleteTickets = athleteTickets.filter((ticket) => {
    if (seenAthleteTickets.has(ticket.ticket_id)) return false;
    seenAthleteTickets.add(ticket.ticket_id);
    return true;
  });

  const spectatorTickets: Ingresso[] = (spectator ?? []).map((row) => ({
    tipo: "plateia" as const,
    ticket_id: row.id,
    championship_id: row.championship_id,
    campeonato_nome: championshipName(row as TicketRow),
    categoria_nome: null,
    tipo_nome: row.tipo_nome ?? null,
    comprador_nome: row.comprador_nome,
    parceiro_nome: null,
    valor: Number(row.valor),
    status_pagamento: row.status_pagamento,
    code: row.code ?? null,
    access_token: row.access_token ?? null,
    checked_in: row.checked_in,
    id: row.id,
  }));

  const athleteTicketIds = uniqueAthleteTickets.map((ticket) => ticket.ticket_id);
  const spectatorTicketIds = spectatorTickets.map((ticket) => ticket.ticket_id);
  const allTicketIds = [...athleteTicketIds, ...spectatorTicketIds];
  const { data: refundOperations } = allTicketIds.length > 0
    ? await admin
        .from("financial_operations")
        .select("flow, record_id, status")
        .eq("operation_type", "refund")
        .in("record_id", allTicketIds)
    : { data: [] as { flow: string; record_id: string; status: string }[] };
  const refundStatusByTicket = new Map(
    (refundOperations ?? []).map((operation) => [`${operation.flow}:${operation.record_id}`, operation.status]),
  );
  const athleteTicketsWithRefundStatus = uniqueAthleteTickets.map((ticket) => ({
    ...ticket,
    refund_status: refundStatusByTicket.get(`athlete_ticket:${ticket.ticket_id}`) ?? null,
  }));
  const spectatorTicketsWithRefundStatus = spectatorTickets.map((ticket) => ({
    ...ticket,
    refund_status: refundStatusByTicket.get(`spectator_ticket:${ticket.ticket_id}`) ?? null,
  }));

  const teams = (teamsResult.data ?? []) as unknown as CompraInscricaoRow[];
  const atletaCount = athleteTicketsWithRefundStatus.length + teams.length;
  const plateiaCount = spectatorTicketsWithRefundStatus.length;
  const total = atletaCount + plateiaCount;
  const { aba: requestedTab, cancelamento } = await searchParams;
  const initialTab = resolveComprasTab(requestedTab, atletaCount, plateiaCount);
  const semTamanho = !profileResult.data?.tamanho_camisa;

  const atletaContent = atletaCount === 0 ? (
    <EmptyState
      icon={Users}
      title="Nenhuma compra de atleta"
      description="Quando você comprar um ingresso ou inscrever sua dupla, ele aparecerá aqui."
      actionLabel="Ver campeonatos"
      actionHref="/"
    />
  ) : (
    <div className="space-y-8">
      {teams.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Inscrições da sua conta</h2>
            <p className="text-xs text-gray-400">Duplas, convites, pagamento e reembolso.</p>
          </div>
          <InscricoesAtletaList
            teams={teams}
            userId={user.id}
            semTamanho={semTamanho}
          />
        </section>
      )}

      {athleteTicketsWithRefundStatus.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Ingressos de atleta</h2>
            <p className="text-xs text-gray-400">Compras feitas pelo checkout rápido.</p>
          </div>
          <MinhasComprasClient
            ingressos={athleteTicketsWithRefundStatus}
            showCancelledInitially={cancelamento != null}
          />
        </section>
      )}
    </div>
  );

  const plateiaContent = plateiaCount === 0 ? (
    <EmptyState
      icon={Ticket}
      title="Nenhum ingresso de plateia"
      description="Os ingressos comprados para assistir aos campeonatos aparecerão aqui."
      actionLabel="Ver campeonatos"
      actionHref="/"
    />
  ) : (
    <MinhasComprasClient
      ingressos={spectatorTicketsWithRefundStatus}
      showCancelledInitially={cancelamento != null}
    />
  );

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6 md:hidden">
        <div className="w-full space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            <ArrowLeft className="size-4" /> Início
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Minhas compras</h1>
          </div>
          <p className="text-sm text-white/50">
            {total === 0
              ? "Ingressos e inscrições em um só lugar."
              : `${total} ${total === 1 ? "item" : "itens"} entre atleta e plateia.`}
          </p>
        </div>
      </div>

      <div className="hidden border-b border-border bg-surface md:block">
        <PageContainer width="wide" className="py-8">
          <PageHeader
            eyebrow="Campeonatos"
            title="Minhas compras"
            description={
              total === 0
                ? "Ingressos e inscrições em um só lugar."
                : `${total} ${total === 1 ? "item" : "itens"} entre atleta e plateia.`
            }
          />
        </PageContainer>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:pb-16 md:shadow-none">
        <PageContainer width="wide" className="space-y-8">
          {cancelamento === "cancelado" && (
            <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <strong>Ingresso cancelado com sucesso.</strong> O item continua disponível no histórico de compras.
            </div>
          )}
          {cancelamento === "estorno" && (
            <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <strong>Estorno solicitado com sucesso.</strong> Acompanhe o ingresso em “Mostrar ingressos cancelados ou já usados”; o histórico preserva o status do pedido.
            </div>
          )}
          <MinhasComprasTabs
            initialTab={initialTab}
            atletaCount={atletaCount}
            plateiaCount={plateiaCount}
            atletaContent={atletaContent}
            plateiaContent={plateiaContent}
          />

          <section className="border-t border-gray-200 pt-6">
            <VincularComprasForm />
          </section>
        </PageContainer>
      </div>
    </div>
  );
}
