"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Save, X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { editarNoticia } from "@/app/admin/noticias/actions";
import type { News } from "@/lib/news-utils";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-gray-600";

export function EditarNoticiaForm({ noticia }: { noticia: News }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState(noticia.titulo);
  const [tituloStory, setTituloStory] = useState(noticia.titulo_story ?? "");
  const [tamanhoFonte, setTamanhoFonte] = useState<"P" | "M" | "G">(noticia.tamanho_fonte ?? "M");
  const [resumo, setResumo] = useState(noticia.resumo);
  const [conteudo, setConteudo] = useState(noticia.conteudo);

  // Imagem: pode manter a atual, trocar ou remover.
  const [novaImagem, setNovaImagem] = useState<File | null>(null);
  const [removerImagem, setRemoverImagem] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const imagemAtualUrl = noticia.imagem_url;
  const previewNovaUrl = novaImagem ? URL.createObjectURL(novaImagem) : null;
  const imagemExibida = removerImagem ? null : (previewNovaUrl ?? imagemAtualUrl);

  function escolherArquivo(file: File) {
    setNovaImagem(file);
    setRemoverImagem(false);
  }

  function limparImagem() {
    setNovaImagem(null);
    setRemoverImagem(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    setError(null);
    if (!titulo.trim()) return setError("Dê um título à notícia.");
    if (!resumo.trim()) return setError("Escreva o resumo curto (aparece no card).");
    if (!conteudo.trim()) return setError("Escreva o conteúdo da notícia.");

    startTransition(async () => {
      let imagemUrl: string | undefined;

      if (novaImagem) {
        const supabase = createClient();
        const ext = novaImagem.name.split(".").pop() ?? "jpg";
        const path = `${Date.now()}.${ext}`;
        const { data, error: upErr } = await supabase.storage
          .from("noticias")
          .upload(path, novaImagem, { contentType: novaImagem.type || undefined });
        if (upErr) return setError("Erro ao enviar a imagem. Tente de novo.");
        imagemUrl = supabase.storage.from("noticias").getPublicUrl(data.path).data.publicUrl;
      }

      const res = await editarNoticia({
        id: noticia.id,
        titulo,
        tituloStory,
        tamanhoFonte,
        resumo,
        conteudo,
        imagemUrl,
        removerImagem,
      });

      if (!res.ok) return setError(res.error ?? "Não foi possível salvar.");
      router.push("/admin/noticias");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="titulo">Título *</label>
        <input
          id="titulo"
          className={inputClass}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Manchete da notícia"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="tituloStory">
          Título do Story <span className="font-normal text-gray-400">(opcional — se vazio, usa o título acima)</span>
        </label>
        <input
          id="tituloStory"
          className={inputClass}
          value={tituloStory}
          onChange={(e) => setTituloStory(e.target.value)}
          placeholder="Versão curta do título pra caber bem no story"
        />
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
        <textarea
          id="resumo"
          rows={2}
          className={inputClass}
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          placeholder="Uma descrição curta de ~2 linhas"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="conteudo">Conteúdo completo *</label>
        <textarea
          id="conteudo"
          rows={10}
          className={inputClass}
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="O texto completo da notícia."
        />
      </div>

      <div>
        <label className={labelClass}>Imagem</label>
        {imagemExibida ? (
          <div className="mt-1 flex items-center gap-3 rounded-lg border border-gray-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagemExibida} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
            <span className="flex-1 truncate text-sm text-gray-700">
              {novaImagem ? novaImagem.name : "Imagem atual"}
            </span>
            <button
              type="button"
              onClick={limparImagem}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Remover imagem"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ) : (
          <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
            <ImagePlus className="size-4" />
            {removerImagem && imagemAtualUrl ? "Imagem removida — clique para adicionar outra" : "Clique para selecionar uma imagem"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) escolherArquivo(f);
              }}
            />
          </label>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <X className="size-4" /> Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
