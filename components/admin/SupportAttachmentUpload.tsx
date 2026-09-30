"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { confirmarAnexoSuporte, prepararAnexoSuporte } from "@/app/admin/suporte/actions";

export function SupportAttachmentUpload({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  async function upload(file: File) {
    setPending(true);
    const prepared = await prepararAnexoSuporte({ caseId, name: file.name, type: file.type, size: file.size });
    if (prepared.ok) {
      const { error } = await createClient().storage.from("support-attachments").uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
      if (!error) await confirmarAnexoSuporte({ caseId, path: prepared.path, name: file.name, type: file.type, size: file.size });
      onDone();
    }
    setPending(false);
  }
  return <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700"><Paperclip className="size-3.5" />{pending ? "Enviando..." : "Anexar"}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>;
}
