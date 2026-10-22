"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Clock3, Pause, Play, Save, X } from "lucide-react";

export function StudyLogger({ today, onSave }: { today: string; onSave: (formData: FormData) => Promise<void> }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState("1");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const requestSave = () => {
    const currentElapsed = startedAt ? Date.now() - startedAt : elapsed;
    setElapsed(currentElapsed);
    setStartedAt(null);
    setDraftMinutes(String(Math.max(1, Math.round(currentElapsed / 60_000))));
    setConfirming(true);
    setMessage("");
  };

  const confirmSave = () => {
    const minutes = Math.max(1, Math.min(1440, Number.parseInt(draftMinutes, 10) || 1));
    const data = new FormData();
    data.set("studyDate", today);
    data.set("minutes", String(minutes));
    data.set("source", "timer");
    startTransition(async () => {
      try {
        await onSave(data);
        setMessage(`${minutes} min registrados.`);
        setElapsed(0);
        setConfirming(false);
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
          <><button type="button" onClick={() => { setElapsed(Date.now() - startedAt); setStartedAt(null); }}><Pause size={16} /> Pausar</button><button type="button" onClick={requestSave} disabled={pending}><Save size={16} /> Salvar tempo</button></>
        ) : elapsed > 0 ? (
          <><button type="button" onClick={() => setStartedAt(Date.now() - elapsed)}><Play size={16} /> Retomar</button><button type="button" onClick={requestSave} disabled={pending}><Save size={16} /> Salvar tempo</button></>
        ) : (
          <button type="button" onClick={() => { setMessage(""); setStartedAt(Date.now()); }}><Play size={16} /> Iniciar foco</button>
        )}
      </div>
      {confirming ? <div className="evo-save-card" role="dialog" aria-modal="true" aria-labelledby="evo-save-title"><div><p className="evo-eyebrow">CONFIRMAÇÃO</p><h3 id="evo-save-title">Salvar este tempo de estudo?</h3><p>Confira o tempo antes de registrar. Você pode editar os minutos.</p></div><label>Minutos estudados<input type="number" min="1" max="1440" value={draftMinutes} onChange={(event) => setDraftMinutes(event.target.value)} /></label><div className="evo-save-actions"><button type="button" className="evo-secondary-button" onClick={() => setConfirming(false)}><X size={15} /> Cancelar</button><button type="button" onClick={confirmSave} disabled={pending}><Check size={15} /> Confirmar e salvar</button></div></div> : null}
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
