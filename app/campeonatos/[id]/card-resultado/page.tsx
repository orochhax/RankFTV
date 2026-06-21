import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CardResultadoGenerator } from "@/components/campeonatos/CardResultadoGenerator";

// Gerador do card de resultado (PNG transparente pra story).
// Acesso: o organizador do campeonato OU um atleta inscrito (dupla).
// Os dados são preenchidos à mão por enquanto; quando o chaveamento ao vivo
// existir (Fase 2), dá pra pré-preencher com o campeão automaticamente.
export default async function CardResultadoPage({
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
    .select("nome, cidade, estado, organizador_id")
    .eq("id", id)
    .maybeSingle();
  if (!champ) notFound();

  const isOrganizer = champ.organizador_id === user.id;

  let isParticipante = false;
  if (!isOrganizer) {
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("championship_id", id)
      .neq("status", "cancelado")
      .or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle();
    isParticipante = !!team;
  }

  if (!isOrganizer && !isParticipante) notFound();

  const tituloInicial = `${champ.nome} - ${champ.cidade}`;
  const voltarHref = isOrganizer ? `/painel/campeonatos/${id}` : `/minhas-inscricoes/${id}`;

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Card de resultado</h1>
          </div>
          <p className="text-sm text-white/50">
            Monte a imagem do resultado pra postar no story. Preencha os dados, baixe o PNG
            transparente e coloque por cima da foto da galera.
          </p>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl">
          <CardResultadoGenerator
            championshipId={id}
            tituloInicial={tituloInicial}
            marcaInicial={champ.nome.split(" ")[0] ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
