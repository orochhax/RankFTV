import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, UserPen, ShieldCheck, Users } from "lucide-react";
import { aceitarConvite, recusarConvite } from "./convite-actions";
import { Avatar } from "@/components/ui/Avatar";
import { SignOutButton } from "@/components/perfil/SignOutButton";
import { SeriesCard } from "@/components/campeonatos/SeriesCard";
import { createClient } from "@/lib/supabase/server";
import { SERIES } from "@/lib/mock/series";

const COLOCACAO_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const Q_LABELS = {
  tempo: {
    menos_1: "Joga há menos de 1 ano",
    "1_3":   "Joga há 1 a 3 anos",
    "3_6":   "Joga há 3 a 6 anos",
    mais_6:  "Joga há mais de 6 anos",
  },
  nivel: {
    recreativo:  "Só recreativo",
    amador:      "Nível amador (campeonatos locais)",
    competitivo: "Nível competitivo (campeonatos estaduais)",
    alto_nivel:  "Alto nível (regionais/nacionais)",
  },
  frequencia: {
    "1x":      "Treina 1x por semana ou menos",
    "2_3x":    "Treina 2 a 3x por semana",
    "4_5x":    "Treina 4 a 5x por semana",
    todo_dia:  "Treina todos os dias",
  },
  melhor_resultado: {
    nunca:     "Nunca participou de campeonato",
    sem_podio: "Já participou, sem pódio",
    top4:      "Melhor resultado: top 4",
    campeao:   "Já foi campeão ou vice",
  },
  categoria_usual: {
    nunca:   "Nunca competiu em campeonato",
    D:       "Compete na categoria D",
    C:       "Compete na categoria C",
    B:       "Compete na categoria B",
    A_elite: "Compete na categoria A ou Elite",
  },
} as const;
const TIER_LABEL: Record<string, string> = {
  nacional: "Nacional",
  regional: "Regional",
  local: "Local",
};

