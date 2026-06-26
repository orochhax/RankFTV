import Link from "next/link";
import { Building2, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ArenasPage() {
  const supabase = await createClient();

  const { data: arenas } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado, descricao, avatar_url")
    .order("created_at", { ascending: false });

  const lista = arenas ?? [];

  // Busca contagem de alunos ativos para cada arena
  const counts = await Promise.all(
    lista.map(async (a) => {
      const { count } = await supabase
        .from("arena_students")
        .select("id", { count: "exact", head: true })
        .eq("arena_id", a.id)
        .eq("status", "ativo");
      return { id: a.id, alunos: count ?? 0 };
    }),
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.id, c.alunos]));

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-2xl space-y-2">
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Arenas</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Encontre sua arena</h1>
          <p className="text-sm text-white/50">
            Arenas de futevôlei parceiras da plataforma. Entre e acompanhe sua evolução.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          {lista.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-4 size-12 text-gray-200" />
              <p className="font-semibold text-gray-700">Em breve</p>
              <p className="mt-1 text-sm text-gray-400">
                As primeiras arenas parceiras chegam em breve.
              </p>
              <Link
                href="/perfil/ativar-arena"
                className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Cadastrar minha arena
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {lista.map((a) => (
                <Link
                  key={a.id}
                  href={`/arenas/${a.handle}`}
                  className="flex items-start gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 transition-shadow hover:shadow-sm"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatar_url} alt={a.nome} className="size-12 rounded-xl object-cover" />
                    ) : (
                      <Building2 className="size-6 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{a.nome}</p>
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="size-3" />
                      {a.cidade}/{a.estado}
                    </p>
                    {a.descricao && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{a.descricao}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                    <Users className="size-3" />
                    {countMap[a.id] ?? 0}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
