import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 30;

type ProfileRow = { nome: string; username: string };
function profileOf(value: unknown): ProfileRow | null {
  if (Array.isArray(value)) return (value[0] as ProfileRow | undefined) ?? null;
  return (value as ProfileRow | null) ?? null;
}

function pageHref(handle: string, page: number) {
  return page > 1 ? `/arena/${handle}/alunos?page=${page}` : `/arena/${handle}/alunos`;
}

export default async function ArenaAlunosPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { handle } = await params;
  const query = await searchParams;
  const requestedPage = Number.parseInt(String(query.page ?? "1"), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/alunos`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const { data: alunos, count } = await supabase
    .from("arena_students")
    .select("id, status, data_entrada, valor_mensalidade, profiles(nome, username)", { count: "exact" })
    .eq("arena_id", arena.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) redirect(pageHref(handle, pages));

  return (
    <div className="w-full space-y-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <Users className="size-5" /> Alunos ({total})
      </h1>

      {(alunos ?? []).length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500 ring-1 ring-black/5">Nenhum aluno vinculado a esta arena.</p>
      ) : (
        <ul className="space-y-2">
          {(alunos ?? []).map((aluno) => {
            const profile = profileOf(aluno.profiles);
            return (
              <li key={aluno.id} className="rounded-lg bg-white p-4 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{profile?.nome ?? "Usuario"}</p>
                    <p className="truncate text-xs text-gray-500">@{profile?.username ?? "sem-usuario"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${aluno.status === "ativo" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {aluno.status === "ativo" ? "Ativo" : "Pendente"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Entrada: {aluno.data_entrada ?? "nao informada"}</span>
                  <span>Mensalidade: {aluno.valor_mensalidade == null ? "nao definida" : `R$ ${Number(aluno.valor_mensalidade).toFixed(2).replace(".", ",")}`}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {total > 0 && (
        <nav className="flex items-center justify-between border-t border-gray-200 pt-4" aria-label="Paginacao de alunos">
          <span className="text-sm text-gray-500">Pagina {Math.min(page, pages)} de {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={pageHref(handle, page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"><ChevronLeft className="size-4" /> Anterior</Link>}
            {page < pages && <Link href={pageHref(handle, page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">Proxima <ChevronRight className="size-4" /></Link>}
          </div>
        </nav>
      )}
    </div>
  );
}
