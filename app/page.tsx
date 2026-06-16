import Link from "next/link";
import { Bell, ChevronRight, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ChampionshipCard } from "@/components/campeonatos/ChampionshipCard";
import { categoriaFromRating, rankAthletes } from "@/lib/mock/athletes";
import { getChampionshipsForAthlete, sortedChampionships } from "@/lib/mock/championships";
import { CURRENT_USER_NOTIFICATIONS, getCurrentAthlete } from "@/lib/mock/current-user";
import { formatDateRangeBR } from "@/lib/format";

// Home — ver ftv.md seção 8.3. Por enquanto, sem login real ainda, sempre
// renderizamos como se o "atleta demo" estivesse logado (current-user.ts).
// O recorte de visitante (sem essas 3 seções extras) entra quando o Supabase
// Auth estiver de pé.
export default function Home() {
  const me = getCurrentAthlete();
  const meusCampeonatos = getChampionshipsForAthlete(me.id).filter(
    (c) => c.status === "inscricoes_abertas" || c.status === "em_andamento",
  );
  const destaques = sortedChampionships().slice(0, 3);
  const rankGeral = rankAthletes();
  const posicaoGeral = rankGeral.findIndex((a) => a.id === me.id) + 1;
  const rankEstado = rankAthletes({ estado: me.estado });
  const posicaoEstado = rankEstado.findIndex((a) => a.id === me.id) + 1;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <div className="flex items-center gap-3">
        <Avatar nome={me.nome} color={me.avatarColor} size="lg" />
        <div>
          <p className="text-sm text-gray-500">Bem-vindo de volta,</p>
          <h1 className="text-2xl font-semibold text-gray-900">{me.nome.split(" ")[0]}</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Resumo de nível/rating + posição no ranking */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 md:col-span-1">
          <h2 className="text-sm font-semibold text-gray-500">Meu nível</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            Categoria {categoriaFromRating(me.rating)}
          </p>
          <p className="text-sm text-gray-500">Rating {me.rating}</p>
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p>
              #{posicaoGeral} no rank geral do Brasil
            </p>
            <p>
              #{posicaoEstado} no rank de {me.estado}
            </p>
          </div>
          <Link
            href="/rank"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            Ver Rank completo <ChevronRight className="size-4" />
          </Link>
        </section>

        {/* Meus próximos campeonatos inscritos */}
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 md:col-span-2">
          <h2 className="text-sm font-semibold text-gray-500">Meus próximos campeonatos</h2>
          {meusCampeonatos.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Você ainda não tem inscrições confirmadas.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {meusCampeonatos.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/campeonatos/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl p-2 -m-2 hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{c.nome}</p>
                      <p className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="size-3.5" />
                        {c.cidade} - {c.estado} · {formatDateRangeBR(c.dataInicio, c.dataFim)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Notificações recentes */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500">
          <Bell className="size-4" /> Notificações recentes
        </h2>
        <ul className="mt-3 divide-y divide-gray-100">
          {CURRENT_USER_NOTIFICATIONS.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-2.5">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${n.lida ? "bg-transparent" : "bg-blue-600"}`}
                aria-hidden="true"
              />
              <p className={`text-sm ${n.lida ? "text-gray-500" : "text-gray-900"}`}>{n.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Campeonatos em destaque — isso é o que o visitante (não logado) também vê */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">Campeonatos em destaque</h2>
          <Link href="/campeonatos" className="text-sm font-medium text-blue-600 hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destaques.map((c) => (
            <ChampionshipCard key={c.id} championship={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
