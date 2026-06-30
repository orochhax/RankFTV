import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  CalendarDays,
  MapPin,
  Tag,
  DollarSign,
  ArrowRight,
  ExternalLink,
  LayoutDashboard,
  Rocket,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBRL, formatDateRangeBR, generoLabel } from "@/lib/format";
import type { ChampionshipStatus, GeneroCategoria } from "@/lib/types";

type CatRow = {
  id: string;
  nome: string;
  genero: string;
  valor_inscricao: number;
  max_duplas: number | null;
};

// Card de sucesso pós-criação. Em vez de jogar direto pro painel, mostramos um
// resumo do que foi criado + o próximo passo (configurar PIX) no momento certo
// do funil — depois do organizador já ter investido o esforço de criar.
export default async function CampeonatoCriadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, data_inicio, data_fim, cidade, estado, status, organizador_id")
    .eq("id", id)
    .maybeSingle();

  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  const [{ data: rawCats }, { data: orgAccount }] = await Promise.all([
    supabase
      .from("championship_categories")
      .select("id, nome, genero, valor_inscricao, max_duplas")
      .eq("championship_id", id)
      .order("nome"),
    supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const cats = (rawCats ?? []) as CatRow[];
  const temChavePix      = !!orgAccount?.chave_pix;
  const temCategoriaPaga = cats.some((c) => (c.valor_inscricao ?? 0) > 0);
  const vagasTotais      = cats.reduce((acc, c) => acc + (c.max_duplas ?? 0), 0);
  const publicado        = champ.status === "inscricoes_abertas";

  return (
    <div className="min-h-screen">
      {/* ── Hero preto celebratório ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-12 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-500/15">
            <CheckCircle2 className="size-9 text-blue-400" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">
            {publicado ? "Campeonato no ar! 🎉" : "Campeonato criado! 🎉"}
          </h1>
          <p className="mt-2 text-white/50">
            <span className="font-medium text-white/80">{champ.nome}</span>{" "}
            {publicado
              ? "está com inscrições abertas."
              : "foi criado como rascunho."}
          </p>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Resumo do campeonato */}
          <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <p className="font-semibold text-gray-900">{champ.nome}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4" />
                    {formatDateRangeBR(champ.data_inicio, champ.data_fim)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {champ.cidade} — {champ.estado}
                  </span>
                </div>
              </div>
              <StatusBadge status={champ.status as ChampionshipStatus} />
            </div>

            {/* Mini stats */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
                <p className="text-xs text-gray-400">Categorias</p>
                <p className="text-lg font-bold text-gray-900">{cats.length}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
                <p className="text-xs text-gray-400">Vagas totais</p>
                <p className="text-lg font-bold text-gray-900">
                  {vagasTotais > 0 ? vagasTotais : "—"}
                </p>
              </div>
            </div>

            {/* Lista de categorias */}
            {cats.length > 0 && (
              <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl ring-1 ring-black/5">
                {cats.map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Tag className="size-3.5 text-gray-300" />
                      <span className="text-sm font-medium text-gray-800">{cat.nome}</span>
                      <span className="text-xs text-gray-400">
                        {generoLabel(cat.genero as GeneroCategoria)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {cat.valor_inscricao > 0 ? formatBRL(cat.valor_inscricao) : "Grátis"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Rascunho: aviso de que ainda não está visível */}
          {!publicado && (
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="font-semibold text-amber-900">Ainda é um rascunho</p>
              <p className="mt-0.5 text-sm text-amber-700">
                Só você consegue ver. Publique pra abrir as inscrições — no
                próximo passo a gente explica a taxa e configura seu recebimento.
              </p>
            </div>
          )}

          {/* Publicado mas sem PIX (segurança — não deveria acontecer após o fluxo de publicar) */}
          {publicado && temCategoriaPaga && !temChavePix && (
            <Link
              href={`/painel/campeonatos/${id}/financeiro`}
              className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <DollarSign className="size-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-amber-900">Falta 1 passo: configure seu PIX</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Pra receber o dinheiro das inscrições, cadastre a chave PIX onde
                  você quer receber. Sem isso, os atletas não conseguem se inscrever.
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                  Configurar agora <ArrowRight className="size-3" />
                </p>
              </div>
            </Link>
          )}

          {/* Ações */}
          {!publicado ? (
            <div className="space-y-3">
              <Link
                href={`/painel/campeonatos/${id}/publicar`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                <Rocket className="size-4" /> Quero publicar
              </Link>
              <Link
                href={`/campeonatos/${id}?voltar=criado`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 px-6 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                <Eye className="size-4" /> Ver página pública (prévia)
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                href={`/painel/campeonatos/${id}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                <LayoutDashboard className="size-4" /> Ir para o painel do campeonato
              </Link>
              <Link
                href={`/campeonatos/${id}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 px-6 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
              >
                <ExternalLink className="size-4" /> Ver página pública
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
