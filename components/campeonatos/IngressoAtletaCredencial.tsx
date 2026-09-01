"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

type Props = {
  credentialId: string;
  accessToken: string;
  athleteName: string;
  initialPaymentStatus: string;
  initialCheckedIn: boolean;
  qrDataUrl: string | null;
  code: string;
};

export function IngressoAtletaCredencial({
  credentialId,
  accessToken,
  athleteName,
  initialPaymentStatus,
  initialCheckedIn,
  qrDataUrl,
  code,
}: Props) {
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    if (revoked || checkedIn || paymentStatus === "estornado" || paymentStatus === "expirado") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch("/api/athlete-credential-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: credentialId, token: accessToken }),
          cache: "no-store",
        });
        if (response.status === 404 && active) {
          setRevoked(true);
          return;
        }
        if (response.ok && active) {
          const data = await response.json();
          setPaymentStatus(String(data.status_pagamento ?? paymentStatus));
          setCheckedIn(Boolean(data.checked_in));
          if (data.checked_in || ["estornado", "expirado"].includes(data.status_pagamento)) return;
        }
      } catch {
        // Uma falha temporária não invalida a credencial; tenta novamente.
      }
      if (active) timer = setTimeout(poll, 3000);
    }

    timer = setTimeout(poll, 3000);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [accessToken, checkedIn, credentialId, paymentStatus, revoked]);

  if (revoked) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <XCircle className="mx-auto size-8 text-red-500" />
        <p className="mt-3 font-semibold text-red-800">Este link foi substituído</p>
        <p className="mt-1 text-sm text-red-600">Use a credencial mais recente enviada ao seu e-mail.</p>
      </div>
    );
  }

  if (paymentStatus === "estornado" || paymentStatus === "expirado") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <XCircle className="mx-auto size-8 text-red-500" />
        <p className="mt-3 font-semibold text-red-800">Credencial cancelada</p>
        <p className="mt-1 text-sm text-red-600">Este QR Code não pode mais ser utilizado.</p>
      </div>
    );
  }

  if (paymentStatus !== "pago") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <Clock3 className="mx-auto size-8 text-amber-500" />
        <p className="mt-3 font-semibold text-amber-800">Aguardando confirmação do pagamento</p>
        <p className="mt-1 text-sm text-amber-700">O QR será liberado automaticamente quando o pagamento for confirmado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl bg-white p-5 text-center ring-1 ring-black/5 sm:p-7">
      <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-600">
        <CheckCircle2 className="size-4" /> Inscrição confirmada
      </div>
      <p className="mt-3 text-base font-semibold text-gray-900">{athleteName}</p>
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt={`QR de entrada de ${athleteName}`}
          width={260}
          height={260}
          className={`mt-3 w-full max-w-[260px] rounded-2xl ${checkedIn ? "opacity-40 grayscale" : ""}`}
        />
      )}
      <p className={`mt-3 text-sm ${checkedIn ? "font-medium text-blue-600" : "text-gray-500"}`}>
        {checkedIn ? "Check-in já realizado" : "Apresente este QR na entrada do evento"}
      </p>
      <p className="mt-1 font-mono text-xs tracking-[0.2em] text-gray-400">{code}</p>
      <p className="mt-4 text-xs text-gray-400">Esta credencial é individual. Não compartilhe este link.</p>
    </div>
  );
}
