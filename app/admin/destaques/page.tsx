import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublishedChampionships } from "@/lib/supabase/championships";
import { DestaquesEditor } from "@/components/admin/DestaquesEditor";

export default async function AdminDestaquesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const [campeonatos, configRow] = await Promise.all([
    getPublishedChampionships(),
    supabase.from("platform_config").select("destaques_ids").eq("id", 1).single(),
  ]);

  const destaques: string[] = (configRow.data?.destaques_ids as string[] | null) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-14 pt-8">
        <div className="mx-auto max-w-2xl space-y-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Admin
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20">
              <Star className="size-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Destaques da home</h1>
              <p className="text-sm text-white/50">Escolha até 3 campeonatos que aparecem em destaque para todos.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-white px-6 pb-16 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <DestaquesEditor campeonatos={campeonatos} initialDestaques={destaques} />
        </div>
      </div>
    </div>
  );
}
