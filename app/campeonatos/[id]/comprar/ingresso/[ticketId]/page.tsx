import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Users } from "lucide-react";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatBRL } from "@/lib/format";

// Ingresso de atleta: tela de pagamento (Pix) quando pendente, QR de entrada quando pago.
// Visitante sem conta → lemos via admin client pelo id do ingresso.
export default async function IngressoAtletaPage({
  params,
}: {
  params: Promise<{ id: string; ticketId: string }>;
}) {
  const { id: champId, ticketId } = await params;

  const supabase = createAdminClient();
  const { data: t } = await supabase
    .from("athlete_tickets")
    .select(
      "id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, pix_copy_paste, pix_qr_code_base64, qr_token, code, checked_in",
    )
    .eq("id", ticketId)
    .maybeSingle();
  if (!t) notFound();

  const { data: champ } = await supabase
    .from("championships")
    .select("nome")
    .eq("id", champId)
    .maybeSingle();

  const pago = t.status_pagamento === "pago";

  let entradaQr: string | null = null;
  if (pago && t.qr_token) {
    entradaQr = await QRCode.toDataURL(t.qr_token, {
      width:                280,
      margin:               2,
      color:                { dark: "#0f0f13", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <div className="mx-auto max-w-md px-6 py-8">
        <Link
          href={`/campeonatos/${champId}`}
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="size-4" /> {champ?.nome ?? "Campeonato"}
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-xl">
          {/* Topo */}
          <div className="bg-[#0f0f13] px-6 py-5 text-center">
            {t.code && (
              <p className="mb-1 font-mono text-[10px] tracking-[0.25em] text-white/50">{t.code}</p>
            )}
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              Ingresso de atleta
            </p>
            {t.categoria_nome && (
              <p className="mt-0.5 text-sm font-semibold text-white">Categoria {t.categoria_nome}</p>
            )}
          </div>

          {/* Atletas */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-3">
            <Users className="size-4 shrink-0 text-gray-400" />
            <p className="text-sm text-gray-700">
              <span className="font-medium">{t.comprador_nome}</span>
              {t.parceiro_nome && (
                <> + <span className="font-medium">{t.parceiro_nome}</span></>
              )}
            </p>
          </div>

          <div className="px-6 py-6">
            {pago ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="size-4" /> Inscrição confirmada
                </div>
                {entradaQr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entradaQr}
                    alt="QR de entrada"
                    width={220}
                    height={220}
                    className={`rounded-2xl ${t.checked_in ? "opacity-40 grayscale" : ""}`}
                  />
                )}
                <p className="text-xs text-gray-400">
                  {t.checked_in
                    ? "Check-in já realizado"
                    : "Apresente este QR na entrada do evento"}
                </p>
                <p className="text-xs text-blue-600">
                  Salve o link desta página para acessar depois.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <Clock className="size-4" /> Aguardando pagamento
                </div>
                {t.pix_qr_code_base64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${t.pix_qr_code_base64}`}
                    alt="QR Pix"
                    width={220}
                    height={220}
                    className="rounded-2xl ring-1 ring-black/5"
                  />
                ) : (
                  <div className="flex size-[220px] items-center justify-center rounded-2xl bg-gray-100">
                    <Clock className="size-10 text-gray-300" />
                  </div>
                )}
                <p className="text-lg font-bold text-gray-900">{formatBRL(Number(t.valor))}</p>
                {t.pix_copy_paste && (
                  <div className="flex w-full items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-black/5">
                    <span className="flex-1 truncate font-mono text-xs text-gray-500">
                      {t.pix_copy_paste}
                    </span>
                    <CopyButton text={t.pix_copy_paste} />
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Pague pelo app do seu banco. Assim que cair, a inscrição é confirmada e o QR de entrada aparece aqui.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
