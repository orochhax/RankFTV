"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashWaitlistInvite } from "@/lib/waitlist";

export async function aceitarConviteListaEspera(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (token.length < 32 || token.length > 100) return;
  const admin = createAdminClient();
  const { data: entry } = await admin.from("championship_category_waitlist").select("id, championship_id, category_id, invite_expires_at").eq("invite_token_hash", hashWaitlistInvite(token)).eq("status", "invited").maybeSingle();
  if (!entry?.invite_expires_at || new Date(entry.invite_expires_at) <= new Date()) return;
  redirect(`/campeonatos/${entry.championship_id}/comprar?categoria=${entry.category_id}&convite=${encodeURIComponent(token)}`);
}
