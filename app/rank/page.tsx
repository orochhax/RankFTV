import Link from "next/link";
import {
  getRankingDupla,
  getRankingIndividual,
  type Genero,
} from "@/lib/supabase/ranking";
import { RankInfoButton } from "@/components/rank/RankInfoButton";
import { Avatar } from "@/components/ui/Avatar";

const AVATAR_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-rose-500", "bg-teal-500"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const MEDALHA = ["🥇", "🥈", "🥉"];

// Ranking público — dados da Liga Brasileira de Futevôlei (ver ftv.md 8.5).
// Dois eixos de filtro: Gênero (Masculino/Feminino) × Tipo (Individual/Dupla).
export default async function RankPage({
  searchParams,
}: {
  searchParams: Promise<{ genero?: string; tipo?: string; fonte?: string }>;
}) {
  const { genero: generoParam, tipo: tipoParam, fonte: fonteParam } = await searchParams;

  const genero: Genero = generoParam === "feminino" ? "feminino" : "masculino";
  const tipo: "individual" | "dupla" =
    tipoParam === "dupla" ? "dupla" : "individual";
  const fonte: "liga" | "geral" = fonteParam === "geral" ? "geral" : "liga";

  const individual =
    fonte === "liga" && tipo === "individual" ? await getRankingIndividual(genero) : [];
  const duplas = fonte === "liga" && tipo === "dupla" ? await getRankingDupla(genero) : [];
  const total = tipo === "individual" ? individual.length : duplas.length;

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Ranking</h1>
              <p className="mt-1 text-sm text-white/50">Liga Brasileira de Futevôlei</p>
            </div>
            <RankInfoButton
              atualizadoEm="17/06/2026"
              detalhe="54ª etapa do Team Águia Footvolley Cup"
            />
          </div>

          {/* Toggle Liga / Geral */}
          <div className="flex overflow-hidden rounded-xl border border-white/20 text-sm font-semibold">
            <Link
              href={`/rank?fonte=liga&genero=${genero}&tipo=${tipo}`}
              className={`flex flex-1 items-center justify-center gap-2 px-6 py-3 transition-colors ${
                fonte === "liga"
                  ? "bg-blue-600 text-white"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              Liga Brasileira
            </Link>
            <Link
              href={`/rank?fonte=geral&genero=${genero}&tipo=${tipo}`}
              className={`flex flex-1 items-center justify-center gap-2 border-l border-white/20 px-6 py-3 transition-colors ${
                fonte === "geral"
                  ? "bg-blue-600 text-white"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              Geral
            </Link>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            {/* Gênero */}
            <div className="flex overflow-hidden rounded-lg border border-white/20 text-sm font-medium">
              <Link
                href={`/rank?fonte=${fonte}&genero=masculino&tipo=${tipo}`}
                className={`px-4 py-2 transition-colors ${
                  genero === "masculino"
                    ? "bg-blue-600 text-white"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                Masculino
              </Link>
              <Link
                href={`/rank?fonte=${fonte}&genero=feminino&tipo=${tipo}`}
                className={`border-l border-white/20 px-4 py-2 transition-colors ${
                  genero === "feminino"
                    ? "bg-blue-600 text-white"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                Feminino
              </Link>
            </div>

            {/* Tipo */}
            <div className="flex overflow-hidden rounded-lg border border-white/20 text-sm font-medium">
              <Link
                href={`/rank?fonte=${fonte}&genero=${genero}&tipo=individual`}
                className={`px-4 py-2 transition-colors ${
                  tipo === "individual"
                    ? "bg-white text-gray-900"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                Individual
              </Link>
              <Link
                href={`/rank?fonte=${fonte}&genero=${genero}&tipo=dupla`}
                className={`border-l border-white/20 px-4 py-2 transition-colors ${
                  tipo === "dupla"
                    ? "bg-white text-gray-900"
                    : "text-white/60 hover:text-white/80"
                }`}
              >
                Dupla
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Seção branca com curva ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Cabeçalho do período */}
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {genero === "masculino" ? "Masculino" : "Feminino"}
            </span>{" "}
            · {tipo === "individual" ? "Individual" : "Dupla"}
            {fonte === "liga" && (
              <> · {total}{" "}
                {tipo === "individual"
                  ? total === 1 ? "atleta" : "atletas"
                  : total === 1 ? "dupla" : "duplas"}
              </>
            )}
          </p>

          {/* Tabela */}
          {fonte === "geral" ? (
            <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-black/5">
              <p className="text-base font-semibold text-gray-700">Ranking Geral em breve</p>
              <p className="mt-2 text-sm text-gray-400 max-w-sm mx-auto">
                O ranking geral reúne todos os atletas de campeonatos organizados na plataforma.
                Ficará disponível assim que os primeiros resultados forem registrados.
              </p>
            </div>
          ) : total === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
              <p className="text-sm text-gray-400">
                Nenhum dado de ranking para esse filtro ainda.
              </p>
            </div>
          ) : tipo === "individual" ? (
            <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              {individual.map((atleta, i) => {
                const inner = (
                  <div className="flex items-center gap-4 p-3.5">
                    <span className="w-7 shrink-0 text-center text-sm font-semibold text-gray-500">
                      {MEDALHA[i] ?? i + 1}
                    </span>
                    <Avatar
                      nome={atleta.nome}
                      color={avatarColor(atleta.id)}
                      fotoUrl={atleta.fotoUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{atleta.nome}</p>
                      {atleta.instagram && (
                        <p className="text-xs text-gray-400">@{atleta.instagram}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold text-gray-900">
                      {atleta.pontos.toLocaleString("pt-BR")} pts
                    </p>
                  </div>
                );
                return (
                  <li key={atleta.id}>
                    {atleta.username ? (
                      <Link href={`/atletas/${atleta.username}`} className="block hover:bg-gray-50 transition-colors">
                        {inner}
                      </Link>
                    ) : inner}
                  </li>
                );
              })}
            </ol>
          ) : (
            <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              {duplas.map((dupla, i) => (
                <li key={dupla.id}>
                  <div className="flex items-center gap-4 p-3.5">
                    <span className="w-7 shrink-0 text-center text-sm font-semibold text-gray-500">
                      {MEDALHA[i] ?? i + 1}
                    </span>
                    <div className="flex shrink-0">
                      <div className="ring-2 ring-white rounded-full">
                        <Avatar nome={dupla.atleta1} color={avatarColor(dupla.id + "1")} fotoUrl={dupla.atleta1Foto} size="sm" />
                      </div>
                      <div className="-ml-3 ring-2 ring-white rounded-full">
                        <Avatar nome={dupla.atleta2} color={avatarColor(dupla.id + "2")} fotoUrl={dupla.atleta2Foto} size="sm" />
                      </div>
                    </div>
                    <p className="min-w-0 flex-1 truncate font-medium text-gray-900">
                      {dupla.atleta1Username ? (
                        <Link href={`/atletas/${dupla.atleta1Username}`} className="hover:underline">{dupla.atleta1}</Link>
                      ) : dupla.atleta1}
                      {" "}<span className="text-gray-400">&amp;</span>{" "}
                      {dupla.atleta2Username ? (
                        <Link href={`/atletas/${dupla.atleta2Username}`} className="hover:underline">{dupla.atleta2}</Link>
                      ) : dupla.atleta2}
                    </p>
                    <p className="shrink-0 font-semibold text-gray-900">
                      {dupla.pontos.toLocaleString("pt-BR")} pts
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <p className="text-center text-xs text-gray-400">
            {fonte === "liga"
              ? "Dados oficiais da Liga Brasileira de Futevôlei. Classificação acumulada da temporada."
              : "Ranking calculado a partir de campeonatos organizados na RankFTV."}
          </p>
        </div>
      </div>
    </div>
  );
}
