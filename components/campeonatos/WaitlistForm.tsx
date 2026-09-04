"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { entrarNaListaEspera } from "@/app/campeonatos/[id]/lista-espera/actions";

export function WaitlistForm({ championshipId, categoryId }: { championshipId: string; categoryId: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit() {
    setPending(true);
    const result = await entrarNaListaEspera({ championshipId, categoryId, email, consent });
    setMessage({ ok: result.ok, text: result.ok ? `Você entrou na posição ${result.position ?? 1}. Avisaremos se surgir uma vaga.` : result.error ?? "Não foi possível entrar." });
    setPending(false);
  }
  return (
    <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900"><Mail className="size-3.5" />Entrar na lista de espera</p>
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900" />
      <label className="mt-2 flex items-start gap-2 text-[11px] text-amber-900"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" />Aceito receber por e-mail um convite temporário quando houver vaga. Posso sair da lista a qualquer momento.</label>
      <button type="button" onClick={submit} disabled={pending || !email || !consent} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{pending && <Loader2 className="size-3 animate-spin" />}Entrar na fila</button>
      {message && <p role="status" className={`mt-2 text-xs ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>}
    </div>
  );
}
