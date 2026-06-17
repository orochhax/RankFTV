"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ConquistaOpcao = {
  id: string;
  titulo: string;
  icone: string | null;
  destaque_ordem: number | null;
};

const NUM_SLOTS = 3;

// Deixa o usuário escolher quais 4 conquistas aparecem na Home e em qual
// posição. Grava `destaque_ordem` (1..4) em cada conquista; as demais ficam
// NULL. Ver supabase/perfil_desempenho.sql.
export function ConquistasDestaqueSelector({
  userId,
  conquistas,
}: {
  userId: string;
  conquistas: ConquistaOpcao[];
}) {
  const supabase = createClient();
  const router = useRouter();

  // slots[i] = id da conquista escolhida pra posição i+1 (ou null = vazio)
  const inicial: (string | null)[] = Array.from({ length: NUM_SLOTS }, (_, i) => {
    const escolhida = conquistas.find((c) => c.destaque_ordem === i + 1);
    return escolhida?.id ?? null;
  });

  const [slots, setSlots] = useState<(string | null)[]>(inicial);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSlot(index: number, id: string | null) {
    setSlots((prev) => {
      const next = [...prev];
      // Se essa conquista já estava em outro slot, esvazia o antigo (sem repetir).
      if (id) {
        const jaUsada = next.indexOf(id);
        if (jaUsada !== -1) next[jaUsada] = null;
      }
      next[index] = id;
      return next;
    });
    setSuccess(false);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // 1) zera o destaque de todas as conquistas do usuário
    const { error: clearError } = await supabase
      .from("conquistas")
      .update({ destaque_ordem: null })
      .eq("user_id", userId);

    if (clearError) {
      setError("Erro ao salvar. Tente novamente.");
      setLoading(false);
      return;
    }

    // 2) marca cada slot preenchido com a posição (1..4)
    for (let i = 0; i < slots.length; i++) {
      const id = slots[i];
      if (!id) continue;
      const { error: setError2 } = await supabase
        .from("conquistas")
        .update({ destaque_ordem: i + 1 })
        .eq("id", id)
        .eq("user_id", userId);
      if (setError2) {
        setError("Erro ao salvar. Tente novamente.");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 3000);
  }

  if (conquistas.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-500">
          Conquistas em destaque
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Você ainda não tem conquistas. Elas aparecem aqui conforme você
          participa de campeonatos.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-gray-500">
        Conquistas em destaque
      </h2>
      <p className="mt-1 text-xs text-gray-400">
        Escolha até 4 conquistas e a ordem em que aparecem na Home.
      </p>

      <div className="mt-4 space-y-3">
        {slots.map((selecionada, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
              {i + 1}
            </span>
            <select
              value={selecionada ?? ""}
              onChange={(e) => setSlot(i, e.target.value || null)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— vazio —</option>
              {conquistas.map((c) => {
                // desabilita se já estiver escolhida em OUTRO slot
                const usadaEmOutro =
                  slots.includes(c.id) && selecionada !== c.id;
                return (
                  <option key={c.id} value={c.id} disabled={usadaEmOutro}>
                    {(c.icone ?? "🏆") + " " + c.titulo}
                  </option>
                );
              })}
            </select>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {success && <Check className="size-4" />}
        {success ? "Salvo!" : "Salvar destaques"}
      </button>
    </section>
  );
}
