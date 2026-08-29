"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import QRCode from "qrcode";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatBRL } from "@/lib/format";

type Props = {
  ticketId: string;
  accessToken: string;
  initialStatusPagamento: string; // "pendente" | "pago" | "estornado"
  initialCheckedIn: boolean;
  initialEntradaQr: string | null; // já gerado no servidor se pago no load
  qrToken: string | null;
  code: string | null;
  quantidade: number;
  valor: number;
  pixCopyPaste: string | null;
  pixQrBase64: string | null;
};

// Mostra o Pix (pendente) ou o QR de entrada (pago). Faz polling do status a
// cada 3s enquanto pendente, e troca a tela sozinha assim que o pagamento é
// confirmado — sem precisar dar refresh na página.
export function IngressoPlateiaStatus({
  ticketId,
  accessToken,
  initialStatusPagamento,
  initialCheckedIn,
  initialEntradaQr,
  qrToken,
  code,
  quantidade,
  valor,
  pixCopyPaste,
  pixQrBase64,
}: Props) {
  const router = useRouter();
  const [statusPagamento, setStatusPagamento] = useState(initialStatusPagamento);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [entradaQr, setEntradaQr] = useState(initialEntradaQr);
  const stoppedRef = useRef(false);

  const pago = statusPagamento === "pago";

  useEffect(() => {
    if (statusPagamento !== "pendente") return;
    stoppedRef.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(`/api/ticket-status?tipo=plateia&id=${ticketId}&token=${accessToken}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const nextStatus = String(data.status_pagamento ?? "pendente");
          if (nextStatus !== "pendente") {
            stoppedRef.current = true;
            setStatusPagamento(nextStatus);
            setCheckedIn(!!data.checked_in);
            if (nextStatus === "pago" && qrToken) {
              const dataUrl = await QRCode.toDataURL(qrToken, {
                width: 280,
                margin: 2,
                color: { dark: "#000000", light: "#ffffff" },
                errorCorrectionLevel: "M",
              });
              setEntradaQr(dataUrl);
            }
            router.refresh();
            return;
          }
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
  }, [statusPagamento, ticketId, accessToken, qrToken, router]);

  if (pago) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600">
          <CheckCircle2 className="size-4" /> Ingresso confirmado
        </div>
        {entradaQr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entradaQr} alt="QR de entrada" width={220} height={220} className={`rounded-2xl ${checkedIn ? "opacity-40 grayscale" : ""}`} />
        )}
        <p className="text-xs text-gray-400">
          {checkedIn
            ? "Check-in já realizado"
            : quantidade > 1
              ? `Apresente este QR na entrada — admite ${quantidade} pessoas`
              : "Apresente este QR na entrada do evento"}
        </p>
        {code && (
          <p className="font-mono text-xs tracking-[0.2em] text-gray-400">{code}</p>
        )}
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
      <p className="text-lg font-bold text-gray-900">{formatBRL(Number(valor))}</p>
      {pixCopyPaste && (
        <div className="flex w-full items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-black/5">
          <span className="flex-1 truncate font-mono text-xs text-gray-500">{pixCopyPaste}</span>
          <CopyButton text={pixCopyPaste} />
        </div>
      )}
      <p className="text-xs text-gray-400">
        Pague pelo app do seu banco. Assim que cair, o ingresso é confirmado e o QR de entrada aparece aqui automaticamente.
      </p>
    </div>
  );
}
