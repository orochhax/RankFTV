import Link from "next/link";
import {
  getRankingDupla,
  getRankingIndividual,
  type Genero,
} from "@/lib/supabase/ranking";
import { RankInfoButton } from "@/components/rank/RankInfoButton";

const MEDALHA = ["🥇", "🥈", "🥉"];

// Ranking público — dados da Liga Brasileira de Futevôlei (ver ftv.md 8.5).
// Dois eixos de filtro: Gênero (Masculino/Feminino) × Tipo (Individual/Dupla).
export default async function RankPage({
  searchParams,
}: {
  searchParams: Promise<{ genero?: string; tipo?: string }>;
}) {
  const { genero: generoParam, tipo: tipoParam } = await searchParams;

  const genero: Genero = generoParam === "feminino" ? "feminino" : "masculino";
  const tipo: "individual" | "dupla" =
    tipoParam === "dupla" ? "dupla" : "individual";

  const individual =
    tipo === "individual" ? await getRankingIndividual(genero) : [];
  const duplas = tipo === "dupla" ? await getRankingDupla(genero) : [];
  const total = tipo === "individual" ? individual.length : duplas.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ranking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Liga Brasileira de Futevôlei
          </p>
        </div>
        <RankInfoButton
          atualizadoEm="17/06/2026"
          detalhe="54ª etapa do Team Águia Footvolley Cup"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        {/* Gênero */}
        <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm font-medium">
          <Link
            href={`/rank?genero=masculino&tipo=${tipo}`}
            className={`px-4 py-2 transition-colors ${
              genero === "masculino"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Masculino
          </Link>
          <Link
            href={`/rank?genero=feminino&tipo=${tipo}`}
            className={`border-l border-gray-200 px-4 py-2 transition-colors ${
              genero === "feminino"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Feminino
          </Link>
        </div>

        {/* Tipo */}
        <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm font-medium">
          <Link
            href={`/rank?genero=${genero}&tipo=individual`}
            className={`px-4 py-2 transition-colors ${
              tipo === "individual"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Individual
          </Link>
          <Link
            href={`/rank?genero=${genero}&tipo=dupla`}
            className={`border-l border-gray-200 px-4 py-2 transition-colors ${
              tipo === "dupla"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Dupla
          </Link>
        </div>
      </div>

      {/* Cabeçalho do período */}
      <p className="text-sm text-gray-500">
        <span className="font-medium text-gray-700">
          {genero === "masculino" ? "Masculino" : "Feminino"}
        </span>{" "}
        · {tipo === "individual" ? "Individual" : "Dupla"} · {total}{" "}
        {tipo === "individual"
          ? total === 1
            ? "atleta"
            : "atletas"
          : total === 1
            ? "dupla"
            : "duplas"}
      </p>

      {/* Tabela */}
      {total === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
          <p className="text-sm text-gray-400">
            Nenhum dado de ranking para esse filtro ainda.
          </p>
        </div>
      ) : tipo === "individual" ? (
        <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {individual.map((atleta, i) => (
            <li key={atleta.id}>
              <div className="flex items-center gap-4 p-3.5">
                <span className="w-7 shrink-0 text-center text-sm font-semibold text-gray-500">
                  {MEDALHA[i] ?? i + 1}
                </span>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {atleta.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {atleta.nome}
                  </p>
                  {atleta.instagram && (
                    <p className="text-xs text-gray-400">@{atleta.instagram}</p>
                  )}
                </div>
                <p className="shrink-0 font-semibold text-gray-900">
                  {atleta.pontos.toLocaleString("pt-BR")} pts
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {duplas.map((dupla, i) => (
            <li key={dupla.id}>
              <div className="flex items-center gap-4 p-3.5">
                <span className="w-7 shrink-0 text-center text-sm font-semibold text-gray-500">
                  {MEDALHA[i] ?? i + 1}
                </span>
                {/* Dois avatares sobrepostos */}
                <div className="flex shrink-0">
                  <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 ring-2 ring-white">
                    {dupla.atleta1.charAt(0).toUpperCase()}
                  </div>
                  <div className="-ml-3 flex size-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 ring-2 ring-white">
                    {dupla.atleta2.charAt(0).toUpperCase()}
                  </div>
                </div>
                <p className="min-w-0 flex-1 truncate font-medium text-gray-900">
                  {dupla.atleta1} <span className="text-gray-400">&amp;</span>{" "}
                  {dupla.atleta2}
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
        Dados oficiais da Liga Brasileira de Futevôlei. Classificação acumulada
        da temporada — individual e por dupla.
      </p>
    </div>
  );
}
