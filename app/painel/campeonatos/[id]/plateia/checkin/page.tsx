import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlateiaCheckin, type CheckinItem } from "@/components/plateia/PlateiaCheckin";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";

export default async function CheckinPlateiaPage({
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

  // Só ingressos pagos entram na portaria
  const { data: raw } = await supabase
    .from("spectator_tickets")
    .select("id, comprador_nome, tipo_nome, code, quantidade, checked_in")
    .eq("championship_id", id)
    .eq("status_pagamento", "pago")
    .order("comprador_nome", { ascending: true });

  const itens = (raw ?? []) as CheckinItem[];
  const presentes = itens.filter((i) => i.checked_in).reduce((s, i) => s + Number(i.quantidade ?? 1), 0);
  const totalIngressos = itens.reduce((s, i) => s + Number(i.quantidade ?? 1), 0);

  return (
    <PageContainer width="form" className="space-y-6 py-8">
      <PageHeader title="Check-in da plateia" description={`${presentes} de ${totalIngressos} presentes`} />
      <PlateiaCheckin champId={id} itens={itens} />
    </PageContainer>
  );
}
