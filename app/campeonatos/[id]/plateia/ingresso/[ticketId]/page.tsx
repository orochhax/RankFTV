import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { IngressoPlateiaStatus } from "@/components/plateia/IngressoPlateiaStatus";
import { IngressoOpcoesMenu } from "@/components/ingressos/IngressoOpcoesMenu";
import { RefundStatusPanel } from "@/components/ingressos/RefundStatusPanel";
import { formatBRL } from "@/lib/format";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";

function dataBR(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// Ingresso de plateia: tela de pagamento (Pix) quando pendente, e o QR de
// entrada quando pago. Visitante não tem conta, então lemos via admin client
// pelo id do ingresso (o link é a "chave" do comprador).
export default async function IngressoPlateiaPage({
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
    .from("spectator_tickets")
    .select("id, tipo_nome, comprador_nome, comprador_email, comprador_cpf, valor, quantidade, itens, status_pagamento, billing_type, pix_copy_paste, pix_qr_code_base64, qr_token, code, checked_in")
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();
  if (!t) notFound();

  const { data: refundOperation } = await supabase
    .from("financial_operations")
    .select("status, created_at")
    .eq("flow", "spectator_ticket")
    .eq("operation_type", "refund")
    .eq("record_id", ticketId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const estornoEmAndamento = refundOperation?.status != null
    && t.status_pagamento !== "estornado";

  const { data: normalizedItems } = await supabase
    .from("spectator_ticket_items")
    .select("id, tipo_nome_snapshot, valor_unitario, quantidade")
    .eq("ticket_id", ticketId)
    .order("line_number", { ascending: true });
  const itens = normalizedItems?.length
    ? normalizedItems.map((item) => ({
        key: item.id,
        tipo_nome: item.tipo_nome_snapshot,
        qty: Number(item.quantidade),
        valor_unit: Number(item.valor_unitario),
      }))
    : ((t.itens as { tipo_nome: string; qty: number; valor_unit: number }[] | null) ?? [])
        .map((item, index) => ({ ...item, key: `legacy-${index}` }));

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, data_inicio, data_fim, cidade, estado, local")
    .eq("id", champId)
    .maybeSingle();

  const pago = t.status_pagamento === "pago";

  // QR de entrada (gerado do qr_token) só quando pago
  let entradaQr: string | null = null;
  if (pago && t.qr_token) {
    entradaQr = await QRCode.toDataURL(t.qr_token, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-md px-6 py-8">
        <div className="flex items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {voltar === "minhas-compras" ? "Minhas Compras" : (champ?.nome ?? "Campeonato")}
          </Link>
          {t.status_pagamento !== "estornado" && !estornoEmAndamento && (
              <IngressoOpcoesMenu
                tipo="plateia"
                ticketId={t.id}
                accessToken={accessToken}
                dadosAtuais={{
                compradorNome:  t.comprador_nome,
                compradorEmail: t.comprador_email,
                compradorCpf:   t.comprador_cpf,
              }}
            />
          )}
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-xl">
          {/* Topo */}
          <div className="bg-black px-6 py-5 text-center">
            {t.code && (
              <p className="mb-1 font-mono text-[10px] tracking-[0.25em] text-white/50">{t.code}</p>
            )}
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              {Number(t.quantidade) > 1 ? `Pedido · ${t.quantidade} ingressos` : "Ingresso de plateia"}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">{t.tipo_nome ?? "Plateia"}</p>
          </div>

          {/* Itens do pedido */}
          {itens.length > 0 && (
            <ul className="divide-y divide-gray-100 border-b border-gray-100 px-6 py-2 text-sm">
              {itens.map((it) => (
                <li key={it.key} className="flex items-center justify-between py-1.5">
                  <span className="text-gray-600">{it.qty}× {it.tipo_nome}</span>
                  <span className="font-medium text-gray-900">
                    {Number(it.valor_unit) === 0 ? "Grátis" : formatBRL(Number(it.valor_unit) * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="px-6 py-6">
            {estornoEmAndamento ? (
              <RefundStatusPanel
                billingType={t.billing_type}
                requestedAt={refundOperation?.created_at ?? null}
              />
            ) : t.status_pagamento === "estornado" ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                <h2 className="text-lg font-semibold text-red-950">Ingresso cancelado</h2>
                <p className="mt-2 text-sm text-red-800">
                  Este ingresso não pode mais receber pagamento nem ser usado para entrar no campeonato.
                </p>
                <p className="mt-1 text-sm text-red-800">
                  Se houve pagamento, acompanhe o status do estorno no histórico de Minhas compras.
                </p>
                <Link
                  href="/minhas-compras"
                  className="mt-5 inline-flex rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Ver minhas compras
                </Link>
              </section>
            ) : (
              <IngressoPlateiaStatus
                ticketId={t.id}
                accessToken={accessToken}
                initialStatusPagamento={t.status_pagamento}
                initialCheckedIn={t.checked_in}
                initialEntradaQr={entradaQr}
                qrToken={t.qr_token}
                code={t.code}
                quantidade={Number(t.quantidade)}
                valor={Number(t.valor)}
                pixCopyPaste={t.pix_copy_paste}
                pixQrBase64={t.pix_qr_code_base64}
              />
            )}
          </div>

          {/* Dados do campeonato */}
          {champ && (
            <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-6 py-5">
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
        </div>
      </div>
    </div>
  );
}
