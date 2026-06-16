"use client";

import { useState } from "react";

// Único pedacinho interativo da página de detalhe — por isso é o único
// Client Component aqui (convenção do ftv.md seção 9). Pagamento e convite
// de dupla de verdade entram na Fase 1, junto com o Supabase/Asaas.
export function InscricaoButton({ categoriaNome }: { categoriaNome: string }) {
  const [avisoVisivel, setAvisoVisivel] = useState(false);

  return (
    <div>
      <button
        onClick={() => setAvisoVisivel(true)}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Inscrever dupla — {categoriaNome}
      </button>
      {avisoVisivel && (
        <p className="mt-2 text-sm text-amber-700">
          🚧 Convite de dupla e pagamento ainda não estão de pé — chegam numa próxima etapa.
        </p>
      )}
    </div>
  );
}
