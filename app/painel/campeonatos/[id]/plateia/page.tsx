import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, DollarSign, QrCode, Ticket, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { GestaoTiposIngresso } from "@/components/plateia/GestaoTiposIngresso";

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

  const NAV = [
    { icon: DollarSign, label: "Financeiro da plateia", desc: "Quanto entrou só de ingressos", href: `/painel/campeonatos/${id}/plateia/financeiro` },
    { icon: QrCode, label: "Check-in da plateia", desc: "Marcar presença na entrada", href: `/painel/campeonatos/${id}/plateia/checkin` },
    { icon: Users, label: "Plateia", desc: "Quem comprou ingresso (com busca)", href: `/painel/campeonatos/${id}/plateia/lista` },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {champ.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Ticket className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Gestão de Espectadores</h1>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Ingressos pagos</p>
              <p className="text-2xl font-bold text-white">{ingressosPagos}</p>
            </div>
            <div className="rounded-2xl bg-blue-500/20 p-4">
              <p className="text-xs text-blue-400">Faturamento</p>
              <p className="text-xl font-bold text-blue-300">{formatBRL(faturamento)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs text-white/50">Presentes</p>
              <p className="text-2xl font-bold text-white">{presentes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-8">

          {/* Navegação */}
          <div className="grid gap-3 sm:grid-cols-3">
            {NAV.map(({ icon: Icon, label, desc, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600">
                  <Icon className="size-5 text-white" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-gray-300" />
              </Link>
            ))}
          </div>

          {/* Tipos de ingresso */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Tipos de ingresso</h2>
            <GestaoTiposIngresso champId={id} tipos={tipos ?? []} />
          </section>
        </div>
      </div>
    </div>
  );
}
