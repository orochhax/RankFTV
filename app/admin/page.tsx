import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTournamentsForAdmin } from "@/lib/supabase/ranking";

const ADMIN_EMAIL = "carlosrocha0923@gmail.com";

const COLOCACAO_LABEL: Record<number, string> = {
  1: "🥇 1º",
  2: "🥈 2º",
  3: "🥉 3º",
};

const TIER_BADGE: Record<string, string> = {
  nacional: "bg-yellow-100 text-yellow-800",
  regional: "bg-blue-100 text-blue-800",
  local: "bg-gray-100 text-gray-700",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) redirect("/");

  const tournaments = await getTournamentsForAdmin();

  // Agrupar por ano
  const byYear = new Map<number, typeof tournaments>();
  for (const t of tournaments) {
    const list = byYear.get(t.ano) ?? [];
    list.push(t);
    byYear.set(t.ano, list);
  }
  const sortedYears = [...byYear.keys()].sort((a, b) => b - a);

  // Contar atletas únicos
  const athleteSet = new Set<string>();
  for (const t of tournaments) {
    for (const r of t.results) {
      if (r.athlete_instagram) athleteSet.add(r.athlete_instagram);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Painel Admin — RankFTV
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Acesso restrito · {user.email}
        </p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Torneios", value: tournaments.length },
          { label: "Resultados", value: tournaments.reduce((s, t) => s + t.results.length, 0) },
          { label: "Atletas", value: athleteSet.size },
          { label: "Anos", value: sortedYears.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl bg-white p-4 text-center ring-1 ring-black/5"
          >
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Torneios por ano */}
      {sortedYears.map((ano) => {
        const ts = byYear.get(ano)!;
        const masc = ts.flatMap((t) =>
          t.results.filter((r) => r.athlete_genero === "masculino")
        );
        const fem = ts.flatMap((t) =>
          t.results.filter((r) => r.athlete_genero === "feminino")
        );

        return (
          <section key={ano} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">{ano}</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                {ts.length} torneios · {masc.length / 2 | 0} resultados masc ·{" "}
                {fem.length / 2 | 0} fem
              </span>
            </div>

            <div className="space-y-3">
              {ts.map((t) => {
                const mascRes = t.results.filter(
                  (r) => r.athlete_genero === "masculino"
                );
                const femRes = t.results.filter(
                  (r) => r.athlete_genero === "feminino"
                );

                return (
                  <div
                    key={t.id}
                    className="rounded-xl bg-white p-4 ring-1 ring-black/5"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE[t.tier] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {t.tier}
                      </span>
                      <p className="font-semibold text-gray-800">
                        {t.nome_circuito}
                      </p>
                      <p className="text-sm text-gray-400 ml-auto">
                        {new Date(t.data + "T12:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {mascRes.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-1.5">
                            MASCULINO
                          </p>
                          <ul className="space-y-1">
                            {/* agrupa em duplas (colocação) */}
                            {[1, 2, 3].map((col) => {
                              const pair = mascRes.filter(
                                (r) => r.colocacao === col
                              );
                              if (pair.length === 0) return null;
                              return (
                                <li
                                  key={col}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="w-8 text-xs text-gray-500">
                                    {COLOCACAO_LABEL[col]}
                                  </span>
                                  <span className="text-gray-700">
                                    {pair
                                      .map((r) => r.athlete_nome)
                                      .join(" & ")}
                                  </span>
                                  <span className="ml-auto text-xs text-gray-400">
                                    {pair[0]?.pontos} pts
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {femRes.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-1.5">
                            FEMININO
                          </p>
                          <ul className="space-y-1">
                            {[1, 2, 3].map((col) => {
                              const pair = femRes.filter(
                                (r) => r.colocacao === col
                              );
                              if (pair.length === 0) return null;
                              return (
                                <li
                                  key={col}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="w-8 text-xs text-gray-500">
                                    {COLOCACAO_LABEL[col]}
                                  </span>
                                  <span className="text-gray-700">
                                    {pair
                                      .map((r) => r.athlete_nome)
                                      .join(" & ")}
                                  </span>
                                  <span className="ml-auto text-xs text-gray-400">
                                    {pair[0]?.pontos} pts
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {tournaments.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
          <p className="text-gray-400 text-sm">
            Nenhum torneio cadastrado ainda. Execute o seed SQL no Supabase.
          </p>
        </div>
      )}
    </div>
  );
}
