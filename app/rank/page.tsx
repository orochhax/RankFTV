import Link from "next/link";
import { getAvailableYears, getRanking } from "@/lib/supabase/ranking";

const MEDALHA = ["🥇", "🥈", "🥉"];
const TIER_LABEL: Record<string, string> = {
  nacional: "Nacional",
  regional: "Regional",
  local: "Local",
};

export default async function RankPage({
  searchParams,
}: {
  searchParams: Promise<{ genero?: string; ano?: string }>;
}) {
  const { genero: generoParam, ano: anoParam } = await searchParams;

  const genero =
    generoParam === "feminino" ? "feminino" : ("masculino" as const);
  const anoRaw = anoParam === "all" ? "all" : parseInt(anoParam ?? "");
  const anos = await getAvailableYears();
  const anoAtual = new Date().getFullYear();
  const ano: number | "all" = anoRaw === "all" ? "all" : isNaN(anoRaw as number) ? anoAtual : (anoRaw as number);

  const ranking = await getRanking(genero, ano);

  const labelAno =
    ano === "all" ? "Todos os tempos" : String(ano);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Ranking</h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        {/* Gênero */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          <Link
            href={`/rank?genero=masculino&ano=${anoParam ?? anoAtual}`}
            className={`px-4 py-2 transition-colors ${
              genero === "masculino"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Masculino
          </Link>
          <Link
            href={`/rank?genero=feminino&ano=${anoParam ?? anoAtual}`}
            className={`px-4 py-2 border-l border-gray-200 transition-colors ${
              genero === "feminino"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Feminino
          </Link>
        </div>

        {/* Ano */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/rank?genero=${genero}&ano=all`}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              ano === "all"
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todos os tempos
          </Link>
          {anos.map((a) => (
            <Link
              key={a}
              href={`/rank?genero=${genero}&ano=${a}`}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                ano === a
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {a}
            </Link>
          ))}
        </div>
      </div>

      {/* Cabeçalho do período */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">
            {genero === "masculino" ? "Masculino" : "Feminino"}
          </span>{" "}
          · {labelAno} · {ranking.length} atletas
        </p>
      </div>

      {/* Tabela */}
      {ranking.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
          <p className="text-sm text-gray-400">
            Nenhum resultado para esse período ainda.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {ranking.map((atleta, i) => (
            <li key={atleta.athlete_id}>
              <div className="flex items-center gap-4 p-3.5">
                <span className="w-7 shrink-0 text-center text-sm font-semibold text-gray-500">
                  {MEDALHA[i] ?? i + 1}
                </span>

                {/* Avatar inicial */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {atleta.nome.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {atleta.nome}
                  </p>
                  {atleta.instagram && (
                    <p className="text-xs text-gray-400">
                      @{atleta.instagram}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-semibold text-gray-900">
                    {atleta.total_pontos.toLocaleString("pt-BR")} pts
                  </p>
                  <p className="text-xs text-gray-400">
                    {atleta.total_torneios}{" "}
                    {atleta.total_torneios === 1 ? "torneio" : "torneios"}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="text-center text-xs text-gray-400">
        Pontuação: torneio Nacional = 1º 300pts · 2º 180pts · 3º 105pts.
        Dados de torneios verificados manualmente.
      </p>
    </div>
  );
}
