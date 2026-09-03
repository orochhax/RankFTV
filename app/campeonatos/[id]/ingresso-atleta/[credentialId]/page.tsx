import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import QRCode from "qrcode";
import { IngressoAtletaCredencial } from "@/components/campeonatos/IngressoAtletaCredencial";
import { PageContainer } from "@/components/shell/PageContainer";
import { athleteDisplayName } from "@/lib/athlete-display-name";
import { readAthleteCredentialSession } from "@/lib/athlete-credential-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Minha credencial | RankFTV",
  robots: { index: false, follow: false },
};

function dataBR(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function CredencialIndividualPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; credentialId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id: championshipId, credentialId } = await params;
  const { token } = await searchParams;
  const urlAccessToken = normalizarTicketAccessToken(token);
  if (urlAccessToken) {
    redirect(
      `/campeonatos/${championshipId}/ingresso-atleta/${credentialId}/acessar?token=${encodeURIComponent(urlAccessToken)}`,
    );
  }
  const accessToken = await readAthleteCredentialSession(credentialId);
  if (!accessToken) notFound();

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("athlete_ticket_credentials")
    .select("id, athlete_ticket_id, athlete_slot, display_name_snapshot, qr_token, code, checked_in, access_token")
    .eq("id", credentialId)
    .eq("championship_id", championshipId)
    .eq("access_token", accessToken)
    .maybeSingle();
  if (!credential) notFound();

  const [{ data: ticket }, { data: championship }] = await Promise.all([
    admin
      .from("athlete_tickets")
      .select("id, championship_id, categoria_nome, comprador_nome, parceiro_nome, status_pagamento")
      .eq("id", credential.athlete_ticket_id)
      .maybeSingle(),
    admin
      .from("championships")
      .select("nome, data_inicio, data_fim, cidade, estado, local")
      .eq("id", championshipId)
      .maybeSingle(),
  ]);
  if (!ticket || ticket.championship_id !== championshipId || !championship) notFound();

  const athleteName = athleteDisplayName(credential.display_name_snapshot);
  const partnerName = athleteDisplayName(
    credential.athlete_slot === 1 ? ticket.parceiro_nome : ticket.comprador_nome,
  );
  const qrDataUrl = ticket.status_pagamento === "pago"
    ? await QRCode.toDataURL(credential.qr_token, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
    : null;
  const { data: credentialEvents } = await admin
    .from("athlete_ticket_credential_events")
    .select("id, event_type, created_at")
    .eq("credential_id", credential.id)
    .in("event_type", ["issued", "rotated", "viewed", "email_sent", "invalidated", "self_invalidated", "checked_in"])
    .order("created_at", { ascending: false })
    .limit(30);
  const eventLabels: Record<string, string> = {
    issued: "Credencial emitida",
    rotated: "Link, QR e código substituídos",
    viewed: "Credencial acessada",
    email_sent: "Credencial enviada por e-mail",
    invalidated: "Credencial anterior invalidada",
    self_invalidated: "Substituição solicitada pelo titular",
    checked_in: "Check-in realizado",
  };

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="bg-black pb-16 pt-6">
        <PageContainer width="wide" className="space-y-5">
          <Link
            href={`/campeonatos/${championshipId}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            <ArrowLeft className="size-4" /> Voltar ao campeonato
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">Credencial individual de atleta</p>
            <h1 className="mt-1 text-xl font-bold text-white">{championship.nome}</h1>
            {ticket.categoria_nome && <p className="text-sm text-white/50">Categoria {ticket.categoria_nome}</p>}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Users className="size-4 text-blue-400" />
            <span className="font-medium text-white">{athleteName}</span>
            <span className="text-white/30">· dupla de</span>
            <span>{partnerName}</span>
          </div>
        </PageContainer>
      </div>

      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:shadow-none">
        <PageContainer width="wide" className="space-y-6">
          <IngressoAtletaCredencial
            credentialId={credential.id}
            athleteName={athleteName}
            initialPaymentStatus={ticket.status_pagamento}
            initialCheckedIn={credential.checked_in}
            qrDataUrl={qrDataUrl}
            code={credential.code}
            championshipId={championshipId}
            championshipName={championship.nome}
            categoryName={ticket.categoria_nome}
          />

          {(credentialEvents ?? []).length > 0 && (
            <details className="mx-auto max-w-3xl rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900">Histórico desta credencial</summary>
              <p className="mt-1 text-xs text-gray-500">Nenhum token, QR ou e-mail é exibido neste histórico.</p>
              <ol className="mt-4 divide-y divide-gray-100">
                {(credentialEvents ?? []).map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-sm text-gray-700">{eventLabels[event.event_type] ?? event.event_type}</span>
                    <time dateTime={event.created_at} className="shrink-0 text-xs text-gray-400">
                      {new Date(event.created_at).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
                    </time>
                  </li>
                ))}
              </ol>
            </details>
          )}

          <div className="mx-auto max-w-3xl space-y-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sobre o campeonato</p>
            <p className="font-semibold text-gray-900">{championship.nome}</p>
            {championship.data_inicio && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays className="size-4 shrink-0 text-gray-400" />
                {dataBR(championship.data_inicio)}
                {championship.data_fim && championship.data_fim !== championship.data_inicio
                  ? ` a ${dataBR(championship.data_fim)}`
                  : ""}
              </p>
            )}
            {(championship.local || championship.cidade) && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="size-4 shrink-0 text-gray-400" />
                {[championship.local, championship.cidade && `${championship.cidade}/${championship.estado}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
