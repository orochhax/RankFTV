import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { formatBRL } from "@/lib/format";
import { InscricaoExpandivel } from "@/components/painel/InscricaoExpandivel";
import { PageContainer } from "@/components/shell/PageContainer";
import { EmptyState } from "@/components/shell/EmptyState";

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
    <PageContainer width="form" className="space-y-4 py-8">
      <Link
        href={`/painel/campeonatos/${id}/financeiro`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="size-4" /> Financeiro
      </Link>
      <div>
        <h1 className="text-xl font-bold text-ink">{cfg.titulo}</h1>
        <p className="text-sm text-ink-muted">{camp.nome}</p>
      </div>

      {/* Resumo rápido */}
      <div className={`inline-flex items-center gap-3 rounded-card-lg px-4 py-3 ring-1 ${cfg.bg} ${cfg.ring}`}>
        <span className={`text-2xl font-bold ${cfg.text}`}>{lista.length}</span>
        <div>
          <p className={`text-xs font-semibold ${cfg.text}`}>
            {lista.length === 1 ? "dupla" : "duplas"}
          </p>
          <p className={`text-xs ${cfg.text} opacity-70`}>{formatBRL(totalValor)}</p>
        </div>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma inscrição aqui ainda" description={cfg.descricao} />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-card-lg ring-1 ring-border">
          {lista.map((ins) => (
            <InscricaoExpandivel key={ins.regId} inscricao={ins} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
