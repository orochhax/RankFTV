"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  formatReservationCountdown,
  reservationRemainingMs,
  reservationUrgency,
} from "@/lib/checkout-reservation-core";

type Props = {
  id: string;
  expiresAt: string;
  serverNow: string;
  onExpired?: () => void;
};

const MAX_RESERVATION_MS = 15 * 60 * 1000;

export function ReservationCountdown({ id, expiresAt, serverNow, onExpired }: Props) {
  const expiredRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  const [synchronized, setSynchronized] = useState(false);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(
    0,
    Date.parse(expiresAt) - Date.parse(serverNow),
  ));

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    const controller = new AbortController();
    let interval: number | undefined;
    expiredRef.current = false;

    async function synchronizeWithServer() {
      let freshServerNow = Date.now();
      try {
        const response = await fetch("/api/server-time", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("server_time_unavailable");
        const payload = await response.json() as { now?: unknown };
        const parsed = typeof payload.now === "string" ? Date.parse(payload.now) : Number.NaN;
        if (!Number.isFinite(parsed)) throw new Error("server_time_invalid");
        freshServerNow = parsed;
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("Não foi possível sincronizar o cronômetro com o servidor.", error);
      }

      if (controller.signal.aborted) return;
      const clientStartedAt = Date.now();
      const tick = () => setRemainingMs(Math.min(
        MAX_RESERVATION_MS,
        reservationRemainingMs(
          expiresAt,
          new Date(freshServerNow).toISOString(),
          Date.now(),
          clientStartedAt,
        ),
      ));
      tick();
      setSynchronized(true);
      interval = window.setInterval(tick, 1000);
    }

    void synchronizeWithServer();
    return () => {
      controller.abort();
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [expiresAt, id, serverNow]);
  const urgency = reservationUrgency(remainingMs);

  useEffect(() => {
    if (!synchronized || urgency !== "expired" || expiredRef.current) return;
    expiredRef.current = true;
    onExpiredRef.current?.();
  }, [synchronized, urgency]);

  const tone = urgency === "critical"
    ? "border-red-200 bg-red-50 text-red-800"
    : urgency === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-blue-100 bg-blue-50 text-blue-800";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Clock3 className="size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold">
            {urgency === "expired" ? "Prazo encerrado" : "Vaga reservada"}
          </p>
          <p className="text-[11px] opacity-80">
            {urgency === "expired"
              ? "Estamos conferindo o pagamento antes de liberar a vaga."
              : urgency === "critical"
                ? "Finalize agora para não perder a vaga."
                : urgency === "warning"
                  ? "Faltam menos de 5 minutos."
                  : "O prazo não reinicia ao voltar ou atualizar."}
          </p>
        </div>
      </div>
      <time
        dateTime={expiresAt}
        aria-live={urgency === "critical" ? "assertive" : "polite"}
        className="shrink-0 font-mono text-base font-bold tabular-nums"
      >
        {synchronized ? formatReservationCountdown(remainingMs) : "Sincronizando…"}
      </time>
    </div>
  );
}
