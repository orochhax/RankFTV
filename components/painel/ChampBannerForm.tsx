"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Check, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { atualizarBannerCampeonato } from "@/app/painel/campeonatos/[id]/editar/actions";

type State = "idle" | "saving" | "saved";

export function ChampBannerForm({
  champId,
  initialBannerUrl,
  bannerFrom,
  bannerTo,
}: {
  champId: string;
  initialBannerUrl: string | null;
  bannerFrom: string;
  bannerTo: string;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialBannerUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Máximo 5 MB."); return; }
    setError("");
    setState("saving");
    setMenuOpen(false);

    const path = `champ-banners/${champId}-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
    const { data, error: uploadErr } = await supabase.storage
      .from("page-images")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) { setError("Erro ao enviar imagem."); setState("idle"); return; }

    const { data: { publicUrl } } = supabase.storage.from("page-images").getPublicUrl(data.path);

    startTransition(async () => {
      const res = await atualizarBannerCampeonato(champId, publicUrl);
      if (res.ok) { setPreview(publicUrl); setState("saved"); setTimeout(() => setState("idle"), 2500); }
      else { setError(res.error ?? "Erro ao salvar."); setState("idle"); }
    });
  }

  function handleRemove() {
    setMenuOpen(false);
    setState("saving");
    startTransition(async () => {
      const res = await atualizarBannerCampeonato(champId, null);
      if (res.ok) { setPreview(null); setState("saved"); setTimeout(() => setState("idle"), 2500); }
      else { setError(res.error ?? "Erro ao remover."); setState("idle"); }
    });
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
      {/* Preview */}
      <div className={`relative h-32 w-full bg-gradient-to-br ${bannerFrom} ${bannerTo}`}>
        {preview && <Image src={preview} alt="Banner" fill className="object-cover" sizes="100vw" />}
        {state === "saving" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
        {state === "saved" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Check className="size-6 text-white" />
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Banner</p>
          <p className="text-xs text-gray-400">{preview ? "Banner personalizado" : "Usando gradiente padrão"}</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Pencil className="size-3.5" /> Editar
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
          <button
            type="button"
            onClick={() => { inputRef.current?.click(); setMenuOpen(false); }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <ImagePlus className="size-4" />
            {preview ? "Alterar banner" : "Adicionar banner"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="size-4" /> Remover
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center rounded-xl bg-gray-100 px-3 py-2.5 text-gray-500 hover:bg-gray-200"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {error && <p className="px-4 pb-3 text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
