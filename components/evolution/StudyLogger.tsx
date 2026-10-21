"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock3, Pause, Play } from "lucide-react";

export function StudyLogger({ today, onSave }: { today: string; onSave: (formData: FormData) => Promise<void> }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const stopTimer = () => {
    if (!startedAt) return;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60_000));
    const data = new FormData();
    data.set("studyDate", today);
    data.set("minutes", String(minutes));
    data.set("source", "timer");
    startTransition(async () => {
      try {
        await onSave(data);
        setMessage(`${minutes} min registrados.`);
        setStartedAt(null);
        setElapsed(0);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível registrar.");
      }
    });
  };

  const seconds = Math.floor(elapsed / 1000);
  const timerLabel = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="evo-study-logger">
      <div className="evo-timer">
        <Clock3 size={20} /><strong>{startedAt ? timerLabel : "00:00:00"}</strong>
        {startedAt ? (
          <button type="button" onClick={stopTimer} disabled={pending}><Pause size={16} /> Encerrar e salvar</button>
        ) : (
          <button type="button" onClick={() => { setMessage(""); setStartedAt(Date.now()); }}><Play size={16} /> Iniciar foco</button>
        )}
      </div>
      <form action={onSave} className="evo-inline-form">
        <input type="hidden" name="studyDate" value={today} />
        <input type="hidden" name="source" value="manual" />
        <label>Adicionar manualmente <input name="minutes" type="number" min="1" max="1440" defaultValue="120" aria-label="Minutos estudados" /></label>
        <button type="submit">Registrar minutos</button>
      </form>
      {message ? <p className="evo-form-message" role="status">{message}</p> : null}
    </div>
  );
}
