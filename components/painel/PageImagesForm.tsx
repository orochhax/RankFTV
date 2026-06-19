"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Check, X } from "lucide-react";
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
      if (res.ok) {
        setPreview(publicUrl);
        setState("saved");
        setTimeout(() => setState("idle"), 2500);
      } else {
        setError(res.error ?? "Erro ao salvar.");
        setState("idle");
      }
    });
  }

  async function handleRemove() {
    setError("");
    setState("saving");
    startTransition(async () => {
      const res = await atualizarImagensPagina(pageId, { [field]: "" });
      if (res.ok) {
        setPreview(null);
        setState("saved");
        setTimeout(() => setState("idle"), 2500);
      } else {
        setError(res.error ?? "Erro ao remover.");
        setState("idle");
      }
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

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">

      {/* Banner */}
      <div className={`relative h-32 w-full group bg-gradient-to-br ${bannerFrom} ${bannerTo}`}>
        {banner.preview && (
          <Image src={banner.preview} alt="Banner" fill className="object-cover" sizes="100vw" />
        )}

        {/* Overlay com ações */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          {banner.state === "saving" ? (
            <Loader2 className="size-7 animate-spin text-white" />
          ) : banner.state === "saved" ? (
            <Check className="size-7 text-white" />
          ) : (
            <>
              <button
                type="button"
                onClick={banner.openPicker}
                className="flex flex-col items-center gap-1 text-white hover:scale-105 transition-transform"
              >
                <ImagePlus className="size-6" />
                <span className="text-xs font-medium">{banner.preview ? "Trocar" : "Adicionar"} banner</span>
              </button>
              {banner.preview && (
                <button
                  type="button"
                  onClick={banner.handleRemove}
                  className="flex flex-col items-center gap-1 text-white/80 hover:text-red-300 hover:scale-105 transition-all"
                >
                  <X className="size-5" />
                  <span className="text-xs font-medium">Remover</span>
                </button>
              )}
            </>
          )}
        </div>

        <input
          ref={banner.inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) banner.handleFile(f); e.target.value = ""; }}
        />
      </div>

      {/* Avatar + info */}
      <div className="px-5 pb-5">
        <div className="flex items-end gap-4 -mt-8 mb-3">

          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className="size-16 rounded-2xl ring-4 ring-white overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
              {avatar.preview ? (
                <Image src={avatar.preview} alt={pageName} fill className="object-cover" sizes="64px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-2xl font-bold text-gray-500">{pageName.charAt(0)}</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                {avatar.state === "saving" ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : avatar.state === "saved" ? (
                  <Check className="size-4 text-white" />
                ) : (
                  <Camera className="size-4 text-white" />
                )}
              </div>
            </div>

            {/* Botões abaixo do avatar, visíveis no hover do container */}
            {avatar.state === "idle" && (
              <div className="absolute -bottom-6 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                <button
                  type="button"
                  onClick={avatar.openPicker}
                  className="rounded-md bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-gray-700"
                >
                  {avatar.preview ? "Trocar" : "Adicionar"}
                </button>
                {avatar.preview && (
                  <button
                    type="button"
                    onClick={avatar.handleRemove}
                    className="rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600"
                  >
                    Remover
                  </button>
                )}
              </div>
            )}

            <input
              ref={avatar.inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) avatar.handleFile(f); e.target.value = ""; }}
            />
          </div>

          <div className="mb-1 text-xs text-gray-400">
            Passe o mouse na foto ou no banner para editar
          </div>
        </div>

        <div className="mt-8">
          {(avatar.error || banner.error) && (
            <p className="text-xs text-red-600 mb-1">{avatar.error || banner.error}</p>
          )}
          <p className="text-xs text-gray-400">Formatos aceitos: JPG, PNG, WebP · Máx. 5 MB</p>
        </div>
      </div>
    </div>
  );
}
