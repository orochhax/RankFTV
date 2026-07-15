import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import { getLivChampionships } from "@/lib/supabase/championships";

export default async function AoVivoPage() {
  const camps = await getLivChampionships();

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-5xl space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Campeonatos
          </Link>
          <div className="flex items-center gap-3">
            <Radio className="size-6 animate-pulse text-red-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Ao vivo agora</h1>
          </div>
          {camps.length > 0 && (
            <p className="text-sm text-white/50">
              {camps.length} {camps.length === 1 ? "campeonato acontecendo" : "campeonatos acontecendo"} agora
            </p>
          )}
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-5xl">
          {camps.length === 0 ? (
            <div className="py-16 text-center">
              <Radio className="mx-auto mb-4 size-10 text-gray-200" />
              <p className="font-semibold text-gray-700">Nenhum campeonato ao vivo</p>
              <p className="mt-1 text-sm text-gray-400">
                Quando um campeonato estiver em andamento ele aparece aqui.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Ver todos os campeonatos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {camps.map((c) => (
                <ChampionshipCard key={c.id} championship={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
