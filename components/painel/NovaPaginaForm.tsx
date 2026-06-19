"use client";

import { useActionState, useState, useRef, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { criarPagina } from "@/app/painel/paginas/nova/actions";
import { createClient } from "@/lib/supabase/client";

const GRADIENT_OPTIONS = [
  { from: "from-blue-500",    to: "to-cyan-400",   label: "Azul" },
  { from: "from-emerald-500", to: "to-teal-400",   label: "Verde" },
  { from: "from-orange-500",  to: "to-amber-400",  label: "Laranja" },
  { from: "from-violet-500",  to: "to-purple-400", label: "Roxo" },
  { from: "from-rose-500",    to: "to-pink-400",   label: "Rosa" },
  { from: "from-indigo-500",  to: "to-blue-400",   label: "Índigo" },
  { from: "from-slate-600",   to: "to-slate-400",  label: "Cinza" },
] as const;

const INITIAL_STATE: { error?: string } = {};

export function NovaPaginaForm() {
  const [state, action, pending] = useActionState(criarPagina, INITIAL_STATE);
  const [selectedGradient, setSelectedGradient] = useState(0);
  const [handle, setHandle] = useState("");
  const [nome, setNome] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const gradient = GRADIENT_OPTIONS[selectedGradient];

  function handleNomeChange(value: string) {
    setNome(value);
    if (handle === "") {
      const suggestion = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30);
      setHandle(suggestion);
    }
  }

  function handleFileChange(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Imagem muito grande. Máximo 5 MB.");
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setUploadError(null);

    // Faz upload imediatamente para o Storage
    startUpload(async () => {
      const filename = `page-banners/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { data, error } = await supabase.storage
        .from("page-banners")
        .upload(filename, file, { contentType: file.type });

      if (error) {
        setUploadError("Erro ao enviar a imagem. Tente novamente.");
        setBannerFile(null);
        setBannerPreview(null);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("page-banners")
        .getPublicUrl(data.path);

      setBannerUrl(urlData.publicUrl);
    });
  }

  function removeBanner() {
    setBannerFile(null);
    setBannerPreview(null);
    setBannerUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form action={action} className="space-y-6">
      {/* Preview do banner */}
      <div className="relative h-28 w-full overflow-hidden rounded-2xl">
        {bannerPreview ? (
          <>
            <Image src={bannerPreview} alt="Banner" fill className="object-cover" />
            <button
              type="button"
              onClick={removeBanner}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="size-4" />
            </button>
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
          </>
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient.from} ${gradient.to} transition-all`}
          >
            <span className="text-4xl font-bold text-white/90">
              {nome ? nome.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
        )}
      </div>

      {/* Upload de foto */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Banner</p>
        {!bannerFile ? (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
            <ImagePlus className="size-4 shrink-0" />
            Carregar foto de banner
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <p className="text-xs text-gray-400 truncate">{bannerFile.name}</p>
        )}
        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        {!bannerFile && (
          <p className="text-xs text-gray-400">
            Ou escolha uma cor de fundo abaixo · JPG, PNG, WebP · max 5 MB
          </p>
        )}
      </div>

      {/* Cor do banner (só mostra se não tem foto) */}
      {!bannerFile && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Cor do banner</p>
          <div className="flex flex-wrap gap-2">
            {GRADIENT_OPTIONS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setSelectedGradient(i)}
                className={`h-8 w-8 rounded-full bg-gradient-to-br ${g.from} ${g.to} ring-2 ring-offset-2 transition-all ${
                  i === selectedGradient ? "ring-blue-600" : "ring-transparent"
                }`}
                title={g.label}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hiddens */}
      <input type="hidden" name="bannerFrom" value={gradient.from} />
      <input type="hidden" name="bannerTo" value={gradient.to} />
      <input type="hidden" name="bannerUrl" value={bannerUrl} />

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
          Nome da página
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          value={nome}
          onChange={(e) => handleNomeChange(e.target.value)}
          placeholder="Ex: Copa Litoral FTV"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Handle */}
      <div className="space-y-1.5">
        <label htmlFor="handle" className="block text-sm font-medium text-gray-700">
          @handle
        </label>
        <div className="flex items-center rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          <span className="select-none px-3 py-3 text-sm text-gray-400">@</span>
          <input
            id="handle"
            name="handle"
            type="text"
            required
            value={handle}
            onChange={(e) =>
              setHandle(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "")
                  .slice(0, 30),
              )
            }
            placeholder="copa-litoral"
            className="min-w-0 flex-1 bg-transparent py-3 pr-4 text-sm outline-none"
          />
        </div>
        <p className="text-xs text-gray-400">
          Letras minúsculas, números e hífens · aparece na URL da página
        </p>
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
          Descrição <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          placeholder="Uma frase sobre o campeonato — aparece na lista de páginas."
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {uploading ? "Enviando imagem…" : pending ? "Criando página…" : "Criar página"}
      </button>
    </form>
  );
}
