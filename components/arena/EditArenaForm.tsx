"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Check, Building2, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type Photo = { id: string; url: string };

type Props = {
  arenaId: string;
  handle: string;
  initialNome: string;
  initialDescricao: string | null;
  initialCidade: string;
  initialEstado: string;
  initialAvatarUrl: string | null;
  initialPhotos: Photo[];
};

export function EditArenaForm({
  arenaId, handle,
  initialNome, initialDescricao, initialCidade, initialEstado,
  initialAvatarUrl, initialPhotos,
}: Props) {
  const supabase = createClient();
  const router   = useRouter();

  const [nome,      setNome]      = useState(initialNome);
  const [descricao, setDescricao] = useState(initialDescricao ?? "");
  const [cidade,    setCidade]    = useState(initialCidade);
  const [estado,    setEstado]    = useState(initialEstado);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [photos,    setPhotos]    = useState<Photo[]>(initialPhotos);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const avatarRef = useRef<HTMLInputElement>(null);
  const photoRef  = useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    setError(null);
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${arenaId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("arenas")
      .upload(path, file, { upsert: true });

    if (upErr) {
      setError("Erro ao enviar avatar. Verifique o bucket 'arenas'.");
      setUploadingAvatar(false);
      return;
    }
    const { data } = supabase.storage.from("arenas").getPublicUrl(path);
    setAvatarUrl(data.publicUrl + "?t=" + Date.now());
    setUploadingAvatar(false);
  }

  async function uploadPhoto(file: File) {
    setUploadingPhoto(true);
    setError(null);
    const ext  = file.name.split(".").pop() ?? "jpg";
    const name = `${Date.now()}.${ext}`;
    const path = `${arenaId}/photos/${name}`;

    const { error: upErr } = await supabase.storage
      .from("arenas")
      .upload(path, file, { upsert: false });

    if (upErr) {
      setError("Erro ao enviar foto.");
      setUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("arenas").getPublicUrl(path);
    const url = urlData.publicUrl;

    const { data: row, error: insErr } = await supabase
      .from("arena_photos")
      .insert({ arena_id: arenaId, url, ordem: photos.length })
      .select("id, url")
      .single();

    if (insErr || !row) {
      setError("Erro ao salvar foto.");
    } else {
      setPhotos((prev) => [...prev, row]);
    }
    setUploadingPhoto(false);
  }

  async function removePhoto(photoId: string) {
    await supabase.from("arena_photos").delete().eq("id", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function movePhoto(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= photos.length) return;
    const updated = [...photos];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    setPhotos(updated);
    // Persiste a nova ordem no banco
    await Promise.all([
      supabase.from("arena_photos").update({ ordem: index }).eq("id", updated[index].id),
      supabase.from("arena_photos").update({ ordem: next }).eq("id", updated[next].id),
    ]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim())   { setError("O nome é obrigatório."); return; }
    if (!cidade.trim()) { setError("A cidade é obrigatória."); return; }
    if (!estado)        { setError("Selecione o estado."); return; }

    setSaving(true);
    setError(null);

    const { error: updateErr } = await supabase
      .from("arenas")
      .update({
        nome:       nome.trim(),
        descricao:  descricao.trim() || null,
        cidade:     cidade.trim(),
        estado,
        avatar_url: avatarUrl || null,
      })
      .eq("id", arenaId);

    setSaving(false);
    if (updateErr) { setError("Erro ao salvar. Tente novamente."); return; }

    setSuccess(true);
    setTimeout(() => {
      router.push(`/arena/${handle}`);
      router.refresh();
    }, 800);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Avatar ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Foto de perfil
        </p>
        <div className="flex items-center gap-4">
          <div
            className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 cursor-pointer"
            onClick={() => avatarRef.current?.click()}
          >
            {avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center"><Building2 className="size-9 text-white/40" /></div>
            }
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
              {uploadingAvatar
                ? <Loader2 className="size-5 animate-spin text-white" />
                : <Camera className="size-5 text-white" />
              }
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Logo ou foto da arena</p>
            <p className="text-xs text-gray-400 mt-0.5">Foto quadrada (1:1). Clique para alterar.</p>
          </div>
        </div>
        <input
          ref={avatarRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) uploadAvatar(f);
          }}
        />
      </div>

      {/* ── Fotos do espaço ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Fotos do espaço
        </p>
        <div className="flex flex-wrap gap-3">
          {photos.map((p, i) => (
            <div key={p.id} className="relative size-24 overflow-hidden rounded-xl bg-gray-100 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="foto" className="h-full w-full object-cover" />

              {/* Badge "capa" na primeira foto */}
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  capa
                </span>
              )}

              {/* Botão remover */}
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600"
              >
                <X className="size-3" />
              </button>

              {/* Botões de reordenação (aparecem no hover) */}
              <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => movePhoto(i, -1)}
                  disabled={i === 0}
                  className="flex size-6 items-center justify-center rounded-full bg-black/70 text-white disabled:opacity-30 hover:bg-black"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => movePhoto(i, 1)}
                  disabled={i === photos.length - 1}
                  className="flex size-6 items-center justify-center rounded-full bg-black/70 text-white disabled:opacity-30 hover:bg-black"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Botão adicionar foto */}
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={uploadingPhoto}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors disabled:opacity-50"
          >
            {uploadingPhoto
              ? <Loader2 className="size-5 animate-spin" />
              : <><Plus className="size-5" /><span className="text-[10px]">Adicionar</span></>
            }
          </button>
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) uploadPhoto(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── Campos de texto ── */}
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">Nome da arena</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="Conte sobre a arena, estrutura, diferenciais..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Cidade</label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">UF</option>
              {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || uploadingAvatar || uploadingPhoto}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {saving
          ? <><Loader2 className="size-4 animate-spin" /> Salvando...</>
          : success
          ? <><Check className="size-4" /> Salvo!</>
          : "Salvar alterações"
        }
      </button>
    </form>
  );
}
