import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlateiaLista, type PlateiaItem } from "@/components/plateia/PlateiaLista";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";

export default async function PlateiaListaPage({
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

  const { data: raw } = await supabase
    .from("spectator_tickets")
    .select("id, comprador_nome, comprador_email, tipo_nome, valor, quantidade, status_pagamento, checked_in, code")
    .eq("championship_id", id)
    .order("created_at", { ascending: false });

  const itens = (raw ?? []) as PlateiaItem[];

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader
        title="Plateia"
        description={`${itens.length} ${itens.length === 1 ? "ingresso" : "ingressos"} no total`}
      />
      <PlateiaLista itens={itens} />
    </PageContainer>
  );
}
