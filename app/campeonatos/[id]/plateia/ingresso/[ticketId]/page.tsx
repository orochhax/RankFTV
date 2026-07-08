import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { IngressoPlateiaStatus } from "@/components/plateia/IngressoPlateiaStatus";
import { formatBRL } from "@/lib/format";

// Ingresso de plateia: tela de pagamento (Pix) quando pendente, e o QR de
// entrada quando pago. Visitante não tem conta, então lemos via admin client
// pelo id do ingresso (o link é a "chave" do comprador).
export default async function IngressoPlateiaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; ticketId: string }>;
  searchParams: Promise<{ voltar?: string }>;
}) {
  const { id: champId, ticketId } = await params;
  const { voltar } = await searchParams;
  const backHref  = voltar === "minhas-compras" ? "/minhas-compras" : `/campeonatos/${champId}`;

  const supabase = createAdminClient();
  const { data: t } = await supabase
    .from("spectator_tickets")
    .select("id, tipo_nome, valor, quantidade, itens, status_pagamento, pix_copy_paste, pix_qr_code_base64, qr_token, code, checked_in")
    .eq("id", ticketId)
    .maybeSingle();
  if (!t) notFound();

  const itens = (t.itens as { tipo_nome: string; qty: number; valor_unit: number }[] | null) ?? [];

  const { data: champ } = await supabase
    .from("championships")
    .select("nome")
    .eq("id", champId)
    .maybeSingle();

  const pago = t.status_pagamento === "pago";

  // QR de entrada (gerado do qr_token) só quando pago
  let entradaQr: string | null = null;
  if (pago && t.qr_token) {
    entradaQr = await QRCode.toDataURL(t.qr_token, {
      width: 280,
      margin: 2,
      color: { dark: "#0f0f13", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <div className="mx-auto max-w-md px-6 py-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="size-4" /> {voltar === "minhas-compras" ? "Minhas Compras" : (champ?.nome ?? "Campeonato")}
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-xl">
          {/* Topo */}
          <div className="bg-[#0f0f13] px-6 py-5 text-center">
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
              {itens.map((it, i) => (
                <li key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-gray-600">{it.qty}× {it.tipo_nome}</span>
                  <span className="font-medium text-gray-900">
                    {Number(it.valor_unit) === 0 ? "Grátis" : formatBRL(Number(it.valor_unit) * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="px-6 py-6">
            <IngressoPlateiaStatus
              ticketId={t.id}
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
          </div>
        </div>
      </div>
    </div>
  );
}
