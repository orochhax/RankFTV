import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ArenaIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: arenas } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado, banner_url")
    .eq("dono_id", user.id)
    .order("created_at", { ascending: true });

  if (!arenas || arenas.length === 0) redirect("/perfil/ativar-arena");
  if (arenas.length === 1) redirect(`/arena/${arenas[0].handle}`);

  // Múltiplas arenas — picker
  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-xl space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
            Minhas arenas
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Qual arena você quer gerenciar?
          </h1>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl space-y-3">
          {arenas.map((a) => (
            <Link
              key={a.id}
              href={`/arena/${a.handle}`}
              className="flex items-center gap-4 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 transition-shadow hover:shadow-md"
            >
              {/* Thumb do banner */}
              <div className="relative h-20 w-24 shrink-0 bg-gradient-to-br from-blue-700 to-blue-900">
                {a.banner_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.banner_url}
                    alt={a.nome}
                    className="h-full w-full object-cover"
                  />
                )}
                {!a.banner_url && (
                  <div className="flex h-full items-center justify-center">
                    <Building2 className="size-6 text-white/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 py-3">
                <p className="font-bold text-gray-900 truncate">{a.nome}</p>
                <p className="text-xs text-gray-400">{a.cidade}/{a.estado}</p>
              </div>

              <ChevronRight className="mr-4 size-5 shrink-0 text-gray-300" />
            </Link>
          ))}

          <Link
            href="/perfil/ativar-arena"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 py-4 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            + Cadastrar nova arena
          </Link>
        </div>
      </div>
    </div>
  );
}
