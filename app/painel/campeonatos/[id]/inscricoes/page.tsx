import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { InscricaoItem } from "@/components/inscricoes/InscricaoItem";

type RegRow = {
  id: string;
  valor: number;
  status_pagamento: "pago" | "pendente" | "estornado";
  category_id: string;
  teams: { id: string; atleta1_id: string; atleta2_id: string | null } | null;
  championship_categories: { id: string; nome: string; genero: string } | null;
};

type ProfileRow = { id: string; nome: string; username: string; nivel: string | null };

export default async function InscricoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { id }     = await params;
  const { filtro } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  const { data: rawRegs } = await supabase
    .from("registrations")
    .select(`
      id, valor, status_pagamento, category_id,
      teams(id, atleta1_id, atleta2_id),
      championship_categories(id, nome, genero)
    `)
    .eq("championship_id", id)
    .order("created_at", { ascending: false });

  const regs: RegRow[] = (rawRegs ?? []) as unknown as RegRow[];

  // Batch-fetch perfis com nivel
  const athleteIds = [
    ...new Set(
      regs.flatMap((r) =>
        r.teams
          ? [r.teams.atleta1_id, ...(r.teams.atleta2_id ? [r.teams.atleta2_id] : [])]
          : [],
      ),
    ),
  ];

  let profileMap: Record<string, ProfileRow> = {};
  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome, username, nivel")
      .in("id", athleteIds);
    profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p as ProfileRow]),
    );
  }

  const total     = regs.length;
  const pagos     = regs.filter((r) => r.status_pagamento === "pago").length;
  const pendentes = regs.filter((r) => r.status_pagamento === "pendente").length;

  const filtroAtivo =
    filtro === "pagos"     ? "pagos"     :
    filtro === "pendentes" ? "pendentes" :
    "todos";

  const lista =
    filtroAtivo === "pagos"     ? regs.filter((r) => r.status_pagamento === "pago")    :
    filtroAtivo === "pendentes" ? regs.filter((r) => r.status_pagamento !== "pago")    :
    regs;

  const FILTROS = [
    { key: "todos",     label: `Todos (${total})` },
    { key: "pagos",     label: `Pagos (${pagos})` },
    { key: "pendentes", label: `Pendentes (${pendentes})` },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-white">Inscrições</h1>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <Users className="size-4" />
                <p className="text-xs">Total</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{total}</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/20 p-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="size-4" />
                <p className="text-xs">Pagos</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{pagos}</p>
            </div>
            <div className="rounded-2xl bg-amber-500/20 p-4">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Clock className="size-4" />
                <p className="text-xs">Pendentes</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-amber-300">{pendentes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-3xl space-y-4">

          {total === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <Users className="size-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Nenhuma inscrição ainda.</p>
            </div>
          ) : (
            <>
              {/* Filtros */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTROS.map(({ key, label }) => (
                  <Link
                    key={key}
                    href={
                      key === "todos"
                        ? `/painel/campeonatos/${id}/inscricoes`
                        : `/painel/campeonatos/${id}/inscricoes?filtro=${key}`
                    }
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      filtroAtivo === key
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {/* Lista */}
              {lista.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-6 text-center ring-1 ring-black/5">
                  <p className="text-sm text-gray-400">
                    {filtroAtivo === "pagos" ? "Nenhuma inscrição paga ainda." : "Nenhum pendente."}
                  </p>
                </div>
              ) : (
                <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                  {lista.map((reg) => {
                    const cat   = reg.championship_categories;
                    const team  = reg.teams;
                    const a1raw = team ? profileMap[team.atleta1_id] : null;
                    const a2raw = team?.atleta2_id ? profileMap[team.atleta2_id] : null;

                    return (
                      <InscricaoItem
                        key={reg.id}
                        a1={{
                          nome:     a1raw?.nome     ?? "Atleta 1",
                          username: a1raw?.username ?? "",
                          nivel:    a1raw?.nivel    ?? null,
                        }}
                        a2={a2raw ? {
                          nome:     a2raw.nome,
                          username: a2raw.username,
                          nivel:    a2raw.nivel ?? null,
                        } : null}
                        catNome={cat?.nome ?? "—"}
                        catGenero={cat?.genero ?? ""}
                        valor={Number(reg.valor)}
                        statusPagamento={reg.status_pagamento}
                      />
                    );
                  })}
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
