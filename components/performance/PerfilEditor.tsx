"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil } from "lucide-react";
import { salvarPerfil } from "@/app/admin/performance/actions";

type Props = {
  alturaCm: number | null;
  dataNascimento: string | null;
  lado: string | null;
  peDominante: string | null;
  pesoAtual: number | null;
  // Preservados em campos ocultos pra não serem apagados no upsert.
  pesoMeta: number | null;
  ratingMeta: number | null;
  treinosSemanaMeta: number | null;
};

export function PerfilEditor(p: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function action(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const res = await salvarPerfil(formData);
      if (res.ok) { setAberto(false); router.refresh(); }
      else setErro(res.error ?? "Erro ao salvar.");
    });
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
      >
        <Pencil className="size-3.5" /> Editar dados
      </button>
    );
  }

  const input = "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const label = "block text-xs font-medium text-white/50";

  return (
    <form action={action} className="w-full space-y-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <input type="hidden" name="peso_meta" value={p.pesoMeta ?? ""} />
      <input type="hidden" name="rating_meta" value={p.ratingMeta ?? ""} />
      <input type="hidden" name="treinos_semana_meta" value={p.treinosSemanaMeta ?? ""} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Altura (cm)</label>
          <input name="altura_cm" type="number" min={0} defaultValue={p.alturaCm ?? undefined} placeholder="178" className={input} />
        </div>
        <div>
          <label className={label}>Peso atual (kg)</label>
          <input name="peso_atual" type="number" step="any" min={0} defaultValue={p.pesoAtual ?? undefined} placeholder="82" className={input} />
        </div>
        <div>
          <label className={label}>Nascimento</label>
          <input name="data_nascimento" type="date" defaultValue={p.dataNascimento ?? undefined} className={input} />
        </div>
        <div>
          <label className={label}>Lado que joga</label>
          <select name="lado" defaultValue={p.lado ?? ""} className={`${input} [&>option]:text-gray-900`}>
            <option value="">—</option>
            <option value="direita">Direita</option>
            <option value="esquerda">Esquerda</option>
          </select>
        </div>
        <div>
          <label className={label}>Pé dominante</label>
          <select name="pe_dominante" defaultValue={p.peDominante ?? ""} className={`${input} [&>option]:text-gray-900`}>
            <option value="">—</option>
            <option value="direito">Direito</option>
            <option value="esquerdo">Esquerdo</option>
          </select>
        </div>
      </div>

      {erro && <p className="text-xs text-red-300">{erro}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Salvar
        </button>
        <button type="button" onClick={() => setAberto(false)}
          className="rounded-xl px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/10">
          Cancelar
        </button>
      </div>
    </form>
  );
}
