import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Tag, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRangeBR, generoLabel } from "@/lib/format";
import type { ChampionshipStatus } from "@/lib/types";
import { InscricaoMenu } from "@/components/inscricoes/InscricaoMenu";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";

type TeamRow = {
  id: string;
  status: string;
  championship_id: string;
  category_id: string;
  atleta1_id: string;
  championships: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim: string;
    cidade: string;
    estado: string;
    status: string;
  } | null;
  championship_categories: {
    nome: string;
    genero: string;
    valor_inscricao: number;
  } | null;
  registrations: { id: string; status_pagamento: string }[] | null;
};

const TEAM_STATUS: Record<string, { label: string; className: string }> = {
  convite_pendente:   { label: "Aguardando parceiro",  className: "bg-amber-100 text-amber-700" },
  aguardando_pagamento: { label: "Aguardando pagamento", className: "bg-amber-100 text-amber-700" },
  confirmado:         { label: "Dupla confirmada",     className: "bg-blue-100 text-blue-700" },
  cancelado:          { label: "Cancelado",            className: "bg-red-100 text-red-600" },
};

const PAG_STATUS: Record<string, { label: string; className: string }> = {
  pendente:  { label: "Aguardando pagamento", className: "bg-amber-100 text-amber-700" },
  pago:      { label: "Pago",                className: "bg-blue-100 text-blue-700" },
  estornado: { label: "Estornado",           className: "bg-red-100 text-red-600" },
};

export default async function MinhasInscricoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Duplas onde o atleta é atleta1 ou atleta2, com campeonato + categoria + pagamento
  const [{ data: rawTeams }, { data: meProfile }] = await Promise.all([
    supabase
      .from("teams")
      .select(`
        id, status, championship_id, category_id, atleta1_id,
        championships(id, nome, data_inicio, data_fim, cidade, estado, status),
        championship_categories(nome, genero, valor_inscricao),
        registrations(id, status_pagamento)
      `)
      .or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("tamanho_camisa").eq("id", user.id).maybeSingle(),
  ]);

  const teams = (rawTeams ?? []) as unknown as TeamRow[];
  const semTamanho = !meProfile?.tamanho_camisa;

  // Separa por status do campeonato
  const ativos    = teams.filter((t) => {
    const s = t.championships?.status;
    return s === "inscricoes_abertas" || s === "em_andamento";
  });
  const encerrados = teams.filter((t) => t.championships?.status === "encerrado");
  const outros     = teams.filter((t) => {
    const s = t.championships?.status;
    return s !== "inscricoes_abertas" && s !== "em_andamento" && s !== "encerrado";
  });

  const total = teams.length;

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho: faixa escura no mobile, PageHeader claro no desktop ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6 md:hidden">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Início
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Minhas inscrições</h1>
            <p className="mt-1 text-sm text-white/40">
              {total === 0
                ? "Você ainda não está inscrito em nenhum campeonato"
                : `${total} ${total === 1 ? "campeonato" : "campeonatos"}`}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden border-b border-border bg-surface md:block">
        <PageContainer width="form" className="py-8">
          <PageHeader
            title="Minhas inscrições"
            description={
              total === 0
                ? "Você ainda não está inscrito em nenhum campeonato."
                : `${total} ${total === 1 ? "campeonato" : "campeonatos"}`
            }
          />
        </PageContainer>
      </div>

      {/* ── Corpo: sheet arredondada no mobile, fundo neutro no desktop ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:shadow-none">
        <PageContainer width="form" className="space-y-8">

          {total === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Nenhuma inscrição ainda"
              description="Explore os campeonatos e inscreva sua dupla."
              actionLabel="Ver campeonatos"
              actionHref="/campeonatos"
            />
          ) : (
            <>
              {/* Ativos / abertos */}
              {ativos.length > 0 && (
                <InscricaoSection
                  titulo="Em andamento ou com inscrições abertas"
                  teams={ativos}
                  userId={user.id}
                  semTamanho={semTamanho}
                />
              )}

              {/* Outros (rascunho etc.) */}
              {outros.length > 0 && (
                <InscricaoSection titulo="Próximos" teams={outros} userId={user.id} semTamanho={semTamanho} />
              )}

              {/* Encerrados */}
              {encerrados.length > 0 && (
                <InscricaoSection titulo="Encerrados" teams={encerrados} userId={user.id} semTamanho={semTamanho} />
              )}
            </>
          )}
        </PageContainer>
      </div>
    </div>
  );
}

function InscricaoSection({
  titulo,
  teams,
  userId,
  semTamanho,
}: {
  titulo: string;
  teams: TeamRow[];
  userId: string;
  semTamanho: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {titulo}
      </h2>
      <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
        {teams.map((t) => {
          const champ = t.championships;
          if (!champ) return null;
          const cat = t.championship_categories;
          const pag = t.registrations?.[0];
          const teamStatusCfg = TEAM_STATUS[t.status] ?? { label: t.status, className: "bg-gray-100 text-gray-500" };
          const pagStatusCfg = pag ? PAG_STATUS[pag.status_pagamento] : null;

          const uniformePendente = semTamanho && t.status === "confirmado" && t.atleta1_id !== userId;
          return (
            <li key={t.id} className="flex items-center gap-2 px-4 py-4 transition-colors hover:bg-gray-50">
              <Link
                href={`/minhas-inscricoes/${champ.id}`}
                className="min-w-0 flex-1 space-y-1.5"
              >
                <p className="truncate font-semibold text-gray-900">{champ.nome}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formatDateRangeBR(champ.data_inicio, champ.data_fim)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {champ.cidade} — {champ.estado}
                  </span>
                  {cat && (
                    <span className="flex items-center gap-1">
                      <Tag className="size-3" />
                      {cat.nome} · {generoLabel(cat.genero as "masculino" | "feminino" | "mista")}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={champ.status as ChampionshipStatus} />
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${teamStatusCfg.className}`}>
                    {teamStatusCfg.label}
                  </span>
                  {pagStatusCfg && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${pagStatusCfg.className}`}>
                      {pagStatusCfg.label}
                    </span>
                  )}
                  {uniformePendente && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      👕 Escolher tamanho do uniforme
                    </span>
                  )}
                </div>
              </Link>

              <InscricaoMenu
                teamId={t.id}
                champId={champ.id}
                regId={pag?.id}
                teamStatus={t.status}
                pagStatus={pag?.status_pagamento}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
