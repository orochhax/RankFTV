import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Tag, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRangeBR, generoLabel } from "@/lib/format";
import type { ChampionshipStatus } from "@/lib/types";
import { InscricaoMenu } from "@/components/inscricoes/InscricaoMenu";

type TeamRow = {
  id: string;
  status: string;
  championship_id: string;
  category_id: string;
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
  convite_pendente: { label: "Aguardando parceiro", className: "bg-amber-100 text-amber-700" },
  confirmado:       { label: "Dupla confirmada",    className: "bg-blue-100 text-blue-700" },
  cancelado:        { label: "Cancelado",           className: "bg-red-100 text-red-600" },
};

const PAG_STATUS: Record<string, { label: string; className: string }> = {
  pendente:  { label: "Aguardando pagamento", className: "bg-amber-100 text-amber-700" },
  pago:      { label: "Pago",                className: "bg-emerald-100 text-emerald-700" },
  estornado: { label: "Estornado",           className: "bg-red-100 text-red-600" },
};

export default async function MinhasInscricoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Duplas onde o atleta é atleta1 ou atleta2, com campeonato + categoria + pagamento
  const { data: rawTeams } = await supabase
    .from("teams")
    .select(`
      id, status, championship_id, category_id,
      championships(id, nome, data_inicio, data_fim, cidade, estado, status),
      championship_categories(nome, genero, valor_inscricao),
      registrations(id, status_pagamento)
    `)
    .or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const teams = (rawTeams ?? []) as unknown as TeamRow[];

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
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
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

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-8">

          {total === 0 ? (
            /* Estado vazio */
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <Trophy className="size-8 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Nenhuma inscrição ainda</p>
                <p className="mt-1 text-sm text-gray-500">
                  Explore os campeonatos e inscreva sua dupla.
                </p>
              </div>
              <Link
                href="/campeonatos"
                className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Ver campeonatos
              </Link>
            </div>
          ) : (
            <>
              {/* Ativos / abertos */}
              {ativos.length > 0 && (
                <InscricaoSection
                  titulo="Em andamento ou com inscrições abertas"
                  teams={ativos}
                />
              )}

              {/* Outros (rascunho etc.) */}
              {outros.length > 0 && (
                <InscricaoSection titulo="Próximos" teams={outros} />
              )}

              {/* Encerrados */}
              {encerrados.length > 0 && (
                <InscricaoSection titulo="Encerrados" teams={encerrados} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InscricaoSection({
  titulo,
  teams,
}: {
  titulo: string;
  teams: TeamRow[];
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
