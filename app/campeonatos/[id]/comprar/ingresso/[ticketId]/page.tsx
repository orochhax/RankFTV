import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/ui/Avatar";
import {
  IngressoAtletaPagamento,
  type AthleteEntryCredential,
} from "@/components/campeonatos/IngressoAtletaPagamento";
import { IngressoOpcoesMenu } from "@/components/ingressos/IngressoOpcoesMenu";
import { RefundStatusPanel } from "@/components/ingressos/RefundStatusPanel";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";
import { PageContainer } from "@/components/shell/PageContainer";
import { athleteDisplayName } from "@/lib/athlete-display-name";
import { calcularTotalComprador } from "@/lib/taxas";
import { decideRefundPolicy } from "@/lib/refund-policy";

const AVATAR_COLORS = ["bg-blue-500", "bg-blue-500", "bg-violet-500", "bg-orange-500", "bg-rose-500", "bg-teal-500"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function dataBR(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// Ingresso de atleta: tela de pagamento (Pix/Cartão) quando pendente, QR de entrada quando pago.
// Visitante sem conta → lemos via admin client pelo id do ingresso.
export default async function IngressoAtletaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; ticketId: string }>;
  searchParams: Promise<{ voltar?: string; token?: string }>;
}) {
  const { id: champId, ticketId } = await params;
  const { voltar, token } = await searchParams;
  const accessToken = normalizarTicketAccessToken(token);
  if (!accessToken) notFound();
  const backHref  = voltar === "minhas-compras" ? "/minhas-compras" : `/campeonatos/${champId}`;

  const supabase = createAdminClient();
  const { data: t } = await supabase
    .from("athlete_tickets")
    .select(
      "id, championship_id, category_id, categoria_nome, comprador_nome, comprador_cpf, comprador_email, comprador_zap, comprador_genero, parceiro_nome, parceiro_cpf, parceiro_email, parceiro_zap, parceiro_genero, valor, status_pagamento, billing_type, asaas_payment_id, pix_copy_paste, pix_qr_code_base64, qr_token, code, checked_in, inventory_released_at, created_at",
    )
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();
  if (!t) notFound();
  if (t.championship_id !== champId) notFound();

  const individualCredentialResult = await supabase
    .from("athlete_ticket_credentials")
    .select("id, athlete_slot, display_name_snapshot, qr_token, code, checked_in, checkin_at")
    .eq("athlete_ticket_id", ticketId)
    .eq("athlete_slot", 1)
    .maybeSingle();

  const { data: refundOperation } = await supabase
    .from("financial_operations")
    .select("status, provider_status, created_at, updated_at, completed_at")
    .eq("flow", "athlete_ticket")
    .eq("operation_type", "refund")
    .eq("record_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: paymentOperation } = await supabase
    .from("financial_operations")
    .select("amount")
    .eq("flow", "athlete_ticket")
    .eq("operation_type", "payment")
    .eq("record_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const hasRefundOperation = Boolean(refundOperation);
  const terminal = t.status_pagamento === "estornado" || t.status_pagamento === "expirado";
  const refundStatus = refundOperation?.provider_status === "REFUNDED"
    ? "refunded"
    : refundOperation?.status ?? null;

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, is_elite, data_inicio, data_fim, cidade, estado, local, regulamento")
    .eq("id", champId)
    .maybeSingle();

  let categoriaGenero: "masculino" | "feminino" | "mista" | null = null;
  if (t.category_id) {
    const { data: cat } = await supabase
      .from("championship_categories")
      .select("genero")
      .eq("id", t.category_id)
      .maybeSingle();
    categoriaGenero = (cat?.genero as "masculino" | "feminino" | "mista" | undefined) ?? null;
  }

  const pago = t.status_pagamento === "pago";
  const refundPolicy = decideRefundPolicy({
    purchasedAt: t.created_at,
    eventStartDate: champ?.data_inicio ?? null,
    checkedIn: !!t.checked_in,
    paymentStatus: t.status_pagamento,
    hasProviderCharge: !!t.asaas_payment_id && Number(t.valor) > 0,
  });
  const compradorPublicName = athleteDisplayName(t.comprador_nome);
  const parceiroPublicName = athleteDisplayName(t.parceiro_nome);

  type CredentialRow = {
    id: string;
    athlete_slot: number;
    display_name_snapshot: string;
    qr_token: string | null;
    code: string | null;
    checked_in: boolean;
    checkin_at: string | null;
  };
  const individualCredential = individualCredentialResult.error
    ? null
    : individualCredentialResult.data as CredentialRow | null;
  const credentialSources: CredentialRow[] = individualCredential
    ? [individualCredential]
    : [{
        id: `legacy:${t.id}`,
        athlete_slot: 1,
        display_name_snapshot: `${compradorPublicName} + ${parceiroPublicName}`,
        qr_token: t.qr_token,
        code: t.code,
        checked_in: t.checked_in,
        checkin_at: null,
      }];
  const initialCredentials: AthleteEntryCredential[] = await Promise.all(
    credentialSources.map(async (credential) => ({
      id: credential.id,
      name: athleteDisplayName(credential.display_name_snapshot),
      qrToken: credential.qr_token,
      code: credential.code,
      checkedIn: credential.checked_in,
      checkinAt: credential.checkin_at,
      qrDataUrl: pago && credential.qr_token
        ? await QRCode.toDataURL(credential.qr_token, {
            width: 280,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
            errorCorrectionLevel: "M",
          })
        : null,
    })),
  );

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho escuro (mesma largura contida do corpo, em toda tela) ── */}
      <div className="bg-black pb-16 pt-6">
        <PageContainer width="wide" className="space-y-5">
          <div className="flex items-center justify-between">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="size-4" /> {voltar === "minhas-compras" ? "Minhas Compras" : "Voltar ao campeonato"}
            </Link>
            {!terminal && !hasRefundOperation && (
              <IngressoOpcoesMenu
                tipo="atleta"
                ticketId={t.id}
                accessToken={accessToken}
                billingType={t.billing_type}
                refundPolicy={refundPolicy}
                purchasedAt={t.created_at}
                eventStartDate={champ?.data_inicio ?? null}
                baseAmount={Number(t.valor)}
                paidAmount={paymentOperation?.amount == null ? null : Number(paymentOperation.amount)}
                dadosAtuais={{
                  compradorNome:   t.comprador_nome,
                  compradorCpf:    t.comprador_cpf,
                  compradorEmail:  t.comprador_email,
                  compradorZap:    t.comprador_zap,
                  compradorGenero: t.comprador_genero,
                  parceiroNome:    t.parceiro_nome,
                  parceiroCpf:     t.parceiro_cpf,
                  parceiroEmail:   t.parceiro_email,
                  parceiroZap:     t.parceiro_zap,
                  parceiroGenero:  t.parceiro_genero,
                  categoriaGenero,
                }}
              />
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">Ingresso de atleta</p>
            <h1 className="mt-1 text-xl font-bold text-white">{champ?.nome ?? "Campeonato"}</h1>
            {t.categoria_nome && (
              <p className="text-sm text-white/50">Categoria {t.categoria_nome}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar nome={compradorPublicName} color={avatarColor(compradorPublicName)} size="sm" />
              <span className="text-sm font-medium text-white">{compradorPublicName}</span>
            </div>
            <span className="text-white/30">+</span>
            <div className="flex items-center gap-2">
              <Avatar nome={parceiroPublicName} color={avatarColor(parceiroPublicName)} size="sm" />
              <span className="text-sm font-medium text-white">{parceiroPublicName}</span>
            </div>
          </div>

        </PageContainer>
      </div>

      {/* ── Corpo: sheet arredondada no mobile, fundo neutro no desktop ── */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:shadow-none">
        <PageContainer width="wide" className="space-y-6">
          {hasRefundOperation || terminal ? (
            <RefundStatusPanel
              billingType={t.billing_type}
              refundStatus={refundStatus}
              requestedAt={refundOperation?.created_at ?? null}
              completedAt={refundOperation?.completed_at ?? (refundStatus === "refunded" ? refundOperation?.updated_at ?? null : null)}
              cancelledAt={t.inventory_released_at ?? null}
            />
          ) : (
            <IngressoAtletaPagamento
              ticketId={t.id}
              accessToken={accessToken}
              isElite={!!champ?.is_elite}
              initialStatusPagamento={t.status_pagamento}
              initialCredentials={initialCredentials}
              valor={Number(t.valor)}
              pixAmount={Number(paymentOperation?.amount ?? calcularTotalComprador(Number(t.valor), "pix", !!champ?.is_elite))}
              pixCopyPaste={t.pix_copy_paste}
              pixQrBase64={t.pix_qr_code_base64}
              paymentMethod={t.billing_type === "CREDIT_CARD" || t.billing_type === "DEBIT_CARD" ? "cartao" : "pix"}
            />
          )}

          {/* Dados do campeonato */}
          {champ && (
            <div className="space-y-3 rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sobre o campeonato</p>
              <p className="font-semibold text-gray-900">{champ.nome}</p>
              {champ.data_inicio && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarDays className="size-4 shrink-0 text-gray-400" />
                  {dataBR(champ.data_inicio)}
                  {champ.data_fim && champ.data_fim !== champ.data_inicio && ` a ${dataBR(champ.data_fim)}`}
                </p>
              )}
              {(champ.local || champ.cidade) && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="size-4 shrink-0 text-gray-400" />
                  {[champ.local, champ.cidade && `${champ.cidade}/${champ.estado}`].filter(Boolean).join(" · ")}
                </p>
              )}
              <Link
                href={`/campeonatos/${champId}`}
                className="inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                Ver página do campeonato
              </Link>
            </div>
          )}
        </PageContainer>
      </div>
    </div>
  );
}
