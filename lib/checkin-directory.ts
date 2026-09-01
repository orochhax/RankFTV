import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CheckinDirectoryMember = {
  name: string;
  username: string;
  checkedIn: boolean;
  checkinAt: string | null;
  scannerName: string | null;
};

export type CheckinDirectoryItem = {
  id: string;
  kind: "athlete" | "pair";
  members: CheckinDirectoryMember[];
};

type CredentialRow = {
  id: string;
  user_id: string;
  checked_in: boolean;
  checkin_at: string | null;
  checked_in_by: string | null;
};

type TicketRow = {
  id: string;
  comprador_nome: string;
  parceiro_nome: string | null;
  checked_in: boolean;
  checkin_at: string | null;
};

type TicketCredentialRow = {
  id: string;
  athlete_ticket_id: string;
  athlete_slot: number;
  display_name_snapshot: string;
  checked_in: boolean;
  checkin_at: string | null;
  checked_in_by: string | null;
};

type ProfileRow = {
  id: string;
  nome: string;
  username: string | null;
};

const DIRECTORY_LIMIT = 2000;

export async function getCheckinDirectory(
  championshipId: string,
  viewerId: string,
): Promise<CheckinDirectoryItem[] | null> {
  const admin = createAdminClient();
  const [{ data: championship }, { data: staff }] = await Promise.all([
    admin
      .from("championships")
      .select("organizador_id")
      .eq("id", championshipId)
      .maybeSingle(),
    admin
      .from("championship_staff")
      .select("can_qrcode")
      .eq("championship_id", championshipId)
      .eq("user_id", viewerId)
      .eq("status", "aceito")
      .maybeSingle(),
  ]);

  const authorized = championship?.organizador_id === viewerId || staff?.can_qrcode === true;
  if (!authorized) return null;

  const [credentialResult, ticketResult, ticketCredentialResult] = await Promise.all([
    admin
      .from("credentials")
      .select("id, user_id, checked_in, checkin_at, checked_in_by")
      .eq("championship_id", championshipId)
      .limit(DIRECTORY_LIMIT),
    admin
      .from("athlete_tickets")
      .select("id, comprador_nome, parceiro_nome, checked_in, checkin_at")
      .eq("championship_id", championshipId)
      .eq("status_pagamento", "pago")
      .limit(DIRECTORY_LIMIT),
    admin
      .from("athlete_ticket_credentials")
      .select("id, athlete_ticket_id, athlete_slot, display_name_snapshot, checked_in, checkin_at, checked_in_by")
      .eq("championship_id", championshipId)
      .order("athlete_slot")
      .limit(DIRECTORY_LIMIT * 2),
  ]);

  const credentials = (credentialResult.data ?? []) as CredentialRow[];
  const tickets = (ticketResult.data ?? []) as TicketRow[];
  // Enquanto a migration ainda não foi aplicada, a consulta retorna erro e o
  // painel conserva o comportamento legado sem derrubar a página.
  const ticketCredentials = ticketCredentialResult.error
    ? []
    : (ticketCredentialResult.data ?? []) as TicketCredentialRow[];
  const profileIds = [
    ...new Set([
      ...credentials.flatMap((credential) => [
        credential.user_id,
        ...(credential.checked_in_by ? [credential.checked_in_by] : []),
      ]),
      ...ticketCredentials.flatMap((credential) =>
        credential.checked_in_by ? [credential.checked_in_by] : [],
      ),
    ]),
  ];

  let profiles: ProfileRow[] = [];
  if (profileIds.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select("id, nome, username")
      .in("id", profileIds)
      .limit(DIRECTORY_LIMIT);
    profiles = (data ?? []) as ProfileRow[];
  }
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const credentialItems: CheckinDirectoryItem[] = credentials.map((credential) => ({
    id: `credential:${credential.id}`,
    kind: "athlete",
    members: [{
      name: profileMap.get(credential.user_id)?.nome ?? "Atleta",
      username: profileMap.get(credential.user_id)?.username ?? "",
      checkedIn: credential.checked_in,
      checkinAt: credential.checkin_at,
      scannerName: credential.checked_in_by
        ? profileMap.get(credential.checked_in_by)?.nome ?? null
        : null,
    }],
  }));

  const credentialsByTicket = new Map<string, TicketCredentialRow[]>();
  for (const credential of ticketCredentials) {
    const current = credentialsByTicket.get(credential.athlete_ticket_id) ?? [];
    current.push(credential);
    credentialsByTicket.set(credential.athlete_ticket_id, current);
  }

  const ticketItems: CheckinDirectoryItem[] = tickets.map((ticket) => {
    const individualCredentials = credentialsByTicket.get(ticket.id)?.sort(
      (a, b) => a.athlete_slot - b.athlete_slot,
    );
    const members: CheckinDirectoryMember[] = individualCredentials?.length
      ? individualCredentials.map((credential) => ({
          name: credential.display_name_snapshot,
          username: "",
          checkedIn: credential.checked_in,
          checkinAt: credential.checkin_at,
          scannerName: credential.checked_in_by
            ? profileMap.get(credential.checked_in_by)?.nome ?? null
            : null,
        }))
      : [ticket.comprador_nome, ticket.parceiro_nome]
          .filter((name): name is string => Boolean(name?.trim()))
          .map((name) => ({
            name,
            username: "",
            checkedIn: ticket.checked_in,
            checkinAt: ticket.checkin_at,
            scannerName: null,
          }));

    return {
      id: `ticket:${ticket.id}`,
      kind: "pair",
      members,
    };
  });

  return [...credentialItems, ...ticketItems].sort((a, b) =>
    (a.members[0]?.name ?? "").localeCompare(b.members[0]?.name ?? "", "pt-BR"),
  );
}
