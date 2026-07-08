import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, UserPen, ShieldCheck, ShoppingBag } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SignOutButton } from "@/components/perfil/SignOutButton";
import { createClient } from "@/lib/supabase/server";

const COLOCACAO_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const GENERO_LABEL: Record<string, string> = {
  masculino: "Masculino",
  feminino:  "Feminino",
  outro:     "Outro",
};

const TIER_LABEL: Record<string, string> = {
  nacional: "Nacional",
  regional: "Regional",
  local: "Local",
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
    { data: organizerAccount },
    { data: minhaArena },
    { data: vinculoArena },
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
      .from("organizer_accounts")
      .select("habilitado")
      .eq("user_id", user.id)
      .single(),

    supabase
      .from("arenas")
      .select("id, nome, handle")
      .eq("dono_id", user.id)
      .maybeSingle(),

    supabase
      .from("arena_students")
      .select("status, arenas(nome)")
      .eq("user_id", user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle(),
  ]);

  const total = campeonatosOrganizados?.length ?? 0;
  const totalPontos = historico?.reduce((s, r) => s + r.pontos, 0) ?? 0;

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

      {/* Minhas Compras */}
      <Link
        href="/minhas-compras"
        className="flex items-center justify-between rounded-2xl bg-white p-5 ring-1 ring-black/5 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <ShoppingBag className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Minhas Compras</p>
            <p className="text-xs text-gray-400">Ingressos comprados ou aguardando pagamento</p>
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-gray-300" />
      </Link>

      {/* Gênero */}
      {profile.genero ? (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="text-sm font-semibold text-gray-500">Gênero</h2>
          <p className="mt-2 text-sm text-gray-700">
            {GENERO_LABEL[profile.genero] ?? profile.genero}
          </p>
        </section>
      ) : (
        <Link
          href="/perfil/questionario"
          className="flex items-center justify-between rounded-2xl bg-blue-600 px-5 py-4 text-white hover:bg-blue-700"
        >
          <div>
            <p className="text-sm font-semibold">Informe seu gênero</p>
            <p className="mt-0.5 text-xs text-blue-200">
              Necessário para se inscrever nas categorias certas
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

      {/* Aluno de arena — marcar presença */}
      {vinculoArena?.status === "ativo" && (
        <Link
          href="/arena/presenca"
          className="flex items-center justify-between rounded-2xl bg-blue-600 px-5 py-4 text-white hover:bg-blue-700"
        >
          <div>
            <p className="text-sm font-semibold">Marcar presença</p>
            <p className="mt-0.5 text-xs text-blue-200">
              {(vinculoArena.arenas as { nome?: string } | null)?.nome ?? "Sua arena"}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0" />
        </Link>
      )}

      {/* Arena */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-500">Arena</h2>
        {minhaArena ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Você é dono da <strong>{minhaArena.nome}</strong>.
            </p>
            <Link
              href="/arena"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ir pro painel da arena <ChevronRight className="size-4" />
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Gerencie alunos, presenças e mensalidades da sua arena pelo site.
            </p>
            <Link
              href="/perfil/ativar-arena"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Criar minha arena <ChevronRight className="size-4" />
            </Link>
          </>
        )}
      </section>

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
