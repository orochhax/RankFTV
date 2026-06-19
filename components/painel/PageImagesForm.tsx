"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Check, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { atualizarImagensPagina } from "@/app/painel/paginas/[id]/editar/actions";

type SavedState = "idle" | "saving" | "saved";

function useImageUpload(
  pageId: string,
  field: "avatar_url" | "banner_url",
  initialUrl: string | null,
) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [state, setState] = useState<SavedState>("idle");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Imagem deve ter no máximo 5 MB."); return; }
    setError("");
    setState("saving");
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${pageId}/${field}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("page-images")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setError("Erro ao enviar imagem."); setState("idle"); return; }
    const { data: { publicUrl } } = supabase.storage.from("page-images").getPublicUrl(path);
    startTransition(async () => {
      const res = await atualizarImagensPagina(pageId, { [field]: publicUrl });
      if (res.ok) { setPreview(publicUrl); setState("saved"); setTimeout(() => setState("idle"), 2500); }
      else { setError(res.error ?? "Erro ao salvar."); setState("idle"); }
    });
  }

  async function handleRemove() {
    setError("");
    setState("saving");
    startTransition(async () => {
      const res = await atualizarImagensPagina(pageId, { [field]: "" });
      if (res.ok) { setPreview(null); setState("saved"); setTimeout(() => setState("idle"), 2500); }
      else { setError(res.error ?? "Erro ao remover."); setState("idle"); }
    });
  }

  function openPicker() { inputRef.current?.click(); }

  return { inputRef, preview, state, error, handleFile, handleRemove, openPicker };
}

export function PageImagesForm({
  pageId,
  initialAvatarUrl,
  initialBannerUrl,
  pageName,
  bannerFrom,
  bannerTo,
}: {
  pageId: string;
  initialAvatarUrl: string | null;
  initialBannerUrl: string | null;
  pageName: string;
  bannerFrom: string;
  bannerTo: string;
}) {
  const avatar = useImageUpload(pageId, "avatar_url", initialAvatarUrl);
  const banner = useImageUpload(pageId, "banner_url", initialBannerUrl);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [bannerMenu, setBannerMenu] = useState(false);

  return (
    <div className="space-y-3">

      {/* Banner */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <div className={`relative h-28 w-full bg-gradient-to-br ${bannerFrom} ${bannerTo}`}>
          {banner.preview && (
            <Image src={banner.preview} alt="Banner" fill className="object-cover" sizes="100vw" />
          )}
          {banner.state === "saving" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          )}
          {banner.state === "saved" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Check className="size-6 text-white" />
            </div>
          )}
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Banner</p>
            <p className="text-xs text-gray-400">{banner.preview ? "Banner personalizado" : "Usando gradiente padrão"}</p>
          </div>
          <button
            type="button"
            onClick={() => { setBannerMenu(!bannerMenu); setAvatarMenu(false); }}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Pencil className="size-3.5" />
            Editar
          </button>
        </div>

        {bannerMenu && (
          <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={() => { banner.openPicker(); setBannerMenu(false); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <ImagePlus className="size-4" />
              {banner.preview ? "Alterar banner" : "Adicionar banner"}
            </button>
            {banner.preview && (
              <button
                type="button"
                onClick={() => { banner.handleRemove(); setBannerMenu(false); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="size-4" />
                Remover
              </button>
            )}
            <button
              type="button"
              onClick={() => setBannerMenu(false)}
              className="flex items-center justify-center rounded-xl bg-gray-100 px-3 py-2.5 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {banner.error && <p className="px-4 pb-3 text-xs text-red-600">{banner.error}</p>}

        <input
          ref={banner.inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) banner.handleFile(f); e.target.value = ""; }}
        />
      </div>

      {/* Foto de perfil */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative size-14 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 shrink-0">
              {avatar.preview ? (
                <Image src={avatar.preview} alt={pageName} fill className="object-cover" sizes="56px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-xl font-bold text-gray-500">{pageName.charAt(0)}</span>
                </div>
              )}
              {avatar.state === "saving" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-4 animate-spin text-white" />
                </div>
              )}
              {avatar.state === "saved" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Check className="size-4 text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Foto de perfil</p>
              <p className="text-xs text-gray-400">{avatar.preview ? "Foto personalizada" : "Sem foto"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setAvatarMenu(!avatarMenu); setBannerMenu(false); }}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Pencil className="size-3.5" />
            Editar
          </button>
        </div>

        {avatarMenu && (
          <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={() => { avatar.openPicker(); setAvatarMenu(false); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Camera className="size-4" />
              {avatar.preview ? "Alterar foto" : "Adicionar foto"}
            </button>
            {avatar.preview && (
              <button
                type="button"
                onClick={() => { avatar.handleRemove(); setAvatarMenu(false); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="size-4" />
                Remover
              </button>
            )}
            <button
              type="button"
              onClick={() => setAvatarMenu(false)}
              className="flex items-center justify-center rounded-xl bg-gray-100 px-3 py-2.5 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {avatar.error && <p className="px-4 pb-3 text-xs text-red-600">{avatar.error}</p>}

        <input
          ref={avatar.inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) avatar.handleFile(f); e.target.value = ""; }}
        />
      </div>

      <p className="text-xs text-gray-400 px-1">Formatos aceitos: JPG, PNG, WebP · Máx. 5 MB</p>
    </div>
  );
}
