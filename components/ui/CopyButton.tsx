"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-700 transition-colors"
      aria-label="Copiar código Pix"
    >
      {copied ? <Check className="size-4 text-blue-500" /> : <Copy className="size-4" />}
    </button>
  );
}
