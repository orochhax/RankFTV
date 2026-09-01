"use client";

import { useEffect, useRef, useState } from "react";
import { X, QrCode, AlertCircle } from "lucide-react";
import QrScannerEngine from "qr-scanner";

interface Props {
  onDetected: (token: string) => void;
  onClose: () => void;
}

// O qr-scanner usa BarcodeDetector quando disponível e recorre ao seu
// decodificador Web Worker nos navegadores sem essa API, incluindo iOS.
export function QrScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"requesting" | "scanning" | "denied" | "unavailable">("requesting");
  const detectedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unavailable");
      return;
    }

    detectedRef.current = false;
    const scanner = new QrScannerEngine(
      video,
      (result) => {
        if (detectedRef.current) return;
        detectedRef.current = true;
        scanner.stop();
        onDetected(result.data);
      },
      {
        preferredCamera: "environment",
        maxScansPerSecond: 10,
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: false,
      },
    );

    void scanner.start()
      .then(() => setPhase("scanning"))
      .catch((error: unknown) => {
        const detail = error instanceof Error ? `${error.name} ${error.message}` : String(error);
        setPhase(/notallowed|permission|denied/i.test(detail) ? "denied" : "unavailable");
      });

    return () => {
      scanner.destroy();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-sm font-medium text-white/80">
          {phase === "scanning" ? "Aponte para o QR code do atleta" : "Leitor de QR code"}
        </p>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Fechar scanner"
        >
          <X className="size-5" />
        </button>
      </div>

      {(phase === "requesting" || phase === "scanning") && (
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="size-60 rounded-3xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>
          {phase === "scanning" && (
            <p className="absolute bottom-10 left-0 right-0 text-center text-xs text-white/50">
              Buscando QR code...
            </p>
          )}
        </div>
      )}

      {(phase === "unavailable" || phase === "denied") && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-white/10">
            {phase === "unavailable" ? (
              <QrCode className="size-8 text-white/40" />
            ) : (
              <AlertCircle className="size-8 text-amber-400" />
            )}
          </div>
          <p className="text-sm text-white/60">
            {phase === "unavailable"
              ? "Não foi possível abrir uma câmera neste aparelho. Use o campo de código manual abaixo."
              : "Câmera bloqueada. Permita o acesso à câmera nas configurações do navegador ou use o campo de código manual abaixo."}
          </p>
          <button
            onClick={onClose}
            className="rounded-2xl bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20"
          >
            Fechar e digitar o código
          </button>
        </div>
      )}
    </div>
  );
}
