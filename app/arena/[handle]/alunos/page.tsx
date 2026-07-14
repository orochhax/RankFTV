import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  nome: string;
  username: string;
};

function profileOf(value: unknown): ProfileRow | null {
  if (Array.isArray(value)) return (value[0] as ProfileRow | undefined) ?? null;
  return (value as ProfileRow | null) ?? null;
}

export default async function ArenaAlunosPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/alunos`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const { data: alunos } = await supabase
    .from("arena_students")
    .select("id, status, data_entrada, valor_mensalidade, profiles(nome, username)")
    .eq("arena_id", arena.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-6 py-8">
      <Link
        href={`/arena/${arena.handle}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="size-4" /> Voltar ao painel
      </Link>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{arena.nome}</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Users className="size-6" /> Alunos
        </h1>
      </div>

      {(alunos ?? []).length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-8 text-center text-sm text-gray-500 ring-1 ring-black/5">
          Nenhum aluno vinculado a esta arena.
        </p>
      ) : (
        <ul className="space-y-2">
          {(alunos ?? []).map((aluno) => {
            const profile = profileOf(aluno.profiles);
            return (
              <li key={aluno.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{profile?.nome ?? "Usuário"}</p>
                    <p className="text-xs text-gray-500">@{profile?.username ?? "sem-usuario"}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      aluno.status === "ativo"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {aluno.status === "ativo" ? "Ativo" : "Pendente"}
                  </span>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  <span>Entrada: {aluno.data_entrada ?? "não informada"}</span>
                  <span>
                    Mensalidade: {aluno.valor_mensalidade == null
                      ? "não definida"
                      : `R$ ${Number(aluno.valor_mensalidade).toFixed(2).replace(".", ",")}`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
