"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-left transition-colors hover:bg-blue-100"
    >
      <span className="min-w-0 flex-1 truncate text-xs text-blue-700">{link}</span>
      {copiado ? (
        <Check className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="size-4 shrink-0 text-blue-500" />
      )}
    </button>
  );
}
