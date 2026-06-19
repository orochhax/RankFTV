import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Users, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { BracketCategoryView } from "@/components/chaveamento/BracketView";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InscricaoButton } from "@/components/campeonatos/InscricaoButton";
import { CHAMPIONSHIPS, getChampionshipById, resolveDuplas } from "@/lib/mock/championships";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { getAthleteById } from "@/lib/mock/athletes";
import { getBracket } from "@/lib/mock/brackets";
import { getBannerUrl } from "@/lib/mock/banners";
import { formatBRL, formatDateRangeBR, generoLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { recomendarCategoria } from "@/lib/motor-categoria";

/* Tipo unificado para renderizar duplas (mock ou banco) */
type AtletaDisplay = {
  id:          string;
  nome:        string;
  username:    string;
  avatarColor: string;
  fotoUrl?:    string | null;
};
type DuplaDisplay = {
  id:              string;
  categoriaNome:   string;
  categoriaGenero: "masculino" | "feminino" | "mista" | string;
  atleta1:         AtletaDisplay | null;
  atleta2:         AtletaDisplay | null;
};

const AVATAR_COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-teal-500"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Detalhe do campeonato — ver ftv.md seção 8.4: regulamento, categorias com
// valor, localização e lista pública de duplas inscritas.
export async function generateStaticParams() {
  return CHAMPIONSHIPS.map((c) => ({ id: c.id }));
}

export default async function CampeonatoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ voltar?: string }>;
}) {
  const { id } = await params;
  const { voltar } = await searchParams;
  // Tenta os campeonatos de exemplo (mock); se não achar, busca no banco.
  const championship = getChampionshipById(id) ?? (await getDbChampionshipById(id));
  if (!championship) notFound();

  // Quando aberto como prévia a partir do card de criação, "voltar" retorna lá.
  const voltarCriado = voltar === "criado";
  const backHref  = voltarCriado ? `/painel/campeonatos/${id}/criado` : "/campeonatos";
  const backLabel = voltarCriado ? "Voltar" : "Campeonatos";

  const supabase    = await createClient();
  const organizador = getAthleteById(championship.organizadorId);
  const bannerUrl   = getBannerUrl(championship.id);
  const isMock      = !!getChampionshipById(id);

  /* ── Duplas: mock vs banco ── */
  let duplas: DuplaDisplay[] = [];

  if (isMock) {
    duplas = resolveDuplas(championship).map((t) => ({
      id:              t.id,
      categoriaNome:   t.categoriaNome,
      categoriaGenero: t.categoriaGenero,
      atleta1: t.atleta1 ? { id: t.atleta1.id, nome: t.atleta1.nome, username: t.atleta1.username, avatarColor: t.atleta1.avatarColor } : null,
      atleta2: t.atleta2 ? { id: t.atleta2.id, nome: t.atleta2.nome, username: t.atleta2.username, avatarColor: t.atleta2.avatarColor } : null,
    }));
  } else {
    const { data: regs } = await supabase
      .from("registrations")
      .select("team_id")
      .eq("championship_id", id)
      .eq("status_pagamento", "pago");

    if (regs && regs.length > 0) {
      const teamIds = [...new Set(regs.map((r) => r.team_id as string))];

      const { data: teams } = await supabase
        .from("teams")
        .select("id, atleta1_id, atleta2_id, category_id")
        .in("id", teamIds);

      const athleteIdSet = new Set<string>();
      for (const t of teams ?? []) {
        athleteIdSet.add(t.atleta1_id);
        if (t.atleta2_id) athleteIdSet.add(t.atleta2_id);
      }

      const [profilesRes, catsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, username, foto_url")
          .in("id", Array.from(athleteIdSet)),
        supabase
          .from("championship_categories")
          .select("id, nome, genero")
          .in("id", [...new Set((teams ?? []).map((t) => t.category_id))]),
      ]);

      const profMap = Object.fromEntries((profilesRes.data ?? []).map((p) => [p.id, p]));
      const catMap  = Object.fromEntries((catsRes.data  ?? []).map((c) => [c.id, c]));

      duplas = (teams ?? []).map((t) => {
        const cat = catMap[t.category_id] ?? { nome: "—", genero: "masculino" };
        const p1  = profMap[t.atleta1_id];
        const p2  = t.atleta2_id ? profMap[t.atleta2_id] : null;
        return {
          id:              t.id,
          categoriaNome:   cat.nome,
          categoriaGenero: cat.genero as string,
          atleta1: p1 ? { id: t.atleta1_id, nome: p1.nome, username: p1.username ?? "", avatarColor: avatarColor(t.atleta1_id), fotoUrl: p1.foto_url ?? null } : null,
          atleta2: p2 ? { id: t.atleta2_id, nome: p2.nome, username: p2.username ?? "", avatarColor: avatarColor(t.atleta2_id), fotoUrl: p2.foto_url ?? null } : null,
        };
      });
    }
  }

  // Rating do usuário logado (opcional — visitante não tem)
  const { data: { user } } = await supabase.auth.getUser();
  let meuRating = 0;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("rating")
      .eq("id", user.id)
      .single();
    meuRating = p?.rating ?? 0;
  }

  // Verifica se existe bracket no banco para este campeonato
  const { count: bracketCount } = await supabase
    .from("bracket_matches")
    .select("id", { count: "exact", head: true })
    .eq("championship_id", id);
  const hasDbBracket = (bracketCount ?? 0) > 0;

  const categoriasParaMotor = championship.categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    corte_rating_min: c.corteRatingMin,
    corte_rating_max: c.corteRatingMax,
  }));
  const catRecomendada = meuRating > 0
    ? recomendarCategoria(meuRating, categoriasParaMotor)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> {backLabel}
      </Link>

      <div>
        {bannerUrl ? (
          <div className="relative h-32 overflow-hidden rounded-2xl">
            <Image
              src={bannerUrl}
              alt={championship.nome}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : (
          <div
            className={`flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br ${championship.bannerFrom} ${championship.bannerTo}`}
          />
        )}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{championship.nome}</h1>
            <p className="text-gray-500">{championship.descricao}</p>
          </div>
          <StatusBadge status={championship.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>{formatDateRangeBR(championship.dataInicio, championship.dataFim)}</span>
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            {championship.local}, {championship.cidade} - {championship.estado}
          </span>
          {organizador && (
            <span>
              Organizado por{" "}
              <Link href={`/atletas/${organizador.username}`} className="font-medium text-blue-600 hover:underline">
                {organizador.nome}
              </Link>
            </span>
          )}
        </div>
        {(hasDbBracket || getBracket(championship.id)) && (
          <div className="mt-4">
            <Link
              href={`/campeonatos/${championship.id}/chaveamento`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Trophy className="size-4" />
              Ver chaveamento
            </Link>
          </div>
        )}
      </div>

      {/* Chaveamento inline — só aparece quando o camp está em andamento */}
      {championship.status === "em_andamento" && hasDbBracket && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Trophy className="size-5 text-blue-500" />
              Chaveamento ao vivo
            </h2>
            <Link
              href={`/campeonatos/${championship.id}/chaveamento`}
              className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Ver completo <ChevronRight className="size-4" />
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Acesse o chaveamento completo pelo link acima.
          </p>
        </section>
      )}
      {championship.status === "em_andamento" && !hasDbBracket && (() => {
        const bracket = getBracket(championship.id);
        if (!bracket) return null;
        const cat = bracket.categories[0];
        return (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Trophy className="size-5 text-blue-500" />
                Chaveamento ao vivo
              </h2>
              {bracket.categories.length > 1 && (
                <Link
                  href={`/campeonatos/${championship.id}/chaveamento`}
                  className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Ver todas as categorias <ChevronRight className="size-4" />
                </Link>
              )}
            </div>
            <BracketCategoryView category={cat} />
          </section>
        );
      })()}

      {/* Mapa */}
      <div className="flex h-32 items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500 ring-1 ring-black/5">
        <MapPin className="mr-2 size-4" /> Mapa de {championship.local} (em breve)
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Regulamento</h2>
        <p className="text-sm leading-relaxed text-gray-600">{championship.regulamento}</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Categorias e inscrição</h2>
        <div className="space-y-3">
          {championship.categorias.map((cat) => {
            const isRecomendada = catRecomendada?.id === cat.id;
            return (
            <div
              key={cat.id}
              className={`rounded-2xl bg-white p-4 ring-1 ${isRecomendada ? "ring-green-400 bg-green-50" : "ring-black/5"}`}
            >
              {/* Topo: info + preço */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">
                      Categoria {cat.nome} · {generoLabel(cat.genero)}
                    </p>
                    {isRecomendada && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Recomendada para você
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {cat.corteRatingMin > 0
                      ? `Pontuação mínima ${cat.corteRatingMin}`
                      : "Aberta para todos os níveis"}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-gray-900">{formatBRL(cat.valorInscricao)}</span>
              </div>
              {/* Botão sempre na linha de baixo, largura total */}
              <div className="mt-3">
                <InscricaoButton
                  categoriaNome={cat.nome}
                  championshipId={championship.id}
                  categoryId={cat.id}
                  status={championship.status}
                />
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Users className="size-5" /> Duplas inscritas ({duplas.length})
        </h2>
        {duplas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma dupla inscrita ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {duplas.map((t) => (
              <li key={t.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  Categoria {t.categoriaNome} · {generoLabel(t.categoriaGenero as "masculino" | "feminino" | "mista")}
                </p>
                <div className="space-y-2">
                  {[t.atleta1, t.atleta2].map(
                    (atleta) =>
                      atleta && (
                        <Link
                          key={atleta.id}
                          href={`/atletas/${atleta.username}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Avatar nome={atleta.nome} color={atleta.avatarColor} fotoUrl={atleta.fotoUrl} size="sm" />
                          <span className="text-sm text-gray-800">{atleta.nome}</span>
                        </Link>
                      ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
