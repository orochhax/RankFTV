"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { criarNoticia } from "@/app/admin/noticias/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-gray-600";

// Form de criação de notícia (só admin chega aqui). A imagem é enviada
// direto pro Storage no navegador (mesma estratégia do PDF de regulamento);
// pro server action vai só a URL pública.
export function NoticiaForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [tituloStory, setTituloStory] = useState("");
  const [tamanhoFonte, setTamanhoFonte] = useState<"P" | "M" | "G">("M");
  const [resumo, setResumo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewUrl = imagem ? URL.createObjectURL(imagem) : null;

  function limparImagem() {
    setImagem(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    setError(null);
    setOk(false);
    if (!titulo.trim()) return setError("Dê um título à notícia.");
    if (!resumo.trim()) return setError("Escreva o resumo curto (aparece no card).");
    if (!conteudo.trim()) return setError("Escreva o conteúdo da notícia.");

    startTransition(async () => {
      let imagemUrl: string | undefined;
      if (imagem) {
        const supabase = createClient();
        const ext = imagem.name.split(".").pop() ?? "jpg";
        const path = `${Date.now()}.${ext}`;
        const { data, error: upErr } = await supabase.storage
          .from("noticias")
          .upload(path, imagem, { contentType: imagem.type || undefined });
        if (upErr) return setError("Erro ao enviar a imagem. Tente de novo.");
        imagemUrl = supabase.storage.from("noticias").getPublicUrl(data.path).data.publicUrl;
      }

      const res = await criarNoticia({ titulo, tituloStory, tamanhoFonte, resumo, conteudo, imagemUrl });
      if (!res.ok) return setError(res.error ?? "Não foi possível publicar.");

      setOk(true);
      setTitulo("");
      setTituloStory("");
      setTamanhoFonte("M");
      setResumo("");
      setConteudo("");
      limparImagem();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <h2 className="text-sm font-semibold text-gray-900">Nova notícia</h2>

      <div>
        <label className={labelClass} htmlFor="titulo">Título *</label>
        <input id="titulo" className={inputClass} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Manchete da notícia" />
      </div>

      <div>
        <label className={labelClass} htmlFor="tituloStory">
          Título do Story <span className="font-normal text-gray-400">(opcional — se vazio, usa o título acima)</span>
        </label>
        <input id="tituloStory" className={inputClass} value={tituloStory} onChange={(e) => setTituloStory(e.target.value)} placeholder="Versão curta do título pra caber bem no story" />
      </div>

      <div>
        <label className={labelClass}>Tamanho da fonte no story</label>
        <div className="mt-1 flex gap-2">
          {(["P", "M", "G"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTamanhoFonte(t)}
              className={`flex size-10 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                tamanhoFonte === t
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {t}
            </button>
          ))}
          <span className="ml-1 self-center text-xs text-gray-400">
            {tamanhoFonte === "P" ? "Pequena" : tamanhoFonte === "M" ? "Média" : "Grande"}
          </span>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="resumo">Resumo (aparece no card) *</label>
        <textarea id="resumo" rows={2} className={inputClass} value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Uma descrição curta de ~2 linhas" />
      </div>

      <div>
        <label className={labelClass} htmlFor="conteudo">Conteúdo completo *</label>
        <textarea id="conteudo" rows={7} className={inputClass} value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="O texto completo da notícia. As quebras de linha são preservadas." />
      </div>

      <div>
        <label className={labelClass}>Imagem (opcional)</label>
        {imagem ? (
          <div className="mt-1 flex items-center gap-3 rounded-lg border border-gray-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl ?? ""} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
            <span className="flex-1 truncate text-sm text-gray-700">{imagem.name}</span>
            <button type="button" onClick={limparImagem} className="text-gray-400 hover:text-red-500"><X className="size-4" /></button>
          </div>
        ) : (
          <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
            <ImagePlus className="size-4" />
            Clique para selecionar uma imagem
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImagem(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Notícia publicada!</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {pending ? "Publicando…" : "Publicar notícia"}
      </button>
    </div>
  );
}
