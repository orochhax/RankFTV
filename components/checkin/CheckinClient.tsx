"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrCode, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { markCheckin } from "@/app/actions/checkin";

// Carrega o scanner só no client (usa APIs do navegador)
const QrScanner = dynamic(
  () => import("./QrScanner").then((m) => m.QrScanner),
  { ssr: false },
);

type ToastType = "success" | "already" | "error";
interface Toast {
  type: ToastType;
  message: string;
}

export function CheckinClient({ championshipId }: { championshipId: string }) {
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToken = (token: string) => {
    setScanning(false);
    if (!token.trim()) return;
    startTransition(async () => {
      const result = await markCheckin(token, championshipId);
      if ("ok" in result) {
        showToast("success", `✓  ${result.nome} confirmado!`);
      } else if ("alreadyDone" in result) {
        showToast("already", `${result.nome} já estava confirmado.`);
      } else {
        showToast("error", result.error);
      }
      router.refresh();
    });
  };

  const TOAST_STYLE: Record<ToastType, string> = {
    success: "bg-blue-500 text-white",
    already: "bg-amber-500 text-white",
    error: "bg-red-500 text-white",
  };
  const TOAST_ICON: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="size-5 shrink-0" />,
    already: <AlertCircle className="size-5 shrink-0" />,
    error: <XCircle className="size-5 shrink-0" />,
  };

  return (
    <>
      {/* Scanner de câmera (fullscreen) */}
      {scanning && (
        <QrScanner
          onDetected={handleToken}
          onClose={() => setScanning(false)}
        />
      )}

      {/* Toast de resultado */}
      {toast && (
        <div
          className={`fixed left-4 right-4 top-4 z-40 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl transition-all ${TOAST_STYLE[toast.type]}`}
        >
          {TOAST_ICON[toast.type]}
          {toast.message}
        </div>
      )}

      {/* Painel de ação */}
      <div className="space-y-3">
        {/* Botão principal — abre câmera */}
        <button
          onClick={() => setScanning(true)}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gray-900 py-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <QrCode className="size-5" />
          )}
          {isPending ? "Validando..." : "Escanear QR code"}
        </button>

        {/* Separador */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-100" />
          ou digite o código manualmente
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        {/* Campo manual */}
        <div className="flex gap-2">
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualToken.trim()) handleToken(manualToken.trim());
            }}
            placeholder="Cole ou digite o código do QR"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            disabled={!manualToken.trim() || isPending}
            onClick={() => {
              handleToken(manualToken.trim());
              setManualToken("");
            }}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
          >
            OK
          </button>
        </div>
      </div>
    </>
  );
}
