"use client";

import { useEffect, useRef, useState } from "react";
import { X, QrCode, AlertCircle } from "lucide-react";

interface Props {
  onDetected: (token: string) => void;
  onClose: () => void;
}

// Usa a BarcodeDetector API nativa (Chrome/Edge/Safari 16.4+).
// Em navegadores sem suporte mostra apenas o campo manual.
export function QrScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"requesting" | "scanning" | "unsupported" | "denied">(() =>
    typeof window !== "undefined" && !("BarcodeDetector" in window) ? "unsupported" : "requesting",
  );
  const detectedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !("BarcodeDetector" in window)) return;

    let stream: MediaStream | null = null;
    let rafId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPhase("scanning");

        const scan = async () => {
          if (detectedRef.current) return;
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const codes: any[] = await detector.detect(videoRef.current);
              if (codes.length > 0 && !detectedRef.current) {
                detectedRef.current = true;
                onDetected(codes[0].rawValue as string);
                return;
              }
            } catch {
              // frame inválido — continua tentando
            }
          }
          rafId = requestAnimationFrame(scan);
        };
        rafId = requestAnimationFrame(scan);
      } catch {
        setPhase("denied");
      }
    })();

    return () => {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Barra superior */}
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

      {/* Câmera + overlay */}
      {(phase === "requesting" || phase === "scanning") && (
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {/* Moldura central */}
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

      {/* Sem suporte */}
      {(phase === "unsupported" || phase === "denied") && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-white/10">
            {phase === "unsupported" ? (
              <QrCode className="size-8 text-white/40" />
            ) : (
              <AlertCircle className="size-8 text-amber-400" />
            )}
          </div>
          <p className="text-sm text-white/60">
            {phase === "unsupported"
              ? "Seu navegador não suporta leitura de QR automaticamente. Use o campo de código manual abaixo."
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
