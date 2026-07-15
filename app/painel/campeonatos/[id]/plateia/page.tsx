import { notFound, redirect } from "next/navigation";
import { Ticket, DollarSign, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { GestaoTiposIngresso } from "@/components/plateia/GestaoTiposIngresso";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { SectionHeader } from "@/components/shell/SectionHeader";

export default async function GestaoEspectadoresPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, organizador_id")
    .eq("id", id)
    .maybeSingle();
  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  const [{ data: tipos }, { data: tickets }] = await Promise.all([
    supabase
      .from("spectator_ticket_types")
      .select("id, nome, valor, ativo")
      .eq("championship_id", id)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("spectator_tickets")
      .select("status_pagamento, valor, checked_in, quantidade")
      .eq("championship_id", id),
  ]);

  const lista = tickets ?? [];
  const pagos       = lista.filter((t) => t.status_pagamento === "pago");
  const faturamento = pagos.reduce((s, t) => s + Number(t.valor), 0);
  // quantidade = ingressos por pedido (um pedido pode ter vários)
  const ingressosPagos = pagos.reduce((s, t) => s + Number(t.quantidade ?? 1), 0);
  const presentes      = pagos.filter((t) => t.checked_in).reduce((s, t) => s + Number(t.quantidade ?? 1), 0);

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Gestão de Espectadores" description="Ingressos de plateia, financeiro e check-in desse campeonato." />

      <div className="grid grid-cols-3 gap-4 sm:max-w-xl">
        <StatCard label="Ingressos pagos" value={ingressosPagos} icon={Ticket} />
        <StatCard label="Faturamento" value={formatBRL(faturamento)} icon={DollarSign} tone="success" />
        <StatCard label="Presentes" value={presentes} icon={UserCheck} />
      </div>

      <section>
        <SectionHeader title="Tipos de ingresso" />
        <div className="mt-3">
          <GestaoTiposIngresso champId={id} tipos={tipos ?? []} />
        </div>
      </section>
    </PageContainer>
  );
}
