"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Check, Loader2, Mail, Phone, UserRound } from "lucide-react";
import { salvarPerfil } from "@/app/admin/performance/actions";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  nome: string;
  email: string;
  telefone: string | null;
  dataNascimento: string | null;
  fotoUrl: string | null;
};

const inputClass = "mt-1 w-full rounded-lg border border-white/10 bg-[#0f1318] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-500";

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function PerfilEditor({ userId, nome, email, telefone, dataNascimento, fotoUrl: initialPhoto }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const names = splitName(nome);
  const [photoUrl, setPhotoUrl] = useState(initialPhoto ?? "");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 2 * 1024 * 1024) {
      setError("Use uma imagem JPG, PNG ou WebP de ate 2 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    const extension = file.name.split(".").pop()?.toLocaleLowerCase("pt-BR") || "jpg";
    const path = `${userId}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) setError("Nao foi possivel enviar a foto.");
    else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setPhotoUrl(`${data.publicUrl}?v=${Date.now()}`);
    }
    setUploading(false);
  }

  return <section className="rounded-lg border border-white/10 bg-[#15191f] p-5 text-white sm:p-6">
    <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]"><UserRound className="size-5 text-blue-400" /></span><div><h2 className="font-semibold">Seu perfil</h2><p className="mt-1 text-xs text-white/40">Dados da sua conta e informacoes de contato.</p></div></div>

    <form onSubmit={(event) => {
      event.preventDefault();
      setError(null);
      setMessage(null);
      const data = new FormData(event.currentTarget);
      startTransition(async () => {
        const result = await salvarPerfil(data);
        if (!result.ok) setError(result.error ?? "Nao foi possivel salvar o perfil.");
        else {
          setMessage(result.message ?? "Perfil atualizado.");
          router.refresh();
        }
      });
    }} className="mt-6 space-y-5">
      <input type="hidden" name="foto_url" value={photoUrl} />
      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 pb-5">
        <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-blue-600 text-xl font-semibold">
          {photoUrl ? <Image src={photoUrl} alt={nome} width={80} height={80} className="h-full w-full object-cover" /> : names.firstName.slice(0, 1).toUpperCase()}
          {uploading && <span className="absolute inset-0 flex items-center justify-center bg-black/60"><Loader2 className="size-5 animate-spin" /></span>}
        </div>
        <div><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/75 hover:bg-white/[0.08] disabled:opacity-50"><Camera className="size-4" />Alterar foto</button><p className="mt-2 text-xs text-white/30">JPG, PNG ou WebP, ate 2 MB.</p><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} className="hidden" /></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="first_name" label="Nome" defaultValue={names.firstName} required />
        <Field name="last_name" label="Sobrenome" defaultValue={names.lastName} required />
        <Field name="email" label="E-mail" type="email" defaultValue={email} required icon={<Mail className="size-3.5" />} />
        <Field name="telefone" label="WhatsApp" type="tel" defaultValue={telefone ?? ""} placeholder="(75) 99999-9999" required icon={<Phone className="size-3.5" />} />
        <Field name="data_nascimento" label="Data de nascimento" type="date" defaultValue={dataNascimento ?? ""} required />
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{message}</p>}
      <button type="submit" disabled={pending || uploading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Salvando..." : "Salvar perfil"}</button>
    </form>
  </section>;
}

function Field({ name, label, type = "text", defaultValue, placeholder, required, icon }: { name: string; label: string; type?: string; defaultValue: string; placeholder?: string; required?: boolean; icon?: React.ReactNode }) {
  return <label className="block text-xs font-medium text-white/45"><span className="inline-flex items-center gap-1.5">{icon}{label}</span><input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} className={inputClass} /></label>;
}
