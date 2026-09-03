"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Download, XCircle } from "lucide-react";
import { substituirCredencialComprometida } from "@/app/campeonatos/[id]/ingresso-atleta/[credentialId]/actions";

type Props = {
  credentialId: string;
  athleteName: string;
  initialPaymentStatus: string;
  initialCheckedIn: boolean;
  qrDataUrl: string | null;
  code: string;
  championshipId: string;
  championshipName: string;
  categoryName: string | null;
};

export function IngressoAtletaCredencial({
  credentialId,
  athleteName,
  initialPaymentStatus,
  initialCheckedIn,
  qrDataUrl,
  code,
  championshipId,
  championshipName,
  categoryName,
}: Props) {
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [revoked, setRevoked] = useState(false);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationPending, startOperation] = useTransition();

  async function downloadPdf() {
    if (!qrDataUrl) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("RankFTV", 20, 24);
    pdf.setFontSize(16);
    pdf.text("Credencial individual de atleta", 20, 38);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.text(athleteName, 20, 50);
    pdf.text(championshipName, 20, 59);
    if (categoryName) pdf.text(`Categoria: ${categoryName}`, 20, 68);
    pdf.addImage(qrDataUrl, "PNG", 55, 80, 100, 100);
    pdf.setFont("courier", "bold");
    pdf.text(code, 105, 190, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Apresente o QR atualizado na entrada. Esta credencial é individual.", 105, 202, { align: "center" });
    pdf.save(`credencial-${athleteName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  }

  function replaceCredential() {
    setOperationError(null);
    startOperation(async () => {
      const result = await substituirCredencialComprometida({ championshipId, credentialId });
      if (!result.ok) { setOperationError(result.error ?? "Não foi possível substituir."); return; }
      setOperationMessage("Novo link enviado ao e-mail cadastrado. Esta página deixará de funcionar.");
      setConfirmReplacement(false);
      setRevoked(true);
    });
  }

  useEffect(() => {
    if (revoked || checkedIn || paymentStatus === "estornado" || paymentStatus === "expirado") return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch("/api/athlete-credential-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: credentialId }),
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
  }, [checkedIn, credentialId, paymentStatus, revoked]);

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
      <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
        <button type="button" onClick={downloadPdf} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
          <Download className="size-4" /> Baixar PDF
        </button>
        <button type="button" onClick={() => setConfirmReplacement(true)} disabled={checkedIn} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-700 disabled:opacity-40">
          <AlertTriangle className="size-4" /> Proteger meu ingresso
        </button>
      </div>
      {operationError && <p role="alert" className="mt-3 w-full rounded-xl bg-red-50 p-3 text-sm text-red-700">{operationError}</p>}
      {operationMessage && <p className="mt-3 w-full rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{operationMessage}</p>}
      {confirmReplacement && (
        <div className="mt-3 w-full rounded-xl bg-amber-50 p-4 text-left ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-900">Gerar uma nova credencial?</p>
          <p className="mt-1 text-xs text-amber-800">Use esta proteção se perdeu o ingresso ou compartilhou o link com outra pessoa. O link, o QR e o código atuais deixarão de funcionar, e uma nova credencial será enviada somente ao e-mail cadastrado.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={replaceCredential} disabled={operationPending} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{operationPending ? "Protegendo..." : "Sim, substituir"}</button>
            <button type="button" onClick={() => setConfirmReplacement(false)} disabled={operationPending} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-700">Cancelar</button>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-gray-400">Esta credencial é individual. Não compartilhe este link.</p>
    </div>
  );
}
