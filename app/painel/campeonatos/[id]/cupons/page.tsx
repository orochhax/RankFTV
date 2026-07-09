import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CuponsManager } from "@/components/painel/CuponsManager";

export default async function CuponsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, organizador_id")
    .eq("id", id)
    .maybeSingle();
  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  const { data: cupons } = await supabase
    .from("coupons")
    .select("id, codigo, tipo_desconto, valor_desconto, aplica_em, quantidade_maxima, usos_atuais, data_fim, ativo")
    .eq("championship_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {champ.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Tag className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Cupons de desconto</h1>
          </div>
          <p className="text-sm text-white/50">
            Códigos que os compradores aplicam na inscrição de atleta ou no ingresso de plateia.
          </p>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl">
          <CuponsManager champId={id} cupons={cupons ?? []} />
        </div>
      </div>
    </div>
  );
}
