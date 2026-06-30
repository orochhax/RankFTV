"use client";

import { useActionState, useState, useRef, useTransition, useEffect } from "react";
import Image from "next/image";
import {
  Camera, ImagePlus, X, Loader2, CheckCircle2, XCircle, Link2,
} from "lucide-react";
import { criarPagina } from "@/app/painel/paginas/nova/actions";
import { createClient } from "@/lib/supabase/client";

const GRADIENT_OPTIONS = [
  { from: "from-blue-500",    to: "to-cyan-400",   label: "Azul" },
  { from: "from-blue-500", to: "to-teal-400",   label: "Verde" },
  { from: "from-orange-500",  to: "to-amber-400",  label: "Laranja" },
  { from: "from-violet-500",  to: "to-purple-400", label: "Roxo" },
  { from: "from-rose-500",    to: "to-pink-400",   label: "Rosa" },
  { from: "from-indigo-500",  to: "to-blue-400",   label: "Índigo" },
  { from: "from-slate-600",   to: "to-slate-400",  label: "Cinza" },
] as const;

const SOCIALS = [
  { type: "instagram", label: "Instagram", color: "bg-gradient-to-br from-pink-500 to-orange-400", placeholder: "https://instagram.com/rankftv" },
  { type: "tiktok",    label: "TikTok",    color: "bg-black",                                       placeholder: "https://tiktok.com/@rankftv" },
  { type: "whatsapp",  label: "WhatsApp",  color: "bg-blue-500",                                   placeholder: "https://wa.me/5511999999999" },
  { type: "facebook",  label: "Facebook",  color: "bg-blue-600",                                    placeholder: "https://facebook.com/rankftv" },
  { type: "youtube",   label: "YouTube",   color: "bg-red-600",                                     placeholder: "https://youtube.com/@rankftv" },
] as const;

const INITIAL_STATE: { error?: string } = {};

