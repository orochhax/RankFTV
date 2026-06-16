import Link from "next/link";
import { Trophy } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RatingSparkline } from "@/components/ui/RatingSparkline";
import { categoriaFromRating, rankAthletes } from "@/lib/mock/athletes";
import { getChampionshipsForAthlete } from "@/lib/mock/championships";
import { fakeRatingHistory } from "@/lib/mock/rating-history";
import { formatDateRangeBR } from "@/lib/format";
import type { Athlete } from "@/lib/mock/types";

// Bloco "público" do perfil — usado tanto em /atletas/[username] (perfil de
// qualquer um) quanto em /perfil (o seu, que tem isso + dados privados em
// volta). Ver ftv.md seção 8.6. Mantém uma única fonte pra não duplicar JSX.
export function AthletePublicInfo({ athlete }: { athlete: Athlete }) {
  const posicaoGeral = rankAthletes().findIndex((a) => a.id === athlete.id) + 1;
  const posicaoEstado = rankAthletes({ estado: athlete.estado }).findIndex((a) => a.id === athlete.id) + 1;
  const campeonatos = getChampionshipsForAthlete(athlete.id);
  const historico = fakeRatingHistory(athlete.rating);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Categoria</p>
          <p className="text-xl font-bold text-gray-900">{categoriaFromRating(athlete.rating)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Rank Brasil</p>
          <p className="text-xl font-bold text-gray-900">#{posicaoGeral}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Rank {athlete.estado}</p>
          <p className="text-xl font-bold text-gray-900">#{posicaoEstado}</p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-500">Evolução do rating</h2>
        <p className="text-2xl font-bold text-gray-900">{athlete.rating}</p>
        <div className="mt-2">
          <RatingSparkline points={historico} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Trophy className="size-5" /> Conquistas
        </h2>
        {athlete.conquistas.length === 0 ? (
          <p className="text-sm text-gray-500">Ainda sem conquistas registradas.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {athlete.conquistas.map((c) => (
              <li key={c} className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800">
                🏆 {c}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Histórico de campeonatos</h2>
        {campeonatos.length === 0 ? (
          <p className="text-sm text-gray-500">Ainda não jogou nenhum campeonato na plataforma.</p>
        ) : (
          <ul className="space-y-2">
            {campeonatos.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/campeonatos/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{c.nome}</p>
                    <p className="text-sm text-gray-500">{formatDateRangeBR(c.dataInicio, c.dataFim)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
