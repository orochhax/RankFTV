"use client";

import { useEffect, useState } from "react";

export function OperationalDelay({ scheduledAt, status }: { scheduledAt: string | null; status: string }) {
  const [minutes, setMinutes] = useState<number | null>(null);
  useEffect(() => {
    if (!scheduledAt || !["scheduled", "called"].includes(status)) return;
    const update = () => setMinutes(Math.max(0, Math.floor((Date.now() - Date.parse(scheduledAt)) / 60_000)));
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [scheduledAt, status]);
  if (!minutes || minutes < 10) return null;
  return <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">Atraso de {minutes} min</span>;
}