export function NovaPaginaForm() {
  const [state, action, pending] = useActionState(criarPagina, INITIAL_STATE);
  const supabase = createClient();

  // Gradiente
  const [selectedGradient, setSelectedGradient] = useState(0);
  const gradient = GRADIENT_OPTIONS[selectedGradient];

  // Nome + handle
  const [nome, setNome] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [handleStatus, setHandleStatus] = useState<"idle"|"checking"|"ok"|"taken"|"invalid">("idle");

  // Banner
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerUploading, startBannerUpload] = useTransition();
  const [bannerError, setBannerError] = useState("");
  const bannerRef = useRef<HTMLInputElement>(null);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, startAvatarUpload] = useTransition();
  const [avatarError, setAvatarError] = useState("");
  const avatarRef = useRef<HTMLInputElement>(null);

  // Social links
  const [socials, setSocials] = useState<Record<string, string>>({
    instagram: "", tiktok: "", whatsapp: "", facebook: "", youtube: "",
  });

  const socialLinksJson = JSON.stringify(
    SOCIALS
      .filter((s) => socials[s.type]?.trim())
      .map((s) => ({ type: s.type, url: socials[s.type].trim(), visible: true }))
  );

  // Handle sugestão automática pelo nome
  function handleNomeChange(value: string) {
    setNome(value);
    if (!handleTouched) {
      setHandle(
        value.toLowerCase()
          .normalize("NFD").replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 30)
      );
    }
  }

  // Validação do handle em tempo real
  useEffect(() => {
    if (!handle) { setHandleStatus("idle"); return; }
    if (!/^[a-z0-9-]{3,30}$/.test(handle)) { setHandleStatus("invalid"); return; }
    setHandleStatus("checking");
    const t = setTimeout(async () => {
      const [{ data: page }, { data: profile }] = await Promise.all([
        supabase.from("pages").select("id").eq("handle", handle).maybeSingle(),
        supabase.from("profiles").select("id").eq("username", handle).maybeSingle(),
      ]);
      setHandleStatus(page || profile ? "taken" : "ok");
    }, 400);
    return () => clearTimeout(t);
  }, [handle]);

  // Upload banner
  async function handleBannerFile(file: File) {
    if (!file.type.startsWith("image/")) { setBannerError("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { setBannerError("Máximo 5 MB."); return; }
    setBannerError("");
    setBannerPreview(URL.createObjectURL(file));
    startBannerUpload(async () => {
      const path = `banners/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.storage.from("page-images").upload(path, file, { contentType: file.type });
      if (error) { setBannerError("Erro ao enviar imagem."); setBannerPreview(null); return; }
      const { data: { publicUrl } } = supabase.storage.from("page-images").getPublicUrl(data.path);
      setBannerUrl(publicUrl);
    });
  }

  // Upload avatar
  async function handleAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) { setAvatarError("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { setAvatarError("Máximo 5 MB."); return; }
    setAvatarError("");
    setAvatarPreview(URL.createObjectURL(file));
    startAvatarUpload(async () => {
      const path = `avatars/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.storage.from("page-images").upload(path, file, { contentType: file.type });
      if (error) { setAvatarError("Erro ao enviar foto."); setAvatarPreview(null); return; }
      const { data: { publicUrl } } = supabase.storage.from("page-images").getPublicUrl(data.path);
      setAvatarUrl(publicUrl);
    });
  }

  const uploading = bannerUploading || avatarUploading;
  const canSubmit = !pending && !uploading && handleStatus === "ok" && nome.trim().length > 0;

  return (
    <form action={action} className="space-y-6">

      {/* ── Banner ─────────────────────────────── */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Banner</p>
        <div
          className={`relative h-28 w-full overflow-hidden rounded-2xl cursor-pointer bg-gradient-to-br ${gradient.from} ${gradient.to}`}
          onClick={() => !bannerPreview && bannerRef.current?.click()}
        >
          {bannerPreview && (
            <Image src={bannerPreview} alt="Banner" fill className="object-cover" sizes="100vw" />
          )}
          {bannerUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          )}
          {!bannerPreview && !bannerUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImagePlus className="size-6 text-white/60" />
            </div>
          )}
          {bannerPreview && !bannerUploading && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setBannerPreview(null); setBannerUrl(""); if (bannerRef.current) bannerRef.current.value = ""; }}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {!bannerPreview && (
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <ImagePlus className="size-3.5" /> Carregar imagem
            </button>
            <div className="flex gap-1.5">
              {GRADIENT_OPTIONS.map((g, i) => (
                <button
                  key={g.label} type="button"
                  onClick={() => setSelectedGradient(i)}
                  className={`size-6 rounded-full bg-gradient-to-br ${g.from} ${g.to} ring-2 ring-offset-1 ${i === selectedGradient ? "ring-blue-600" : "ring-transparent"}`}
                  title={g.label}
                />
              ))}
            </div>
          </div>
        )}
        {bannerError && <p className="mt-1 text-xs text-red-600">{bannerError}</p>}
        <input ref={bannerRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerFile(f); e.target.value = ""; }} />
      </div>

      {/* ── Foto de perfil ─────────────────────── */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Foto de perfil</p>
        <div className="flex items-center gap-4">
          <div
            className="relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300"
            onClick={() => avatarRef.current?.click()}
          >
            {avatarPreview ? (
              <Image src={avatarPreview} alt="Avatar" fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {nome ? <span className="text-2xl font-bold text-gray-500">{nome.charAt(0).toUpperCase()}</span>
                       : <Camera className="size-6 text-gray-400" />}
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="size-4 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => avatarRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Camera className="size-4" /> {avatarPreview ? "Trocar foto" : "Adicionar foto"}
            </button>
            {avatarPreview && (
              <button type="button"
                onClick={() => { setAvatarPreview(null); setAvatarUrl(""); if (avatarRef.current) avatarRef.current.value = ""; }}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
        {avatarError && <p className="mt-1 text-xs text-red-600">{avatarError}</p>}
        <input ref={avatarRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value = ""; }} />
      </div>

      {/* ── Nome ───────────────────────────────── */}
      <div className="space-y-1.5">
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome da página *</label>
        <input
          id="nome" name="nome" type="text" required
          value={nome} onChange={(e) => handleNomeChange(e.target.value)}
          placeholder="Ex: Copa Litoral FTV"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* ── Handle ─────────────────────────────── */}
      <div className="space-y-1.5">
        <label htmlFor="handle" className="block text-sm font-medium text-gray-700">@handle *</label>
        <div className="relative flex items-center rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <span className="select-none pl-4 pr-1 text-sm text-gray-400">@</span>
          <input
            id="handle" name="handle" type="text" required
            value={handle}
            onChange={(e) => { setHandleTouched(true); setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30)); }}
            placeholder="copa-litoral"
            className="flex-1 bg-transparent py-3 pr-10 text-sm outline-none"
          />
          <div className="absolute right-3">
            {handleStatus === "checking" && <Loader2 className="size-4 animate-spin text-gray-400" />}
            {handleStatus === "ok"       && <CheckCircle2 className="size-4 text-blue-500" />}
            {(handleStatus === "taken" || handleStatus === "invalid") && <XCircle className="size-4 text-red-500" />}
          </div>
        </div>
        {handleStatus === "taken"   && <p className="text-xs text-red-600">Esse @ já está em uso. Escolha outro.</p>}
        {handleStatus === "invalid" && <p className="text-xs text-red-600">Só letras minúsculas, números e hífens (mín. 3 caracteres).</p>}
        {handleStatus === "ok"      && <p className="text-xs text-blue-600">@ disponível!</p>}
        {handleStatus === "idle"    && <p className="text-xs text-gray-400">Letras minúsculas, números e hífens · aparece na URL da página</p>}
      </div>

      {/* ── Descrição ──────────────────────────── */}
      <div className="space-y-1.5">
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
          Descrição <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea id="descricao" name="descricao" rows={2}
          placeholder="Uma frase sobre o campeonato — aparece na lista de páginas."
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* ── Links sociais ──────────────────────── */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Links sociais <span className="font-normal text-gray-400">(opcional)</span></p>
        <div className="space-y-2">
          {SOCIALS.map((s) => (
            <div key={s.type} className="flex items-center gap-2">
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-white ${s.color}`}>
                <Link2 className="size-4" />
              </div>
              <input
                type="url"
                value={socials[s.type]}
                onChange={(e) => setSocials((prev) => ({ ...prev, [s.type]: e.target.value }))}
                placeholder={s.placeholder}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Hiddens */}
      <input type="hidden" name="bannerFrom"   value={gradient.from} />
      <input type="hidden" name="bannerTo"     value={gradient.to} />
      <input type="hidden" name="bannerUrl"    value={bannerUrl} />
      <input type="hidden" name="avatarUrl"    value={avatarUrl} />
      <input type="hidden" name="socialLinks"  value={socialLinksJson} />

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit" disabled={!canSubmit}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? "Enviando imagem…" : pending ? "Criando página…" : "Criar página"}
      </button>
    </form>
  );
}
