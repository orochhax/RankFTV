import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, UserPen, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SignOutButton } from "@/components/perfil/SignOutButton";
import { PageCard } from "@/components/campeonatos/PageCard";
import { createClient } from "@/lib/supabase/server";
import { getFollowedPageIds, getMyPages } from "@/lib/supabase/pages";

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, username, bio, foto_url, questionario, rating, genero")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const [
    { data: campeonatosOrganizados },
    { data: historico },
    { data: conquistas },
    { data: organizerAccount },
    followedPageIds,
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
      .from("organizer_accounts")
      .select("habilitado")
      .eq("user_id", user.id)
      .single(),

    getFollowedPageIds(user.id),
  ]);

  const total = campeonatosOrganizados?.length ?? 0;
  const totalPontos = historico?.reduce((s, r) => s + r.pontos, 0) ?? 0;

  // Busca as pages que o usuário segue (só as suas próprias não contam — usa IDs dos follows)
  const todasPages = followedPageIds.length > 0 ? await getMyPages(user.id) : [];
  // Pages que o usuário segue mas não é dono: precisamos buscar de forma diferente
  // Simplificado: mostra todas as pages que o usuário segue via page_followers
  const { data: followedPagesData } = followedPageIds.length > 0
    ? await supabase
        .from("pages")
        .select("id, owner_id, nome, handle, descricao, banner_from, banner_to, banner_url, avatar_url, created_at")
        .in("id", followedPageIds)
    : { data: [] };

  // Contagem de seguidores para cada page seguida
  const seguedPages = await Promise.all(
    (followedPagesData ?? []).map(async (p) => {
      const { count } = await supabase
        .from("page_followers")
        .select("id", { count: "exact", head: true })
        .eq("page_id", p.id);
      return {
        id: p.id,
        ownerId: p.owner_id,
        nome: p.nome,
        handle: p.handle,
        descricao: p.descricao,
        bannerFrom: p.banner_from,
        bannerTo: p.banner_to,
        bannerUrl: p.banner_url ?? null,
        avatarUrl: p.avatar_url ?? null,
        createdAt: p.created_at,
        seguidores: count ?? 0,
        edicoes: 0,
      };
    }),
  );
  void todasPages; // unused after refactor

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8 pb-32">

      <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors w-fit">
        <ArrowLeft className="size-4" />
        Início
      </Link>

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

      {/* Aviso: respondeu o questionário antes da pergunta de gênero existir */}
      {profile.questionario && !profile.genero && (
        <Link
          href="/perfil/questionario"
          className="flex items-center justify-between rounded-2xl bg-amber-50 px-5 py-4 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
        >
          <div>
            <p className="text-sm font-semibold">Falta informar seu gênero</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Precisamos disso para indicar as categorias certas (masculina,
              feminina ou mista) nos campeonatos.
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0" />
        </Link>
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

      {/* Organizador */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-500">Organizador</h2>
        {organizerAccount?.habilitado ? (
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
          <p className="mt-2 text-sm text-gray-500">
            Conta de organizador em análise. Você receberá uma notificação quando
            for aprovada.
          </p>
        ) : (
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

      {/* Páginas que sigo */}
      {seguedPages.length > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500">
              Páginas que sigo
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
                {seguedPages.length}
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
            {seguedPages.map((p) => (
              <PageCard
                key={p.id}
                page={p}
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
