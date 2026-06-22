import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlateiaCheckin, type CheckinItem } from "@/components/plateia/PlateiaCheckin";

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
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}/plateia`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Gestão de Espectadores
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Check-in da plateia</h1>
          <p className="text-sm text-white/50">{presentes} de {totalIngressos} presentes</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl">
          <PlateiaCheckin champId={id} itens={itens} />
        </div>
      </div>
    </div>
  );
}
