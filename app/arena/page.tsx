import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AceitarAlunoButton } from "@/components/arena/AceitarAlunoButton";
import { CopyCodeButton } from "@/components/arena/CopyCodeButton";

type ProfileRow = { nome: string; username: string; foto_url: string | null };
function perfil(raw: unknown): ProfileRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] as ProfileRow ?? null;
  return raw as ProfileRow;
}

export default async function ArenaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado, invite_code")
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) redirect("/perfil/ativar-arena");

  const { data: alunos } = await supabase
    .from("arena_students")
    .select("id, status, data_entrada, valor_mensalidade, profiles(nome, username, foto_url)")
    .eq("arena_id", arena.id)
    .order("created_at", { ascending: false });

  const ativos    = (alunos ?? []).filter((a) => a.status === "ativo");
  const pendentes = (alunos ?? []).filter((a) => a.status === "pendente");

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-2xl space-y-2">
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Painel da arena</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">{arena.nome}</h1>
          <p className="text-sm text-white/50">{arena.cidade}/{arena.estado}</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
              <p className="text-xs text-gray-400">Alunos ativos</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{ativos.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
              <p className="text-xs text-gray-400">Pendentes</p>
              <p className={`mt-1 text-2xl font-bold ${pendentes.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
                {pendentes.length}
              </p>
            </div>
          </div>

          {/* Código de convite */}
          <div className="rounded-2xl bg-blue-50 px-5 py-4 ring-1 ring-blue-100">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Código de convite</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-blue-900">
                {arena.invite_code}
              </span>
              <CopyCodeButton code={arena.invite_code} />
            </div>
            <p className="mt-1 text-xs text-blue-600">
              Compartilhe com seus alunos. Eles entram em{" "}
              <strong>/arenas/{arena.handle}</strong> e usam o código para entrar automaticamente.
            </p>
          </div>

          {/* Pedidos pendentes */}
          {pendentes.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Pedidos de entrada ({pendentes.length})
                </h2>
              </div>
              <ul className="space-y-2">
                {pendentes.map((a) => {
                  const p = perfil(a.profiles);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p?.nome ?? "—"}</p>
                        <p className="text-xs text-gray-400">@{p?.username}</p>
                      </div>
                      <AceitarAlunoButton alunoId={a.id} arenaId={arena.id} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Alunos ativos */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Users className="size-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                Alunos ativos ({ativos.length})
              </h2>
            </div>
            {ativos.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
                Nenhum aluno ainda. Compartilhe o código de convite.
              </p>
            ) : (
              <ul className="space-y-2">
                {ativos.map((a) => {
                  const p = perfil(a.profiles);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p?.nome ?? "—"}</p>
                          <p className="text-xs text-gray-400">
                            @{p?.username}
                            {a.data_entrada &&
                              ` · desde ${new Date(a.data_entrada + "T12:00:00").toLocaleDateString(
                                "pt-BR",
                                { month: "short", year: "numeric" },
                              )}`}
                          </p>
                        </div>
                      </div>
                      {a.valor_mensalidade && (
                        <span className="text-xs font-medium text-gray-500">
                          R$ {Number(a.valor_mensalidade).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Ações secundárias */}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5">
              <span className="text-sm text-gray-600">Aulas e treinos</span>
              <Link href="/arena/aulas" className="text-sm font-medium text-blue-600 hover:underline">
                Gerenciar
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5">
              <span className="text-sm text-gray-600">Financeiro e mensalidades</span>
              <Link href="/arena/financeiro" className="text-sm font-medium text-blue-600 hover:underline">
                Ver
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5">
              <span className="text-sm text-gray-600">Assinatura da plataforma</span>
              <Link href="/arena/assinatura" className="text-sm font-medium text-blue-600 hover:underline">
                Ver
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="size-4 text-gray-400" />
                Página pública
              </div>
              <Link
                href={`/arenas/${arena.handle}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Ver vitrine
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
