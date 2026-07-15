"use client";

import { useRef, useState, useTransition } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Loader2, Move, Save, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { criarCampeonatoVitrine, atualizarCampeonatoVitrine } from "@/app/admin/campeonatos/novo/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-gray-600";

type Status = "inscricoes_abertas" | "em_andamento" | "encerrado";

const STATUS_OPCOES: { valor: Status; label: string }[] = [
  { valor: "inscricoes_abertas", label: "Em breve / aberto" },
  { valor: "em_andamento",       label: "Acontecendo agora" },
  { valor: "encerrado",          label: "Já encerrado" },
];

export type CampeonatoVitrineExistente = {
  id: string;
  nome: string;
  descricao: string;
  regulamento: string;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  estado: string;
  local: string;
  status: Status;
  bannerUrl: string | null;
  bannerPositionX: number | null;
  bannerPositionY: number | null;
};

// Form do campeonato "vitrine" (só admin) — cria um novo quando `campeonato`
// não é passado, ou edita o existente quando é. Evento informativo: sem
// categoria, sem quiz de nível e sem chave PIX. O banner sobe direto pro
// Storage no navegador (bucket page-images); pro server action vai só a URL
// pública + a posição de enquadramento escolhida.
export function CampeonatoVitrineForm({ campeonato }: { campeonato?: CampeonatoVitrineExistente }) {
  const router = useRouter();
  const editando = !!campeonato;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState(campeonato?.nome ?? "");
  const [descricao, setDescricao] = useState(campeonato?.descricao ?? "");
  const [regulamento, setRegulamento] = useState(campeonato?.regulamento ?? "");
  const [dataInicio, setDataInicio] = useState(campeonato?.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(campeonato?.dataFim ?? "");
  const [cidade, setCidade] = useState(campeonato?.cidade ?? "");
  const [estado, setEstado] = useState(campeonato?.estado ?? "");
  const [local, setLocal] = useState(campeonato?.local ?? "");
  const [status, setStatus] = useState<Status>(campeonato?.status ?? "inscricoes_abertas");

  // Banner: `novoArquivo` é um upload feito agora; `bannerAtualUrl` é o que já
  // está salvo (edição) — os dois nunca coexistem na prévia, o novo sempre
  // substitui o atual assim que é escolhido.
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [bannerAtualUrl, setBannerAtualUrl] = useState<string | null>(campeonato?.bannerUrl ?? null);
  const [enviandoBanner, setEnviandoBanner] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = novoArquivo ? URL.createObjectURL(novoArquivo) : bannerAtualUrl;

  // Posição de enquadramento do banner (0–100%, 50/50 = centro). Arrastar a
  // prévia ajusta esses valores, que viram object-position onde o banner é
  // exibido no site inteiro (card, destaque, página do campeonato).
  const [posX, setPosX] = useState(campeonato?.bannerPositionX ?? 50);
  const [posY, setPosY] = useState(campeonato?.bannerPositionY ?? 50);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);

  function limparBanner() {
    setNovoArquivo(null);
    setBannerAtualUrl(null);
    setPosX(50);
    setPosY(50);
    if (fileRef.current) fileRef.current.value = "";
  }

  function selecionarBanner(file: File | null) {
    setNovoArquivo(file);
    setBannerAtualUrl(null);
    setPosX(50);
    setPosY(50);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    arrastando.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!arrastando.current || !previewBoxRef.current) return;
    const rect = previewBoxRef.current.getBoundingClientRect();
    const dx = (e.movementX / rect.width) * 100;
    const dy = (e.movementY / rect.height) * 100;
    // Arrastar pra direita/baixo revela o que estava cortado do lado
    // oposto — por isso o sinal invertido (mesma sensação de "puxar a foto").
    setPosX((x) => Math.min(100, Math.max(0, x - dx)));
    setPosY((y) => Math.min(100, Math.max(0, y - dy)));
  }
  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    arrastando.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function submit() {
    setError(null);
    if (!nome.trim()) return setError("Dê um nome ao campeonato.");
    if (!dataInicio || !dataFim) return setError("Informe as datas de início e fim.");
    if (dataFim < dataInicio) return setError("A data de fim não pode ser antes do início.");
    if (!cidade.trim() || !estado.trim()) return setError("Informe a cidade e o estado.");

    startTransition(async () => {
      // Resolve a URL final do banner: novo upload > o que já estava salvo > nenhum.
      let bannerUrl: string | undefined = bannerAtualUrl ?? undefined;

      if (novoArquivo) {
        setEnviandoBanner(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setEnviandoBanner(false); return setError("Sessão expirada."); }
        const ext = novoArquivo.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/champ-banners/vitrine-${Date.now()}.${ext}`;
        const { data, error: upErr } = await supabase.storage
          .from("page-images")
          .upload(path, novoArquivo, { contentType: novoArquivo.type || undefined });
        setEnviandoBanner(false);
        if (upErr) return setError("Erro ao enviar o banner. Tente de novo.");
        bannerUrl = supabase.storage.from("page-images").getPublicUrl(data.path).data.publicUrl;
      }

      const payload = {
        nome,
        descricao,
        regulamento,
        dataInicio,
        dataFim,
        cidade,
        estado,
        local,
        bannerUrl,
        bannerPositionX: bannerUrl ? posX : undefined,
        bannerPositionY: bannerUrl ? posY : undefined,
        status,
      };

      if (editando) {
        const res = await atualizarCampeonatoVitrine({ id: campeonato.id, ...payload });
        if (!res.ok) return setError(res.error ?? "Não foi possível salvar.");
        router.push(`/campeonatos/${campeonato.id}`);
        router.refresh();
        return;
      }

      const res = await criarCampeonatoVitrine(payload);
      if (!res.ok || !res.id) return setError(res.error ?? "Não foi possível criar.");
      router.push(`/campeonatos/${res.id}`);
      router.refresh();
    });
  }

  const ocupado = pending || enviandoBanner;

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <div>
        <label className={labelClass} htmlFor="nome">Nome do campeonato *</label>
        <input id="nome" className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Brasil Open de Futevôlei" />
      </div>

      <div>
        <label className={labelClass} htmlFor="descricao">Descrição curta</label>
        <input id="descricao" className={inputClass} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Uma linha que aparece abaixo do nome" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="dataInicio">Início *</label>
          <input id="dataInicio" type="date" className={inputClass} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="dataFim">Fim *</label>
          <input id="dataFim" type="date" className={inputClass} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <div>
          <label className={labelClass} htmlFor="cidade">Cidade *</label>
          <input id="cidade" className={inputClass} value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="João Pessoa" />
        </div>
        <div>
          <label className={labelClass} htmlFor="estado">UF *</label>
          <input id="estado" maxLength={2} className={`${inputClass} uppercase`} value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="PB" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="local">Local (arena/ginásio)</label>
        <input id="local" className={inputClass} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Arena Beach Games" />
      </div>

      <div>
        <label className={labelClass}>Situação do evento</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {STATUS_OPCOES.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => setStatus(o.valor)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                status === o.valor
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="regulamento">Regulamento / informações</label>
        <textarea id="regulamento" rows={6} className={inputClass} value={regulamento} onChange={(e) => setRegulamento(e.target.value)} placeholder="Texto livre com regras, formato, premiação, etc. As quebras de linha são preservadas." />
      </div>

      <div>
        <label className={labelClass}>Banner (imagem do evento)</label>
        {previewUrl ? (
          <div className="mt-1 overflow-hidden rounded-lg border border-gray-200">
            <div
              ref={previewBoxRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative h-40 w-full cursor-grab touch-none select-none bg-gray-100 active:cursor-grabbing"
            >
              <Image
                src={previewUrl}
                alt=""
                fill
                draggable={false}
                className="pointer-events-none object-cover"
                style={{ objectPosition: `${posX}% ${posY}%` }}
                sizes="100vw"
              />
              <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
                <Move className="size-3" /> Arraste pra ajustar
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 truncate text-sm text-gray-700">
                {novoArquivo ? novoArquivo.name : "Banner atual"}
              </span>
              <button type="button" onClick={limparBanner} className="text-gray-400 hover:text-red-500"><X className="size-4" /></button>
            </div>
          </div>
        ) : (
          <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600">
            <ImagePlus className="size-4" />
            Clique para selecionar o banner do evento
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => selecionarBanner(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={ocupado}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {ocupado ? <Loader2 className="size-4 animate-spin" /> : editando ? <Save className="size-4" /> : <Plus className="size-4" />}
        {enviandoBanner ? "Enviando banner…" : pending ? (editando ? "Salvando…" : "Criando…") : editando ? "Salvar alterações" : "Criar campeonato vitrine"}
      </button>
    </div>
  );
}
