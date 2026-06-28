import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlanosAdminClient } from "@/components/arena/PlanosAdminClient";

export default async function PlanosArenaPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const { handle } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("dono_id", user.id);

  if (handle) query = query.eq("handle", handle);
  else query = query.order("created_at", { ascending: true });

  const { data: arena } = await query.maybeSingle();
  if (!arena) redirect("/perfil/ativar-arena");

  const { data: plans } = await supabase
    .from("arena_plans")
    .select("id, tipo, nome, descricao, valor, ativo, ordem, aceita_credito, aceita_debito, dia_vencimento")
    .eq("arena_id", arena.id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  const backHref = arena.handle ? `/arena/${arena.handle}` : "/arena";

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {arena.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Tag className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Planos</h1>
          </div>
          <p className="text-sm text-white/50">
            Configure os planos de mensalidade e opção de aluguel da quadra.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
          <PlanosAdminClient
            plans={plans ?? []}
            handle={arena.handle}
          />
        </div>
      </div>
    </div>
  );
}
