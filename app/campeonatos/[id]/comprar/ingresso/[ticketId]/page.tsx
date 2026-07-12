import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar } from "@/components/ui/Avatar";
import { IngressoAtletaPagamento } from "@/components/campeonatos/IngressoAtletaPagamento";
import { IngressoOpcoesMenu } from "@/components/ingressos/IngressoOpcoesMenu";
import { normalizarTicketAccessToken } from "@/lib/ticket-access";

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
      "id, category_id, categoria_nome, comprador_nome, comprador_cpf, comprador_email, comprador_zap, comprador_genero, parceiro_nome, parceiro_cpf, parceiro_email, parceiro_zap, parceiro_genero, valor, status_pagamento, pix_copy_paste, pix_qr_code_base64, qr_token, code, checked_in",
    )
    .eq("id", ticketId)
    .eq("access_token", accessToken)
    .maybeSingle();
  if (!t) notFound();

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
    <div className="min-h-screen">
      {/* ── Cabeçalho escuro ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-lg space-y-5">
          <div className="flex items-center justify-between">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="size-4" /> {voltar === "minhas-compras" ? "Minhas Compras" : "Voltar ao campeonato"}
            </Link>
            {t.status_pagamento !== "estornado" && (
              <IngressoOpcoesMenu
                tipo="atleta"
                ticketId={t.id}
                accessToken={accessToken}
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
              <Avatar nome={t.comprador_nome} color={avatarColor(t.comprador_nome)} size="sm" />
              <span className="text-sm font-medium text-white">{t.comprador_nome}</span>
            </div>
            {t.parceiro_nome && (
              <>
                <span className="text-white/30">+</span>
                <div className="flex items-center gap-2">
                  <Avatar nome={t.parceiro_nome} color={avatarColor(t.parceiro_nome)} size="sm" />
                  <span className="text-sm font-medium text-white">{t.parceiro_nome}</span>
                </div>
              </>
            )}
          </div>

          {t.code && (
            <p className="font-mono text-[11px] tracking-[0.25em] text-white/30">{t.code}</p>
          )}
        </div>
      </div>

      {/* ── Área branca ── */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-lg space-y-6">
          <IngressoAtletaPagamento
            ticketId={t.id}
            accessToken={accessToken}
            isElite={!!champ?.is_elite}
            initialStatusPagamento={t.status_pagamento}
            initialCheckedIn={t.checked_in}
            initialEntradaQr={entradaQr}
            qrToken={t.qr_token}
            code={t.code}
            valor={Number(t.valor)}
            pixCopyPaste={t.pix_copy_paste}
            pixQrBase64={t.pix_qr_code_base64}
          />

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
        </div>
      </div>
    </div>
  );
}
