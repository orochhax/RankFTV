"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, AlertCircle, CalendarDays, MapPin, CreditCard } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatBRL } from "@/lib/format";
import { trackPublicFunnel } from "@/lib/public-funnel-client";
import { ReservationCountdown } from "@/components/checkout/ReservationCountdown";
import {
  athleteOrderReference,
  athletePaymentMethodLabel,
  athletePostPaymentState,
} from "@/lib/athlete-ticket-post-payment";


export type AthleteEntryCredential = {
  id: string;
  name: string;
  qrToken: string | null;
  code: string | null;
  checkedIn: boolean;
  checkinAt: string | null;
  qrDataUrl: string | null;
};

type Props = {
  ticketId:     string;
  accessToken:  string;
  initialStatusPagamento: string; // "pendente" | "pago" | "estornado"
  initialCredentials: AthleteEntryCredential[];
  pixAmount:    number;
  pixCopyPaste: string | null;
  pixQrBase64:  string | null;
  invoiceUrl: string | null;
  paymentMethod: "pix" | "cartao";
  championshipId: string;
  categoryId: string | null;
  checkoutExpiresAt: string | null;
  serverNow: string;
  championshipName: string;
  categoryName: string | null;
  buyerName: string;
  partnerName: string;
  buyerEmail: string;
  partnerEmail: string;
  organizerName: string | null;
  organizerPhone: string | null;
  championshipDateLabel: string | null;
  championshipLocationLabel: string | null;
  championshipHref: string;
};

