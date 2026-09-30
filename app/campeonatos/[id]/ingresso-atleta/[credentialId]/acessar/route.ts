import { NextRequest, NextResponse } from "next/server";
import {
  ATHLETE_CREDENTIAL_SESSION_MAX_AGE,
  athleteCredentialCookieName,
} from "@/lib/athlete-credential-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";

const PRIVATE_HEADERS = { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" };

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; credentialId: string }> },
) {
  const { id: championshipId, credentialId } = await context.params;
  const accessToken = normalizarTicketAccessToken(request.nextUrl.searchParams.get("token"));
  const cleanUrl = new URL(
    `/campeonatos/${championshipId}/ingresso-atleta/${credentialId}`,
    request.url,
  );
  if (!accessToken) return NextResponse.redirect(new URL("/meus-ingressos", request.url), 303);

  const admin = createAdminClient();
  const { data: credential } = await admin
    .from("athlete_ticket_credentials")
    .select("id, athlete_ticket_id")
    .eq("id", credentialId)
    .eq("championship_id", championshipId)
    .eq("access_token", accessToken)
    .maybeSingle();
  if (!credential) return NextResponse.redirect(new URL("/meus-ingressos", request.url), 303);

  await admin.from("athlete_ticket_credential_events").insert({
    credential_id: credentialId,
    athlete_ticket_id: credential.athlete_ticket_id,
    championship_id: championshipId,
    event_type: "viewed",
  });

  const response = NextResponse.redirect(cleanUrl, 303);
  response.headers.set("Cache-Control", PRIVATE_HEADERS["Cache-Control"]);
  response.headers.set("Referrer-Policy", PRIVATE_HEADERS["Referrer-Policy"]);
  response.cookies.set(athleteCredentialCookieName(credentialId), accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ATHLETE_CREDENTIAL_SESSION_MAX_AGE,
    path: "/",
    priority: "high",
  });
  return response;
}
