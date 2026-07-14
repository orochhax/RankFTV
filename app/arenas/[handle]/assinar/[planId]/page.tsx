import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubscriptionPaymentUI } from "./SubscriptionPaymentUI";

export default async function AssinarPlanoPage({
  params,
}: {
  params: Promise<{ handle: string; planId: string }>;
}) {
  const { handle, planId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arenas/${handle}/assinar/${planId}`);

  const [arenaRes, planRes, privRes, profileRes] = await Promise.all([
    supabase.from("arenas").select("id, nome").eq("handle", handle).maybeSingle(),
    supabase.from("arena_plans")
      .select("id, arena_id, nome, valor, dia_vencimento, tipo, ativo, aceita_credito")
      .eq("id", planId)
      .eq("tipo", "mensalidade")
      .eq("ativo", true)
      .maybeSingle(),
    supabase.from("profiles_private").select("cpf, data_nascimento").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("nome, genero").eq("id", user.id).maybeSingle(),
  ]);

  if (!arenaRes.data) notFound();
  if (!planRes.data) notFound();
  if (planRes.data.arena_id !== arenaRes.data.id) notFound();

  return (
    <SubscriptionPaymentUI
      planId={planId}
      handle={handle}
      planNome={planRes.data.nome}
      valorBase={Number(planRes.data.valor)}
      cpfSalvo={privRes.data?.cpf ?? null}
      nomeSalvo={profileRes.data?.nome ?? ""}
      dataNascimentoSalva={privRes.data?.data_nascimento ?? null}
      generoSalvo={profileRes.data?.genero ?? null}
    />
  );
}
