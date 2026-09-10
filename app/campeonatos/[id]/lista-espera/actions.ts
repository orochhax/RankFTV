"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizeWaitlistEmail, validWaitlistEmail } from "@/lib/waitlist";
import { championshipWaitlistSchema } from "@/lib/ticket-action-schemas";

export async function entrarNaListaEspera(input: {
  championshipId: string;
  categoryId: string;
  email: string;
  consent: boolean;
}): Promise<{ ok: boolean; position?: number; error?: string }> {
  const parsed = championshipWaitlistSchema.safeParse({
    ...input,
    email: normalizeWaitlistEmail(input.email),
  });
  if (!parsed.success) return { ok: false, error: "Dados da lista de espera inválidos." };
  input = parsed.data;

  if (!input.consent) return { ok: false, error: "Confirme que aceita receber o convite por e-mail." };
  const email = normalizeWaitlistEmail(input.email);
  if (!validWaitlistEmail(email)) return { ok: false, error: "Informe um e-mail válido." };
  const requestHeaders = await headers();
  if (!(await checkRateLimit(`waitlist:${getClientIp(requestHeaders)}:${email}`, 5, 3600))) {
    return { ok: false, error: "Muitas tentativas. Aguarde antes de tentar novamente." };
  }
  const admin = createAdminClient();
  const { data: category } = await admin
    .from("championship_categories")
    .select("id, championship_id")
    .eq("id", input.categoryId)
    .eq("championship_id", input.championshipId)
    .maybeSingle();
  if (!category) return { ok: false, error: "Categoria não encontrada." };
  const { data: championship } = await admin.from("championships").select("status").eq("id", input.championshipId).maybeSingle();
  if (!championship || !["inscricoes_abertas", "em_andamento"].includes(championship.status)) {
    return { ok: false, error: "As inscrições não estão abertas." };
  }
  const { data: waitingEntry, error } = await admin.from("championship_category_waitlist").upsert({
    championship_id: input.championshipId,
    category_id: input.categoryId,
    email,
    consented_at: new Date().toISOString(),
    status: "waiting",
    invite_token_hash: null,
    invite_expires_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "category_id,email" }).select("id, created_at").single();
  if (error || !waitingEntry) return { ok: false, error: "Não foi possível entrar na lista agora." };
  const { count } = await admin
    .from("championship_category_waitlist")
    .select("id", { count: "exact", head: true })
    .eq("category_id", input.categoryId)
    .eq("status", "waiting")
    .lte("created_at", waitingEntry.created_at);
  return { ok: true, position: count ?? 1 };
}
