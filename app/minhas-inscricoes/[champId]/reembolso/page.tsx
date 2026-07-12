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
    .select("id, valor, status_pagamento, team_id, championship_id, category_id, created_at")
    .eq("id", regId)
    .single();

  if (!reg) notFound();
  if (reg.status_pagamento !== "pago") redirect(`/minhas-inscricoes/${champId}`);

  // Verifica pertencimento
  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id")
    .eq("id", reg.team_id)
    .single();

  if (!team || (team.atleta1_id !== user.id && team.atleta2_id !== user.id)) {
    redirect("/minhas-inscricoes");
  }

  const [champRes, catRes] = await Promise.all([
    supabase.from("championships").select("nome, data_inicio, data_fim, cidade, estado").eq("id", champId).single(),
    supabase.from("championship_categories").select("nome").eq("id", reg.category_id).single(),
  ]);

  const champ = champRes.data;
  const cat   = catRes.data;
  const valorInscricao = Number(reg.valor);

  const agora = new Date();
  const diasDesdeCompra   = (agora.getTime() - new Date(reg.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const dentroDosPrazo7d  = diasDesdeCompra <= 7;
  // Dentro de 7 dias → Asaas devolve tudo (taxa inclusa); fora → só valor da inscrição
  const textoValorReembolso = dentroDosPrazo7d
    ? "Valor integral pago (inscrição + taxa de serviço)"
    : `Apenas o valor da inscrição — ${formatBRL(valorInscricao)}`;

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
          {champ && <p className="text-sm text-white/50">{champ.nome}</p>}
        </div>
      </div>

      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-md space-y-5">

          {/* Resumo */}
          {champ && cat && (
            <div className="rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5 space-y-1">
              <p className="font-semibold text-gray-900">{champ.nome}</p>
              <p className="text-sm text-gray-500">
                {cat.nome} · {formatDateRangeBR(champ.data_inicio, champ.data_fim)}
              </p>
              <p className="text-sm text-gray-500">{champ.cidade} — {champ.estado}</p>
            </div>
          )}

          {/* Valor que será reembolsado */}
          <div className={`rounded-2xl p-4 ring-1 space-y-1 ${dentroDosPrazo7d ? "bg-blue-50 ring-blue-200" : "bg-amber-50 ring-amber-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${dentroDosPrazo7d ? "text-blue-700" : "text-amber-700"}`}>
              {dentroDosPrazo7d ? "Dentro do prazo de 7 dias (CDC)" : "Fora do prazo de 7 dias"}
            </p>
            <p className={`text-sm font-medium ${dentroDosPrazo7d ? "text-blue-800" : "text-amber-800"}`}>
              Você receberá de volta: {textoValorReembolso}
            </p>
            {!dentroDosPrazo7d && (
              <p className="text-xs text-amber-700">
                A taxa de serviço da plataforma não é reembolsável após 7 dias da compra,
                conforme os Termos de Uso.
              </p>
            )}
          </div>

          {/* Aviso sobre o que acontece */}
          <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-red-800">
              <AlertTriangle className="size-4 shrink-0" />
              O que acontece ao confirmar
            </div>
            <ul className="space-y-1.5 text-sm text-red-700 ml-6 list-disc">
              <li>Sua inscrição e credencial (QR Code) são canceladas imediatamente.</li>
              <li>Sua dupla é removida do campeonato.</li>
              <li>Pix: dinheiro de volta em até 1 dia útil.</li>
              <li>Cartão: em até 30 dias, conforme a operadora.</li>
            </ul>
          </div>

          {/* Info legal */}
          <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 flex gap-3">
            <Info className="size-4 shrink-0 text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-700">
              Dúvidas ou problemas com o evento? Entre em contato pelo e-mail{" "}
              <span className="font-medium">carlosrocha0923@gmail.com</span>.
            </p>
          </div>

          <ReembolsoForm
            regId={regId}
            champId={champId}
            valorExibido={dentroDosPrazo7d ? null : valorInscricao}
          />

        </div>
      </div>
    </div>
  );
}
