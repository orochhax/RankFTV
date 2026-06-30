import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiariaPaymentUI } from "./DiariaPaymentUI";

export default async function PagarDiariaPage({
  params,
  searchParams,
}: {
  params:       Promise<{ handle: string }>;
  searchParams: Promise<{ planId?: string }>;
}) {
  const { handle } = await params;
  const { planId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arenas/${handle}/diaria`);

  const [arenaRes, planRes, privRes] = await Promise.all([
    supabase.from("arenas").select("id, nome").eq("handle", handle).maybeSingle(),
    planId
      ? supabase.from("arena_plans")
          .select("id, arena_id, nome, valor, tipo, ativo, aceita_credito, aceita_debito")
          .eq("id", planId)
          .eq("tipo", "diaria")
          .eq("ativo", true)
          .maybeSingle()
      : (async () => {
          const arenaRow = await supabase.from("arenas").select("id").eq("handle", handle).maybeSingle();
          if (!arenaRow.data) return { data: null };
          return supabase.from("arena_plans")
            .select("id, arena_id, nome, valor, tipo, ativo, aceita_credito, aceita_debito")
            .eq("arena_id", arenaRow.data.id)
            .eq("tipo", "diaria")
            .eq("ativo", true)
            .maybeSingle();
        })(),
    supabase.from("profiles_private").select("cpf").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!arenaRes.data) notFound();
  if (!planRes.data) notFound();
  if (planRes.data.arena_id !== arenaRes.data.id) notFound();

  const plan = planRes.data;

  return (
    <DiariaPaymentUI
      planId={plan.id}
      handle={handle}
      planNome={plan.nome}
      valorBase={Number(plan.valor)}
      aceitaCredito={plan.aceita_credito ?? true}
      aceitaDebito={plan.aceita_debito ?? false}
      cpfSalvo={privRes.data?.cpf ?? null}
    />
  );
}
