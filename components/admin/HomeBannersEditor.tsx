"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { salvarBannersHome } from "@/app/admin/destaques/actions";
import { createClient } from "@/lib/supabase/client";
import {
  HOME_BANNER_MAX_FILE_SIZE,
  HOME_BANNER_MIME_TYPES,
  homeBannerStoragePath,
  MAX_HOME_BANNERS,
  type HomeBanner,
} from "@/lib/home-banners";

const fieldClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function safeLink(value: string) {
  const link = value.trim();
  if (!link) return true;
  if (link.startsWith("/") && !link.startsWith("//")) return true;
  try {
    return new URL(link).protocol === "https:";
  } catch {
    return false;
  }
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function HomeBannersEditor({ initialBanners }: { initialBanners: HomeBanner[] }) {
  const [banners, setBanners] = useState(initialBanners);
  const [deletedPaths, setDeletedPaths] = useState<string[]>([]);
  const [alt, setAlt] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function changeBanner(id: string, patch: Partial<HomeBanner>) {
    setBanners((current) => current.map((banner) => banner.id === id ? { ...banner, ...patch } : banner));
    setSaved(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    setBanners((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  function removeBanner(banner: HomeBanner) {
    const path = homeBannerStoragePath(banner.imageUrl);
    if (path) setDeletedPaths((current) => [...new Set([...current, path])]);
    setBanners((current) => current.filter((item) => item.id !== banner.id));
    setSaved(false);
  }

  async function addBanner() {
    setError("");
    if (!file) return setError("Selecione uma imagem.");
    if (alt.trim().length < 3) return setError("Descreva o conteúdo do banner para acessibilidade.");
    if (!safeLink(linkUrl)) return setError("Use um link interno iniciado por / ou uma URL HTTPS.");
    if (!HOME_BANNER_MIME_TYPES.includes(file.type as (typeof HOME_BANNER_MIME_TYPES)[number])) {
      return setError("Use uma imagem JPEG, PNG ou WebP.");
    }
    if (file.size > HOME_BANNER_MAX_FILE_SIZE) return setError("A imagem pode ter no máximo 5 MB.");
    if (banners.length >= MAX_HOME_BANNERS) return setError(`O limite é de ${MAX_HOME_BANNERS} banners.`);

    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return setError("Sessão expirada.");
    }

    const id = crypto.randomUUID();
    const path = `${user.id}/home-banners/${id}.${extensionFor(file)}`;
    const { data, error: uploadError } = await supabase.storage
      .from("page-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (uploadError) return setError("Não foi possível enviar a imagem.");

    const imageUrl = supabase.storage.from("page-images").getPublicUrl(data.path).data.publicUrl;
    setBanners((current) => [...current, {
      id,
      imageUrl,
      alt: alt.trim(),
      linkUrl: linkUrl.trim() || null,
      active: true,
    }]);
    setAlt("");
    setLinkUrl("");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function save() {
    setError("");
    const invalid = banners.find((banner) => banner.alt.trim().length < 3 || !safeLink(banner.linkUrl ?? ""));
    if (invalid) return setError("Revise o texto alternativo e o link de todos os banners.");

    startTransition(async () => {
      const result = await salvarBannersHome(banners);
      if (!result.ok) return setError(result.error ?? "Não foi possível salvar os banners.");

      if (deletedPaths.length > 0) {
        await createClient().storage.from("page-images").remove(deletedPaths);
        setDeletedPaths([]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-3">
          <div>
            <label htmlFor="home-banner-file" className="text-xs font-medium text-gray-600">Imagem *</label>
            <input
              ref={inputRef}
              id="home-banner-file"
              type="file"
              accept={HOME_BANNER_MIME_TYPES.join(",")}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={`${fieldClass} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-700`}
            />
            <p className="mt-1 text-xs text-gray-400">JPEG, PNG ou WebP, até 5 MB.</p>
          </div>
          <div>
            <label htmlFor="home-banner-alt" className="text-xs font-medium text-gray-600">Texto alternativo *</label>
            <input id="home-banner-alt" value={alt} onChange={(event) => setAlt(event.target.value)} maxLength={160} className={`${fieldClass} mt-1`} placeholder="Descreva o que aparece na imagem" />
          </div>
          <div>
            <label htmlFor="home-banner-link" className="text-xs font-medium text-gray-600">Link ao clicar</label>
            <input id="home-banner-link" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} className={`${fieldClass} mt-1`} placeholder="/campeonatos ou https://..." />
          </div>
          <button type="button" onClick={addBanner} disabled={uploading || banners.length >= MAX_HOME_BANNERS} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {uploading ? "Enviando…" : "Adicionar banner"}
          </button>
        </div>
        <div className="relative min-h-44 overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-black/5">
          {previewUrl ? (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${previewUrl})` }} role="img" aria-label={alt || "Prévia do novo banner"} />
          ) : (
            <div className="flex h-full min-h-44 flex-col items-center justify-center gap-2 text-gray-400">
              <ImagePlus className="size-8" />
              <p className="text-sm">Prévia 16:5</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ordem do carrossel ({banners.length}/{MAX_HOME_BANNERS})</p>
        {banners.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">Nenhum banner. A home não exibirá essa seção.</div>
        ) : banners.map((banner, index) => (
          <div key={banner.id} className={`grid gap-3 rounded-2xl p-3 ring-1 md:grid-cols-[9rem_minmax(0,1fr)_auto] ${banner.active ? "bg-white ring-black/5" : "bg-gray-50 opacity-70 ring-gray-200"}`}>
            <div className="relative h-24 overflow-hidden rounded-xl bg-gray-100">
              <Image src={banner.imageUrl} alt="" fill sizes="144px" className="object-cover" />
            </div>
            <div className="grid content-center gap-2">
              <input value={banner.alt} onChange={(event) => changeBanner(banner.id, { alt: event.target.value })} maxLength={160} aria-label={`Texto alternativo do banner ${index + 1}`} className={fieldClass} />
              <input value={banner.linkUrl ?? ""} onChange={(event) => changeBanner(banner.id, { linkUrl: event.target.value || null })} aria-label={`Link do banner ${index + 1}`} className={fieldClass} placeholder="Sem link" />
            </div>
            <div className="flex items-center justify-end gap-1 md:flex-col">
              <button type="button" onClick={() => changeBanner(banner.id, { active: !banner.active })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label={banner.active ? `Desativar banner ${index + 1}` : `Ativar banner ${index + 1}`} title={banner.active ? "Desativar" : "Ativar"}>
                {banner.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label={`Mover banner ${index + 1} para cima`}><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === banners.length - 1} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label={`Mover banner ${index + 1} para baixo`}><ArrowDown className="size-4" /></button>
              <button type="button" onClick={() => removeBanner(banner)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Remover banner ${index + 1}`}><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">{error}</p>}
      <button type="button" onClick={save} disabled={pending || uploading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
        {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Save className="size-4" />}
        {pending ? "Salvando…" : saved ? "Banners salvos" : "Salvar banners da home"}
      </button>
    </div>
  );
}
