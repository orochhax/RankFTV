"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";

export function SupportAttachmentUpload({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 4 MB.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("caseId", caseId);
      form.set("file", file);
      const response = await fetch("/api/admin/support-attachments", { method: "POST", body: form });
      if (response.ok) onDone();
      else setError("Não foi possível anexar o arquivo.");
    } catch {
      setError("Não foi possível anexar o arquivo.");
    } finally {
      setPending(false);
    }
  }
  return <div className="inline-flex flex-col items-start gap-1"><label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"><Paperclip className="size-3.5" />{pending ? "Enviando..." : "Anexar"}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /></label>{error ? <span role="alert" className="text-xs font-medium text-red-600">{error}</span> : null}</div>;
}
