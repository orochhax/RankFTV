import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CheckinDirectoryItem = {
  id: string;
  nome: string;
  username: string;
  checked_in: boolean;
  checkin_at: string | null;
  scannerNome: string | null;
  kind: "athlete" | "pair";
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

  const [{ data: rawCredentials }, { data: rawTickets }] = await Promise.all([
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
  ]);

  const credentials = (rawCredentials ?? []) as CredentialRow[];
  const tickets = (rawTickets ?? []) as TicketRow[];
  const profileIds = [
    ...new Set(
      credentials.flatMap((credential) => [
        credential.user_id,
        ...(credential.checked_in_by ? [credential.checked_in_by] : []),
      ]),
    ),
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
    nome: profileMap.get(credential.user_id)?.nome ?? "Atleta",
    username: profileMap.get(credential.user_id)?.username ?? "",
    checked_in: credential.checked_in,
    checkin_at: credential.checkin_at,
    scannerNome: credential.checked_in_by
      ? profileMap.get(credential.checked_in_by)?.nome ?? null
      : null,
    kind: "athlete",
  }));

  const ticketItems: CheckinDirectoryItem[] = tickets.map((ticket) => ({
    id: `ticket:${ticket.id}`,
    nome: [ticket.comprador_nome, ticket.parceiro_nome]
      .map((name) => name?.trim())
      .filter(Boolean)
      .join(" + "),
    username: "",
    checked_in: ticket.checked_in,
    checkin_at: ticket.checkin_at,
    scannerNome: null,
    kind: "pair",
  }));

  return [...credentialItems, ...ticketItems].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
