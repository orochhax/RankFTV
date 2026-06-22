import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlateiaLista, type PlateiaItem } from "@/components/plateia/PlateiaLista";

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
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}/plateia`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Gestão de Espectadores
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Plateia</h1>
          <p className="text-sm text-white/50">{itens.length} {itens.length === 1 ? "ingresso" : "ingressos"} no total</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl">
          <PlateiaLista itens={itens} />
        </div>
      </div>
    </div>
  );
}
