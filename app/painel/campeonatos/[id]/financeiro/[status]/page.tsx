import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { formatBRL } from "@/lib/format";
import { InscricaoExpandivel } from "@/components/painel/InscricaoExpandivel";

type StatusSlug = "pagos" | "pendentes" | "estornados";

const SLUG_TO_STATUS: Record<StatusSlug, "pago" | "pendente" | "estornado"> = {
  pagos:      "pago",
  pendentes:  "pendente",
  estornados: "estornado",
};

const CONFIG: Record<StatusSlug, { titulo: string; bg: string; text: string; ring: string; descricao: string }> = {
  pagos: {
    titulo:    "Pagamentos confirmados",
    descricao: "Duplas que concluíram o pagamento.",
    bg:        "bg-blue-50",
    ring:      "ring-blue-200",
    text:      "text-blue-700",
  },
  pendentes: {
    titulo:    "Pagamentos pendentes",
    descricao: "Duplas inscritas que ainda não pagaram.",
    bg:        "bg-amber-50",
    ring:      "ring-amber-200",
    text:      "text-amber-700",
  },
  estornados: {
    titulo:    "Estornos / cancelamentos",
    descricao: "Duplas que solicitaram reembolso ou cancelamento.",
    bg:        "bg-red-50",
    ring:      "ring-red-200",
    text:      "text-red-600",
  },
};

export default async function FinanceiroStatusPage({
  params,
}: {
  params: Promise<{ id: string; status: string }>;
}) {
  const { id, status: statusSlug } = await params;

  if (!Object.keys(SLUG_TO_STATUS).includes(statusSlug)) notFound();
  const slug   = statusSlug as StatusSlug;
  const cfg    = CONFIG[slug];
  const status = SLUG_TO_STATUS[slug];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  // Busca inscrições com o status filtrado
  const { data: rawRegs } = await supabase
    .from("registrations")
    .select(`id, valor, created_at, team_id, championship_categories(nome), teams(atleta1_id, atleta2_id)`)
    .eq("championship_id", id)
    .eq("status_pagamento", status)
    .order("created_at", { ascending: false });

  const regs = rawRegs ?? [];

  // Coleta todos os IDs únicos de atletas
  const atletaIds = new Set<string>();
  for (const r of regs) {
    const t = (r.teams as unknown) as { atleta1_id: string; atleta2_id: string | null } | null;
    if (t?.atleta1_id) atletaIds.add(t.atleta1_id);
    if (t?.atleta2_id) atletaIds.add(t.atleta2_id);
  }
  const ids = Array.from(atletaIds);

  // Perfis publicos (nome, username) + telefone privado via admin apos validar dono.
  const perfilMap: Record<string, { nome: string; username: string; telefone: string | null }> = {};
  if (ids.length > 0) {
    const { data: perfis } = await supabase
      .from("profiles")
      .select("id, nome, username")
      .in("id", ids);
    for (const p of perfis ?? []) perfilMap[p.id] = { ...p, telefone: null };
  }

  // E-mails e telefones via admin
  const emailMap: Record<string, string | null> = {};
  if (ids.length > 0) {
    const admin = createAdminClient();
    const [{ data: privRows }] = await Promise.all([
      admin.from("profiles_private").select("user_id, telefone").in("user_id", ids),
      Promise.all(
        ids.map(async (uid) => {
          const { data } = await admin.auth.admin.getUserById(uid);
          emailMap[uid] = data?.user?.email ?? null;
        }),
      ),
    ]);
    for (const row of privRows ?? []) {
      if (perfilMap[row.user_id]) perfilMap[row.user_id].telefone = row.telefone ?? null;
    }
  }

  const totalValor = regs.reduce((s, r) => s + Number(r.valor), 0);

  type InscricaoDetalhe = {
    regId:     string;
    valor:     number;
    categoria: string;
    criadoEm:  string;
    atleta1:   { nome: string; username: string; telefone: string | null; email: string | null };
    atleta2:   { nome: string; username: string; telefone: string | null; email: string | null } | null;
  };

  const lista: InscricaoDetalhe[] = regs.map((r) => {
    const t   = (r.teams as unknown) as { atleta1_id: string; atleta2_id: string | null } | null;
    const cat = (r.championship_categories as unknown) as { nome: string } | null;
    const a1id = t?.atleta1_id ?? "";
    const a2id = t?.atleta2_id ?? null;
    const p1   = perfilMap[a1id];
    const p2   = a2id ? perfilMap[a2id] : null;
    return {
      regId:     r.id,
      valor:     Number(r.valor),
      categoria: cat?.nome ?? "—",
      criadoEm:  r.created_at as string,
      atleta1:   { nome: p1?.nome ?? "—", username: p1?.username ?? "—", telefone: p1?.telefone ?? null, email: emailMap[a1id] ?? null },
      atleta2:   p2 ? { nome: p2.nome, username: p2.username, telefone: p2.telefone ?? null, email: emailMap[a2id!] ?? null } : null,
    };
  });

  return (
    <div className="min-h-screen">
      {/* Cabeçalho */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-3">
          <Link
            href={`/painel/campeonatos/${id}/financeiro`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Financeiro
          </Link>
          <h1 className="text-2xl font-bold text-white">{cfg.titulo}</h1>
          <p className="text-sm text-white/40">{camp.nome}</p>

          {/* Resumo rápido */}
          <div className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${cfg.bg} ${cfg.ring}`}>
            <span className={`text-2xl font-bold ${cfg.text}`}>{lista.length}</span>
            <div>
              <p className={`text-xs font-semibold ${cfg.text}`}>
                {lista.length === 1 ? "dupla" : "duplas"}
              </p>
              <p className={`text-xs ${cfg.text} opacity-70`}>{formatBRL(totalValor)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          {lista.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 px-4 py-16 text-center ring-1 ring-black/5">
              <p className="text-sm text-gray-400">{cfg.descricao}</p>
              <p className="mt-1 text-xs text-gray-300">Nenhuma inscrição aqui ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl ring-1 ring-black/5">
              {lista.map((ins) => (
                <InscricaoExpandivel key={ins.regId} inscricao={ins} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
