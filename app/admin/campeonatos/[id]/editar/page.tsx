import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CampeonatoVitrineForm, type CampeonatoVitrineExistente } from "@/components/admin/CampeonatoVitrineForm";

export const dynamic = "force-dynamic";

type Status = "inscricoes_abertas" | "em_andamento" | "encerrado";
const STATUS_VALIDOS: Status[] = ["inscricoes_abertas", "em_andamento", "encerrado"];

export default async function EditarCampeonatoVitrinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  // Edição admin só existe pra campeonatos vitrine — os reais de organizador
  // (com categoria/preço/inscrição) são editados no painel do próprio dono.
  const admin = createAdminClient();
  const { data: champ } = await admin
    .from("championships")
    .select("id, nome, descricao, regulamento, data_inicio, data_fim, cidade, estado, local, status, banner_url, banner_position_x, banner_position_y, is_vitrine")
    .eq("id", id)
    .eq("is_vitrine", true)
    .maybeSingle();

  if (!champ) notFound();

  const campeonato: CampeonatoVitrineExistente = {
    id: champ.id,
    nome: champ.nome,
    descricao: champ.descricao ?? "",
    regulamento: champ.regulamento ?? "",
    dataInicio: champ.data_inicio,
    dataFim: champ.data_fim,
    cidade: champ.cidade,
    estado: champ.estado,
    local: champ.local ?? "",
    status: STATUS_VALIDOS.includes(champ.status as Status) ? (champ.status as Status) : "inscricoes_abertas",
    bannerUrl: champ.banner_url,
    bannerPositionX: champ.banner_position_x,
    bannerPositionY: champ.banner_position_y,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <Link
        href="/admin/campeonatos"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Campeonatos
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Editar campeonato vitrine</h1>
        <p className="mt-1 text-sm text-gray-500">{campeonato.nome}</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Sem categoria, sem questionário de nível e sem chave PIX. A página pública mostra
          só as informações do evento (data, local, regulamento).
        </p>
      </div>

      <CampeonatoVitrineForm campeonato={campeonato} />
    </div>
  );
}
