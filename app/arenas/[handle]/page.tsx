import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Users, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { EntrarNaArenaButtons } from "@/components/arena/EntrarNaArenaButtons";

const AVATAR_COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-rose-500"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function categoriaLabel(rating: number) {
  if (rating >= 1850) return "A";
  if (rating >= 1550) return "B";
  if (rating >= 1200) return "C";
  return "D";
}

export default async function ArenaPublicaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado, descricao, avatar_url, banner_url")
    .eq("handle", handle)
    .maybeSingle();

  if (!arena) notFound();

  // Alunos ativos com perfil para o ranking
  const { data: alunos } = await supabase
    .from("arena_students")
    .select("user_id, profiles(id, nome, username, foto_url, rating)")
    .eq("arena_id", arena.id)
    .eq("status", "ativo");

  type ProfileRow = { id: string; nome: string; username: string; foto_url: string | null; rating: number };
  function getProfile(raw: unknown): ProfileRow | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] as ProfileRow ?? null;
    return raw as ProfileRow;
  }

  const ranking = (alunos ?? [])
    .map((a) => ({ ...getProfile(a.profiles), userId: a.user_id }))
    .filter((a): a is ProfileRow & { userId: string } => !!a.id)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  // Verifica vínculo do usuário logado
  let vinculo: { status: string } | null = null;
  if (user) {
    const { data: v } = await supabase
      .from("arena_students")
      .select("status")
      .eq("arena_id", arena.id)
      .eq("user_id", user.id)
      .maybeSingle();
    vinculo = v;
  }

  const isAluno = vinculo?.status === "ativo";

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-4">
          <Link
            href="/arenas"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Arenas
          </Link>

          {arena.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={arena.banner_url} alt={arena.nome} className="h-28 w-full rounded-2xl object-cover" />
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800">
              <Building2 className="size-10 text-white/60" />
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
              {arena.avatar_url
                ? <img src={arena.avatar_url} alt={arena.nome} className="size-14 rounded-xl object-cover" /> // eslint-disable-line @next/next/no-img-element
                : <Building2 className="size-7 text-white/60" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{arena.nome}</h1>
              <p className="flex items-center gap-1 text-sm text-white/50">
                <MapPin className="size-3.5" /> {arena.cidade}/{arena.estado}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
                <Users className="size-3" /> {ranking.length} alunos ativos
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl space-y-6">

          {arena.descricao && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {arena.descricao}
            </p>
          )}

          <EntrarNaArenaButtons
            arenaId={arena.id}
            vinculo={vinculo}
            userId={user?.id ?? null}
          />

          {/* Ranking dos alunos — visível para todos, destaca o aluno logado */}
          {ranking.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="size-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-gray-700">Ranking da arena</h2>
              </div>
              <ul className="space-y-2">
                {ranking.map((a, i) => {
                  const isMe = user?.id === a.userId;
                  return (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
                        isMe ? "bg-blue-50 ring-blue-100" : "bg-white ring-black/5"
                      }`}
                    >
                      <span className="w-6 shrink-0 text-center text-sm font-bold text-gray-400">
                        {i + 1 === 1 ? "🥇" : i + 1 === 2 ? "🥈" : i + 1 === 3 ? "🥉" : `${i + 1}º`}
                      </span>
                      <Avatar
                        nome={a.nome}
                        color={avatarColor(a.id)}
                        size="sm"
                        fotoUrl={a.foto_url}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? "text-blue-800" : "text-gray-900"}`}>
                          {a.nome}
                          {isMe && <span className="ml-1.5 text-xs font-normal text-blue-500">(você)</span>}
                        </p>
                        <Link
                          href={`/atletas/${a.username}`}
                          className="text-xs text-gray-400 hover:underline"
                        >
                          @{a.username}
                        </Link>
                      </div>
                      {a.rating > 0 && (
                        <div className="shrink-0 text-right">
                          <span className="text-xs font-bold text-gray-700">
                            {categoriaLabel(a.rating)}
                          </span>
                          <p className="text-[10px] text-gray-400">{a.rating} pts</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
