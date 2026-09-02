import "server-only";

import { cookies } from "next/headers";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";

export const ATHLETE_CREDENTIAL_SESSION_MAX_AGE = 2 * 60 * 60;

export function athleteCredentialCookieName(credentialId: string): string {
  return `rankftv_cred_${credentialId.replaceAll("-", "")}`;
}

export async function readAthleteCredentialSession(credentialId: string): Promise<string | null> {
  const cookieStore = await cookies();
  return normalizarTicketAccessToken(
    cookieStore.get(athleteCredentialCookieName(credentialId))?.value,
  );
}
