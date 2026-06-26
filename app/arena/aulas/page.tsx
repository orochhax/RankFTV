import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AulasManager } from "@/components/arena/AulasManager";

export default async function AulasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome")
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) redirect("/perfil/ativar-arena");

  const { data: aulas } = await supabase
    .from("arena_classes")
    .select("id, titulo, horario, dias_semana, ativo")
    .eq("arena_id", arena.id)
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {arena.nome}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Aulas e treinos</h1>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
          <AulasManager aulas={aulas ?? []} />
        </div>
      </div>
    </div>
  );
}
