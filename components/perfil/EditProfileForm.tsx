"use client";

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  userId: string;
  initialNome: string;
  initialBio: string | null;
  initialDataNascimento: string | null;
  initialFotoUrl: string | null;
};

export function EditProfileForm({
  userId,
  initialNome,
  initialBio,
  initialDataNascimento,
  initialFotoUrl,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(initialNome);
  const [bio, setBio] = useState(initialBio ?? "");
  const [dataNascimento, setDataNascimento] = useState(initialDataNascimento ?? "");
  const [fotoUrl, setFotoUrl] = useState(initialFotoUrl ?? "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError(null);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError("Erro ao enviar foto. Verifique se o bucket 'avatars' existe no Supabase Storage.");
      setUploadingPhoto(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Adiciona timestamp pra evitar cache do browser
    const url = data.publicUrl + "?t=" + Date.now();
    setFotoUrl(url);
    setUploadingPhoto(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        nome: nome.trim(),
        bio: bio.trim() || null,
        data_nascimento: dataNascimento || null,
        foto_url: fotoUrl || null,
      })
      .eq("id", userId);

    setLoading(false);

    if (updateError) {
      setError("Erro ao salvar. Tente novamente.");
    } else {
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-gray-500">Editar perfil</h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        {/* Foto */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar nome={nome} color="bg-blue-500" size="lg" fotoUrl={fotoUrl || null} />
            {uploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="size-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Camera className="size-4" />
              {uploadingPhoto ? "Enviando…" : "Alterar foto"}
            </button>
            <p className="mt-1 text-xs text-gray-400">JPG ou PNG, até 2 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={60}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Nome que aparece no perfil. O @usuário não pode ser alterado.
          </p>
        </div>

        {/* Data de nascimento */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Data de nascimento
          </label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={160}
            placeholder="Conte um pouco sobre você…"
            className="mt-1 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">{bio.length}/160 caracteres</p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || uploadingPhoto}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {success && <Check className="size-4" />}
          {success ? "Salvo!" : "Salvar alterações"}
        </button>
      </form>
    </section>
  );
}