export function IngressoAtletaPagamento({
  ticketId,
  accessToken,
  initialStatusPagamento,
  initialCredentials,
  pixAmount,
  pixCopyPaste,
  pixQrBase64,
  invoiceUrl,
  paymentMethod,
  championshipId,
  categoryId,
  checkoutExpiresAt,
  serverNow,
  championshipName,
  categoryName,
  buyerName,
  partnerName,
  buyerEmail,
  partnerEmail,
  organizerName,
  organizerPhone,
  championshipDateLabel,
  championshipLocationLabel,
  championshipHref,
}: Props) {
  const router = useRouter();
  const [statusPagamento, setStatusPagamento] = useState(initialStatusPagamento);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [paymentInAnalysis, setPaymentInAnalysis] = useState(false);
  const stoppedRef = useRef(false);
  const paymentTrackedRef = useRef(false);

  const pago = statusPagamento === "pago";
  const postPaymentState = athletePostPaymentState(statusPagamento, paymentInAnalysis);

  useEffect(() => {
    if (!pago || paymentTrackedRef.current) return;
    paymentTrackedRef.current = true;
    trackPublicFunnel({ event: "payment_confirmed", championshipId, categoryId });
  }, [categoryId, championshipId, pago]);

  async function gerarEntradaQrs() {
    const generated = await Promise.all(credentials.map(async (credential) => {
      if (!credential.qrToken || credential.qrDataUrl) return credential;
      const qrDataUrl = await QRCode.toDataURL(credential.qrToken, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      return { ...credential, qrDataUrl };
    }));
    setCredentials(generated);
  }

  // Consulta apenas este ingresso e considera o banco como fonte da verdade.
  // Para em qualquer estado final e atualiza também o Server Component, que
  // contém a timeline de cancelamento/estorno.
  useEffect(() => {
    if (["estornado", "expirado"].includes(statusPagamento)) return;
    if (statusPagamento === "pago" && credentials.length > 0 && credentials.every((credential) => credential.checkedIn)) return;
    stoppedRef.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch("/api/ticket-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "atleta", id: ticketId, token: accessToken }),
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const nextStatus = String(data.status_pagamento ?? "pendente");
          if (Array.isArray(data.credentials)) {
            const allCredentialsChecked = data.credentials.length > 0
              && data.credentials.every((item: { checked_in?: unknown }) => item.checked_in === true);
            setCredentials((current) => current.map((credential) => {
              const latest = data.credentials.find((item: { id?: string }) => item.id === credential.id);
              return latest
                ? {
                    ...credential,
                    checkedIn: !!latest.checked_in,
                    checkinAt: latest.checkin_at ?? null,
                  }
                : credential;
            }));
            if (nextStatus === "pago" && allCredentialsChecked) {
              stoppedRef.current = true;
            }
          }
          if (nextStatus !== statusPagamento) {
            setStatusPagamento(nextStatus);
            if (["pago", "estornado", "expirado"].includes(nextStatus)) setPaymentInAnalysis(false);
            if (nextStatus === "pago") await gerarEntradaQrs();
            router.refresh();
          }
          if (stoppedRef.current) return;
        }
      } catch {
        // falha de rede — tenta de novo no próximo tick
      }
      if (!stoppedRef.current) timer = setTimeout(check, 3000);
    }

    void check();
    const maxTimer = setTimeout(() => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
    }, 20 * 60 * 1000);

    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
      clearTimeout(maxTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusPagamento, ticketId, accessToken, router]);

  if (pago) {
    return (
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl bg-white text-center shadow-sm ring-1 ring-black/5">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-8">
          <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-600">
            <CheckCircle2 className="size-4" /> Inscrição confirmada
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Este link mostra somente a credencial do comprador. O parceiro recebe a dele no próprio e-mail.
          </p>
        </div>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)]">
          <div id="meus-ingressos" className="grid content-start gap-4 bg-gray-50/70 p-5 sm:p-8 lg:border-r lg:border-gray-100">
            {credentials.map((credential) => (
              <div key={credential.id} className="flex flex-col items-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <p className="mb-2 max-w-full truncate text-sm font-semibold text-gray-900">
                  {credential.name}
                </p>
                {credential.qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={credential.qrDataUrl}
                    alt={`QR de entrada de ${credential.name}`}
                    width={220}
                    height={220}
                    className={`rounded-2xl ${credential.checkedIn ? "opacity-40 grayscale" : ""}`}
                  />
                )}
                <p className={`mt-2 text-xs ${credential.checkedIn ? "font-medium text-blue-600" : "text-gray-400"}`}>
                  {credential.checkedIn ? "Check-in já realizado" : "Apresente este QR na entrada"}
                </p>
                {credential.code && (
                  <p className="mt-1 font-mono text-xs tracking-[0.2em] text-gray-400">{credential.code}</p>
                )}
              </div>
            ))}
          </div>
          <div className="p-5 text-left sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Resumo do pedido</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Pedido</dt><dd className="font-mono font-medium text-gray-900">{athleteOrderReference(ticketId)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Pagamento</dt><dd className="font-medium text-gray-900">{athletePaymentMethodLabel(paymentMethod)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Campeonato</dt><dd className="text-right font-medium text-gray-900">{championshipName}</dd></div>
              {categoryName && <div className="flex justify-between gap-4"><dt className="text-gray-500">Categoria</dt><dd className="text-right font-medium text-gray-900">{categoryName}</dd></div>}
            </dl>
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500">Credenciais enviadas para</p>
              <p className="mt-1 text-sm text-gray-900">{buyerName} · {buyerEmail}</p>
              <p className="mt-1 text-sm text-gray-900">{partnerName} · {partnerEmail}</p>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
              <p>Guarde este link privado e apresente o QR individual na entrada.</p>
              <p className="mt-1">Contato: {organizerPhone ? <a className="font-medium text-blue-600 hover:underline" href={`tel:${organizerPhone.replace(/\D/g, "")}`}>{organizerName ?? "Organizador"} · {organizerPhone}</a> : `${organizerName ?? "Organizador"} — consulte a página do campeonato.`}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-5 text-left sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sobre o campeonato</p>
          <p className="mt-2 font-semibold text-gray-900">{championshipName}</p>
          {championshipDateLabel && <p className="mt-2 flex items-center gap-2 text-sm text-gray-600"><CalendarDays className="size-4 shrink-0 text-gray-400" />{championshipDateLabel}</p>}
          {championshipLocationLabel && <p className="mt-2 flex items-center gap-2 text-sm text-gray-600"><MapPin className="size-4 shrink-0 text-gray-400" />{championshipLocationLabel}</p>}
          <Link href={championshipHref} className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">Ver página do campeonato</Link>
        </div>
        <p className="px-5 py-4 text-xs text-blue-600">Salve o link desta página para acessar depois.</p>
      </div>
    );
  }

  if (statusPagamento === "estornado" || statusPagamento === "expirado") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
        <AlertCircle className="mx-auto size-6 text-red-600" />
        <p className="mt-2 text-sm font-semibold text-red-900">Este ingresso foi cancelado</p>
        <p className="mt-1 text-xs text-red-700">Atualizando o histórico da compra…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {checkoutExpiresAt && (
        <ReservationCountdown
          key={`${ticketId}:${checkoutExpiresAt}`}
          id={ticketId}
          expiresAt={checkoutExpiresAt}
          serverNow={serverNow}
        />
      )}
      {postPaymentState === "analysis" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
          <Clock className="mx-auto size-6 text-amber-600" />
          <p className="mt-2 text-sm font-semibold text-amber-900">Pagamento em análise</p>
          <p className="mt-1 text-xs text-amber-800">O processador ainda não confirmou a cobrança. Atualizaremos esta página e enviaremos a credencial por e-mail assim que ela for aprovada.</p>
        </div>
      ) : paymentMethod === "pix" ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
            <Clock className="size-4" /> Aguardando pagamento
          </div>
          {pixQrBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${pixQrBase64}`} alt="QR Pix" width={220} height={220} className="rounded-2xl ring-1 ring-black/5" />
          ) : (
            <div className="flex size-[220px] items-center justify-center rounded-2xl bg-gray-100">
              <Clock className="size-10 text-gray-300" />
            </div>
          )}
          <p className="text-lg font-bold text-gray-900">{formatBRL(pixAmount)}</p>
          {pixCopyPaste && (
            <div className="flex w-full items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-black/5">
              <span className="flex-1 truncate font-mono text-xs text-gray-500">{pixCopyPaste}</span>
              <CopyButton text={pixCopyPaste} />
            </div>
          )}
          <p className="text-xs text-gray-400">
            Pague pelo app do seu banco. Assim que cair, a inscrição é confirmada e o QR de entrada aparece aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl bg-white p-5 text-left ring-1 ring-black/5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><CreditCard className="size-5" /></div>
            <div>
              <h2 className="font-semibold text-gray-900">Pagamento seguro no Asaas</h2>
              <p className="mt-1 text-sm text-gray-500">Os dados do cartão são informados diretamente no Asaas. A RankFTV não recebe nem armazena número ou CVV.</p>
            </div>
          </div>
          {invoiceUrl ? (
            <a href={invoiceUrl} className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
              Ir para o pagamento seguro
            </a>
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">Não foi possível preparar o checkout do cartão. Volte e tente novamente.</p>
          )}
        </div>
      )}
    </div>
  );
}
