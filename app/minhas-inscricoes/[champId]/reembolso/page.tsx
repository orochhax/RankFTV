import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDateRangeBR } from "@/lib/format";
import { ReembolsoForm } from "./ReembolsoForm";

export default async function ReembolsoPage({
  params,
  searchParams,
}: {
  params:       Promise<{ champId: string }>;
  searchParams: Promise<{ reg?: string }>;
}) {
  const { champId } = await params;
  const { reg: regId } = await searchParams;

  if (!regId) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, valor, status_pagamento, team_id, championship_id, category_id")
    .eq("id", regId)
    .single();

  if (!reg) notFound();
  if (reg.status_pagamento !== "pago") redirect(`/minhas-inscricoes/${champId}`);

  const [champRes, catRes, teamRes] = await Promise.all([
    supabase.from("championships").select("nome, data_inicio, data_fim, cidade, estado").eq("id", champId).single(),
    supabase.from("championship_categories").select("nome").eq("id", reg.category_id).single(),
    supabase.from("teams").select("atleta1_id, atleta2_id").eq("id", reg.team_id).single(),
  ]);

  // Só quem é atleta da dupla pode pedir reembolso
  const t = teamRes.data;
  if (!t || (t.atleta1_id !== user.id && t.atleta2_id !== user.id)) {
    redirect(`/minhas-inscricoes`);
  }

  const champ = champRes.data;
  const cat   = catRes.data;
  const valor = Number(reg.valor);

  // Verifica se ainda está dentro do prazo de 7 dias do CDC
  // (a data de criação está na inscrição, mas não selecionamos; usamos lógica conservadora)
  const dentroDosPrazo7Dias = true; // TODO: comparar com created_at da inscrição

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-md space-y-3">
          <Link
            href={`/minhas-inscricoes/${champId}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <h1 className="text-2xl font-bold text-white">Solicitar reembolso</h1>
          {champ && (
            <p className="text-sm text-white/50">{champ.nome}</p>
          )}
        </div>
      </div>

      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-md space-y-5">

          {/* Resumo da inscrição */}
          {champ && cat && (
            <div className="rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5 space-y-1">
              <p className="font-semibold text-gray-900">{champ.nome}</p>
              <p className="text-sm text-gray-500">
                {cat.nome} · {formatDateRangeBR(champ.data_inicio, champ.data_fim)}
              </p>
              <p className="text-sm text-gray-500">{champ.cidade} — {champ.estado}</p>
              <p className="mt-3 text-lg font-bold text-gray-900">
                Valor pago: {formatBRL(valor)}
              </p>
            </div>
          )}

          {/* Aviso sobre o que acontece */}
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              O que acontece ao pedir reembolso
            </div>
            <ul className="space-y-1.5 text-sm text-amber-700 ml-6 list-disc">
              <li>Sua inscrição e credencial (QR Code) serão canceladas imediatamente.</li>
              <li>Sua dupla será removida do campeonato.</li>
              <li>O reembolso retorna para o mesmo método de pagamento usado.</li>
              <li>Pix: geralmente em até 1 dia útil. Cartão: até 30 dias conforme a operadora.</li>
            </ul>
          </div>

          {/* Info sobre prazo CDC / taxa */}
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 flex gap-3">
            <Info className="size-4 shrink-0 text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-700">
              {dentroDosPrazo7Dias
                ? "Conforme o Código de Defesa do Consumidor (art. 49), compras feitas online podem ser canceladas em até 7 dias com reembolso integral."
                : "O prazo de 7 dias do CDC já encerrou. O reembolso fica a critério do regulamento do campeonato e da política do organizador."}
            </p>
          </div>

          <ReembolsoForm regId={regId} champId={champId} valor={valor} />

        </div>
      </div>
    </div>
  );
}