const COR_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-50 ring-yellow-200 text-yellow-800",
  blue:   "bg-blue-50   ring-blue-200   text-blue-800",
  green:  "bg-green-50  ring-green-200  text-green-800",
  purple: "bg-purple-50 ring-purple-200 text-purple-800",
  gray:   "bg-gray-50   ring-gray-200   text-gray-700",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, username, bio, foto_url, questionario, rating")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const [
    { data: campeonatosOrganizados },
    { data: historico },
    { data: conquistas },
    { data: followedSeriesData },
    { data: organizerAccount },
  ] = await Promise.all([
    supabase
      .from("championships")
      .select("id, nome, status")
      .eq("organizador_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("ranking_entries")
      .select("id, colocacao, pontos, parceiro_nome, nome_circuito, tier, data")
      .eq("user_id", user.id)
      .order("data", { ascending: false }),

    supabase
      .from("conquistas")
      .select("id, titulo, descricao, icone, cor, data_conquistada")
      .eq("user_id", user.id)
      .order("data_conquistada", { ascending: false }),

    supabase
      .from("series_followers")
      .select("series_id")
      .eq("user_id", user.id),

    supabase
      .from("organizer_accounts")
      .select("habilitado")
      .eq("user_id", user.id)
      .single(),
  ]);

  // Convites de dupla pendentes (outros atletas adicionaram este usuário como parceiro)
  const { data: convitesRaw } = await supabase
    .from("teams")
    .select("id, atleta1_id, championship_id, category_id, championships(nome), championship_categories(nome)")
    .eq("atleta2_id", user.id)
    .eq("status", "convite_pendente");

  type ConviteRow = {
    id: string;
    atleta1_id: string;
    championship_id: string;
    category_id: string;
    championships: { nome: string } | null;
    championship_categories: { nome: string } | null;
  };
  const convitesBase = (convitesRaw ?? []) as unknown as ConviteRow[];

  // Busca nomes dos atletas que enviaram convite
  const atleta1Ids = [...new Set(convitesBase.map((c) => c.atleta1_id))];
  const { data: atleta1Profiles } = atleta1Ids.length > 0
    ? await supabase.from("profiles").select("id, nome, username").in("id", atleta1Ids)
    : { data: [] };
  const profMap = Object.fromEntries((atleta1Profiles ?? []).map((p) => [p.id, p]));

  const convites = convitesBase.map((c) => ({
    ...c,
    atleta1: profMap[c.atleta1_id] ?? null,
  }));

  const total = campeonatosOrganizados?.length ?? 0;
  const totalPontos = historico?.reduce((s, r) => s + r.pontos, 0) ?? 0;

  const followedSeriesIds = followedSeriesData?.map((f) => f.series_id) ?? [];
  const seriesSeguidas = SERIES.filter((s) => followedSeriesIds.includes(s.id));

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">

      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Avatar
          nome={profile.nome}
          color="bg-blue-500"
          size="lg"
          fotoUrl={profile.foto_url}
        />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{profile.nome}</h1>
          <p className="text-gray-500">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-1 text-sm text-gray-600">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Convites de dupla pendentes */}
      {convites.length > 0 && (
        <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Users className="size-4" />
            Convites de dupla ({convites.length})
          </h2>
          <div className="mt-3 space-y-3">
            {convites.map((c) => (
              <div key={c.id} className="rounded-xl bg-white p-4 ring-1 ring-amber-100">
                <p className="font-medium text-gray-900">{c.championships?.nome ?? "Campeonato"}</p>
                <p className="text-sm text-gray-500">Categoria {c.championship_categories?.nome ?? "—"}</p>
                {c.atleta1 && (
                  <p className="mt-1 text-sm text-gray-600">
                    Convite de{" "}
                    <span className="font-medium">{c.atleta1.nome}</span>
                    {" "}
                    <span className="text-gray-400">@{c.atleta1.username}</span>
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <form action={aceitarConvite}>
                    <input type="hidden" name="team_id" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      Aceitar
                    </button>
                  </form>
                  <form action={recusarConvite}>
                    <input type="hidden" name="team_id" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Recusar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nível / Questionário */}
      {profile.questionario ? (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500">Perfil de atleta</h2>
            {profile.rating > 0 && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {profile.rating} pts
              </span>
            )}
          </div>
          <ul className="mt-3 space-y-1.5">
            {(["tempo", "nivel", "frequencia", "melhor_resultado", "categoria_usual"] as const).map((key) => {
              const val = (profile.questionario as Record<string, string>)[key];
              const label = val ? (Q_LABELS[key] as Record<string, string>)[val] : null;
              return label ? (
                <li key={key} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-gray-300">·</span>
                  {label}
                </li>
              ) : null;
            })}
          </ul>
        </section>
      ) : (
        <Link
          href="/perfil/questionario"
          className="flex items-center justify-between rounded-2xl bg-blue-600 px-5 py-4 text-white hover:bg-blue-700"
        >
          <div>
            <p className="text-sm font-semibold">Defina seu nível de atleta</p>
            <p className="mt-0.5 text-xs text-blue-200">
              5 perguntas · aparece no seu perfil público
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0" />
        </Link>
      )}

      {/* Organizador — logo abaixo do perfil */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-500">Organizador</h2>
        {organizerAccount?.habilitado ? (
          /* Conta ativa → acesso ao painel */
          <>
            <p className="mt-2 text-sm text-gray-600">
              {total > 0
                ? `Você organiza ${total} ${total === 1 ? "campeonato" : "campeonatos"}.`
                : "Sua conta de organizador está ativa. Crie seu primeiro campeonato."}
            </p>
            <Link
              href="/painel"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ir pro Painel do organizador <ChevronRight className="size-4" />
            </Link>
          </>
        ) : organizerAccount && !organizerAccount.habilitado ? (
          /* Conta criada mas pendente de aprovação */
          <p className="mt-2 text-sm text-gray-500">
            Conta de organizador em análise. Você receberá uma notificação quando
            for aprovada.
          </p>
        ) : (
          /* Ainda não ativou */
          <>
            <p className="mt-2 text-sm text-gray-600">
              Qualquer atleta pode criar campeonatos. Pra receber os repasses, falta
              completar CPF/CNPJ e telefone (necessário pro split de pagamento).
            </p>
            <Link
              href="/perfil/ativar-organizador"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ativar conta de organizador <ChevronRight className="size-4" />
            </Link>
          </>
        )}
      </section>

      {/* Conquistas */}
      {conquistas && conquistas.length > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="text-sm font-semibold text-gray-500">
            Conquistas
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
              {conquistas.length}
            </span>
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {conquistas.map((c) => (
              <div
                key={c.id}
                title={c.descricao ?? c.titulo}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${COR_CLASSES[c.cor] ?? COR_CLASSES.gray}`}
              >
                <span className="text-base leading-none">{c.icone}</span>
                <span>{c.titulo}</span>
                {c.data_conquistada && (
                  <span className="opacity-60 text-xs">
                    {new Date(c.data_conquistada + "T12:00:00").getFullYear()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Histórico */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500">Histórico de campeonatos</h2>
          {historico && historico.length > 0 && (
            <span className="text-xs font-medium text-gray-400">
              {totalPontos.toLocaleString("pt-BR")} pts totais
            </span>
          )}
        </div>

        {!historico || historico.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            Seu histórico e ranking aparecerão aqui conforme você participa de campeonatos.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {historico.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
              >
                <span className="text-lg leading-none">
                  {COLOCACAO_EMOJI[r.colocacao] ?? `${r.colocacao}º`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {r.nome_circuito}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {r.parceiro_nome && ` · com ${r.parceiro_nome}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-700">{r.pontos} pts</p>
                  <p className="text-xs text-gray-400">{TIER_LABEL[r.tier] ?? r.tier}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Campeonatos que sigo */}
      {seriesSeguidas.length > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500">
              Campeonatos que sigo
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
                {seriesSeguidas.length}
              </span>
            </h2>
            <Link
              href="/campeonatos"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Explorar mais
            </Link>
          </div>
          <div className="space-y-3">
            {seriesSeguidas.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                initialFollowing
                userId={user.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Opções de conta */}
      <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        <Link
          href="/perfil/editar"
          className="flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
        >
          <UserPen className="size-5 shrink-0 text-gray-400" />
          <span className="flex-1">Editar perfil</span>
          <ChevronRight className="size-4 text-gray-300" />
        </Link>
        <Link
          href="/perfil/conta"
          className="flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
        >
          <ShieldCheck className="size-5 shrink-0 text-gray-400" />
          <span className="flex-1">Dados da conta</span>
          <ChevronRight className="size-4 text-gray-300" />
        </Link>
        <SignOutButton />
      </section>

    </div>
  );
}
