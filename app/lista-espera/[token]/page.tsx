import { notFound } from "next/navigation";
import { Clock3, TicketCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashWaitlistInvite } from "@/lib/waitlist";
import { aceitarConviteListaEspera } from "./actions";

export default async function WaitlistInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 32 || token.length > 100) notFound();
  const { data: entry } = await createAdminClient().from("championship_category_waitlist").select("championships(nome), championship_categories(nome), invite_expires_at, status").eq("invite_token_hash", hashWaitlistInvite(token)).maybeSingle();
  if (!entry || entry.status !== "invited" || !entry.invite_expires_at || new Date(entry.invite_expires_at) <= new Date()) notFound();
  const championship = entry.championships as unknown as { nome: string } | null;
  const category = entry.championship_categories as unknown as { nome: string } | null;
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12"><section className="w-full rounded-3xl bg-white p-7 text-center shadow-soft ring-1 ring-black/5"><TicketCheck className="mx-auto size-10 text-blue-600" /><h1 className="mt-4 text-xl font-bold text-gray-900">Uma vaga ficou disponível</h1><p className="mt-2 text-sm text-gray-600">{championship?.nome ?? "Campeonato"} · {category?.nome ?? "Categoria"}</p><p className="mt-3 flex items-center justify-center gap-1 text-xs text-amber-700"><Clock3 className="size-3" />Convite válido até {new Date(entry.invite_expires_at).toLocaleString("pt-BR")}</p><form action={aceitarConviteListaEspera} className="mt-5"><input type="hidden" name="token" value={token} /><button className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Continuar inscrição</button></form></section></main>;
}
