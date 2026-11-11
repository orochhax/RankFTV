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
      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-brand-border bg-brand-soft px-4 py-3 text-left transition-colors hover:bg-brand-soft/75"
    >
      <span className="min-w-0 flex-1 truncate text-xs text-brand-ink">{link}</span>
      {copiado ? (
        <Check className="size-4 shrink-0 text-brand" />
      ) : (
        <Copy className="size-4 shrink-0 text-brand" />
      )}
    </button>
  );
}
