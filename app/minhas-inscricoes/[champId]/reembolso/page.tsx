import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateRangeBR } from "@/lib/format";
import { ReembolsoForm } from "./ReembolsoForm";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideRefundPolicy } from "@/lib/refund-policy";
import { RefundPolicySummary } from "@/components/ingressos/RefundPolicySummary";

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
    .select("id, valor, status_pagamento, asaas_payment_id, team_id, championship_id, category_id, created_at")
    .eq("id", regId)
    .single();

  if (!reg) notFound();
  if (reg.status_pagamento !== "pago") redirect(`/minhas-inscricoes/${champId}`);
  if (reg.championship_id !== champId) notFound();

  // Verifica pertencimento
  const { data: team } = await supabase
    .from("teams")
    .select("atleta1_id, atleta2_id")
    .eq("id", reg.team_id)
    .single();

  if (!team || (team.atleta1_id !== user.id && team.atleta2_id !== user.id)) {
    redirect("/minhas-inscricoes");
  }

  const admin = createAdminClient();
  const athleteIds = [team.atleta1_id, team.atleta2_id].filter(Boolean) as string[];
  const [champRes, catRes, usedCredentialRes, paymentOperationRes] = await Promise.all([
    supabase.from("championships").select("nome, data_inicio, data_fim, cidade, estado").eq("id", reg.championship_id).single(),
    supabase.from("championship_categories").select("nome").eq("id", reg.category_id).single(),
    admin
      .from("credentials")
      .select("id")
      .eq("championship_id", reg.championship_id)
      .eq("role", "atleta")
      .eq("checked_in", true)
      .in("user_id", athleteIds)
      .limit(1)
      .maybeSingle(),
    admin
      .from("financial_operations")
      .select("amount")
      .eq("flow", "registration")
      .eq("operation_type", "payment")
      .eq("record_id", reg.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const champ = champRes.data;
  const cat   = catRes.data;
  const valorInscricao = Number(reg.valor);

  const refundPolicy = decideRefundPolicy({
    purchasedAt: reg.created_at,
    eventStartDate: champ?.data_inicio ?? null,
    checkedIn: !!usedCredentialRes.data,
    paymentStatus: reg.status_pagamento,
    hasProviderCharge: !!reg.asaas_payment_id && Number(reg.valor) > 0,
  });

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6 md:hidden">
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

      <div className="hidden border-b border-border bg-surface md:block">
        <PageContainer width="form" className="py-8">
          <Link
            href={`/minhas-inscricoes/${champId}`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <PageHeader title="Solicitar reembolso" description={champ?.nome} className="mt-3" />
        </PageContainer>
      </div>

      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:shadow-none">
        <PageContainer width="form" className="space-y-5">

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

          {champ && (
            <RefundPolicySummary
              decision={refundPolicy}
              purchasedAt={reg.created_at}
              eventStartDate={champ.data_inicio}
              baseAmount={valorInscricao}
              paidAmount={paymentOperationRes.data?.amount == null ? null : Number(paymentOperationRes.data.amount)}
            />
          )}

          {refundPolicy.allowed && (
            <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-red-800">
                <AlertTriangle className="size-4 shrink-0" />
                O que acontece ao confirmar
              </div>
              <ul className="space-y-1.5 text-sm text-red-700 ml-6 list-disc">
                <li>Uma nova solicitação fica bloqueada enquanto o reembolso é processado.</li>
                <li>Após a confirmação financeira, a inscrição, a dupla e o QR Code são cancelados.</li>
                <li>Pix: dinheiro de volta em até 1 dia útil.</li>
                <li>Cartão: em até 30 dias, conforme a operadora.</li>
              </ul>
            </div>
          )}

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
            allowed={refundPolicy.allowed}
            valorExibido={refundPolicy.refundMode === "partial" ? valorInscricao : null}
          />

        </PageContainer>
      </div>
    </div>
  );
}
