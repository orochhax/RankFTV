import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type RegRow = {
  id: string;
  category_id: string;
  status_pagamento: string;
  teams: { id: string; atleta1_id: string; atleta2_id: string | null } | null;
  championship_categories: { id: string; nome: string; genero: string } | null;
};

type ProfileRow = { id: string; nome: string };

export default async function StaffInscricoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { id }  = await params;
  const { cat } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase
    .from("championship_staff")
    .select("can_inscricoes")
    .eq("championship_id", id)
    .eq("user_id", user.id)
    .eq("status", "aceito")
    .maybeSingle();

  if (!staffRow?.can_inscricoes) notFound();

  const { data: camp } = await supabase
    .from("championships")
    .select("nome")
    .eq("id", id)
    .single();

  if (!camp) notFound();

  const { data: rawRegs } = await supabase
    .from("registrations")
    .select(`
      id, category_id, status_pagamento,
      teams(id, atleta1_id, atleta2_id),
      championship_categories(id, nome, genero)
    `)
    .eq("championship_id", id)
    .eq("status_pagamento", "pago");

  const regs: RegRow[] = (rawRegs ?? []) as unknown as RegRow[];

  const athleteIds = [
    ...new Set(
      regs.flatMap((r) =>
        r.teams ? [r.teams.atleta1_id, ...(r.teams.atleta2_id ? [r.teams.atleta2_id] : [])] : []
      ),
    ),
  ];

  let profileMap: Record<string, ProfileRow> = {};
  if (athleteIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", athleteIds);
    profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  // Agrupa por categoria
  type DuplaDisplay = { id: string; nomeA: string; nomeB: string | null; catId: string; catNome: string };
  const seenTeams = new Set<string>();
  const duplas: DuplaDisplay[] = [];
  const catMeta: Record<string, { nome: string; genero: string }> = {};

  for (const reg of regs) {
    if (!reg.teams || !reg.championship_categories) continue;
    if (seenTeams.has(reg.teams.id)) continue;
    seenTeams.add(reg.teams.id);
    catMeta[reg.championship_categories.id] = {
      nome: reg.championship_categories.nome,
      genero: reg.championship_categories.genero,
    };
    duplas.push({
      id:      reg.teams.id,
      nomeA:   profileMap[reg.teams.atleta1_id]?.nome ?? "Atleta",
      nomeB:   reg.teams.atleta2_id ? (profileMap[reg.teams.atleta2_id]?.nome ?? "Atleta") : null,
      catId:   reg.championship_categories.id,
      catNome: reg.championship_categories.nome,
    });
  }

  duplas.sort((a, b) => a.catNome.localeCompare(b.catNome, "pt-BR") || a.nomeA.localeCompare(b.nomeA, "pt-BR"));

  const categorias = Object.entries(catMeta).map(([id, m]) => ({ id, ...m }));
  const activeCatId = cat && categorias.some((c) => c.id === cat) ? cat : null;
  const filtered = activeCatId ? duplas.filter((d) => d.catId === activeCatId) : duplas;

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href={`/staff/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Inscrições</h1>
            <p className="mt-1 text-sm text-white/40">Duplas confirmadas · somente visualização</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <Users className="size-4" />
                <p className="text-xs">Duplas</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{duplas.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <Clock className="size-4" />
                <p className="text-xs">Categorias</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{categorias.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">

          {categorias.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Link
                href={`/staff/${id}/inscricoes`}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  !activeCatId ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                Todas
              </Link>
              {categorias.map((c) => (
                <Link
                  key={c.id}
                  href={`/staff/${id}/inscricoes?cat=${c.id}`}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeCatId === c.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {c.nome}
                </Link>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
              <p className="text-sm text-gray-400">Nenhuma dupla confirmada.</p>
            </div>
          ) : (
            <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              {filtered.map((d, idx) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 shrink-0 text-center text-xs font-semibold text-gray-400">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {d.nomeA}{d.nomeB ? ` & ${d.nomeB}` : ""}
                    </p>
                    <p className="text-xs text-gray-400">{d.catNome}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
