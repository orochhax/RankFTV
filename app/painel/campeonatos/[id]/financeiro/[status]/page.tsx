import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
  searchParams,
}: {
  params: Promise<{ id: string; status: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id, status: statusSlug } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageSize = 30;
  const fetchEnd = page * pageSize - 1;

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
  const [{ data: rawRegs }, { data: rawTickets }, { data: metricData }] = await Promise.all([
    supabase
    .from("registrations")
    .select(`id, valor, created_at, team_id, championship_categories(nome), teams(atleta1_id, atleta2_id)`)
    .eq("championship_id", id)
    .eq("status_pagamento", status)
    .order("created_at", { ascending: false })
    .range(0, fetchEnd),
    supabase
    .from("athlete_tickets")
    .select(`
      id, valor, created_at, categoria_nome,
      comprador_nome, comprador_email, comprador_zap,
      parceiro_nome, parceiro_email, parceiro_zap
    `)
    .eq("championship_id", id)
    .eq("status_pagamento", status)
    .order("created_at", { ascending: false })
    .range(0, fetchEnd),
    supabase.rpc("organizer_championship_financial_metrics", { p_championship_id: id }),
  ]);

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
  const emailMap: Record<string, string | null> = {};
  if (ids.length > 0) {
    const { data: contacts } = await supabase.rpc("organizer_profile_contacts", {
      p_championship_id: id,
      p_user_ids: ids,
    });
    for (const contact of (contacts ?? []) as Array<{ id: string; nome: string; username: string; telefone: string | null; email: string | null }>) {
      perfilMap[contact.id] = { nome: contact.nome, username: contact.username, telefone: contact.telefone };
      emailMap[contact.id] = contact.email;
    }
  }

  const metrics = (metricData ?? {}) as {
    statuses?: Array<{ status: string; count: number; total: number }>;
  };
  const statusMetric = metrics.statuses?.find((item) => item.status === status);
  const totalRows = Number(statusMetric?.count ?? 0);
  const totalValor = Number(statusMetric?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  if (page > totalPages) {
    redirect(`/painel/campeonatos/${id}/financeiro/${slug}?page=${totalPages}`);
  }

  type InscricaoDetalhe = {
    regId:     string;
    valor:     number;
    categoria: string;
    criadoEm:  string;
    atleta1:   { nome: string; username: string; telefone: string | null; email: string | null };
    atleta2:   { nome: string; username: string; telefone: string | null; email: string | null } | null;
  };

  const listaRegs: InscricaoDetalhe[] = regs.map((r) => {
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

  type AthleteTicketRow = {
    id: string;
    valor: number;
    created_at: string;
    categoria_nome: string | null;
    comprador_nome: string;
    comprador_email: string;
    comprador_zap: string | null;
    parceiro_nome: string | null;
    parceiro_email: string | null;
    parceiro_zap: string | null;
  };

  const listaTickets: InscricaoDetalhe[] = ((rawTickets ?? []) as AthleteTicketRow[]).map((ticket) => ({
    regId: ticket.id,
    valor: Number(ticket.valor),
    categoria: ticket.categoria_nome ?? "—",
    criadoEm: ticket.created_at,
    atleta1: {
      nome: ticket.comprador_nome,
      username: "",
      telefone: ticket.comprador_zap,
      email: ticket.comprador_email,
    },
    atleta2: ticket.parceiro_nome
      ? {
          nome: ticket.parceiro_nome,
          username: "",
          telefone: ticket.parceiro_zap,
          email: ticket.parceiro_email,
        }
      : null,
  }));

  // Cada fonte traz seus N registros mais recentes. Depois de mesclar e cortar,
  // obtemos a paginação cronológica correta sem esconder o checkout rápido.
  const lista = [...listaRegs, ...listaTickets]
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .slice((page - 1) * pageSize, page * pageSize);

  return (
    <PageContainer width="wide" className="space-y-4 py-8">
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
        <span className={`text-2xl font-bold ${cfg.text}`}>{totalRows}</span>
        <div>
          <p className={`text-xs font-semibold ${cfg.text}`}>
            {totalRows === 1 ? "dupla" : "duplas"}
          </p>
          <p className={`text-xs ${cfg.text} opacity-70`}>{formatBRL(totalValor)}</p>
        </div>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma inscrição aqui ainda" description={cfg.descricao} />
      ) : (
        <>
          <div className="divide-y divide-border overflow-hidden rounded-card-lg ring-1 ring-border">
            {lista.map((ins) => (
              <InscricaoExpandivel key={ins.regId} inscricao={ins} />
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label="Paginacao de pagamentos">
              <Link
                href={`/painel/campeonatos/${id}/financeiro/${slug}?page=${Math.max(1, page - 1)}`}
                aria-disabled={page <= 1}
                className={`inline-flex items-center gap-1 ${page <= 1 ? "pointer-events-none text-ink-muted/40" : "text-blue-600"}`}
              >
                <ChevronLeft className="size-4" /> Anterior
              </Link>
              <span className="text-ink-muted">Pagina {Math.min(page, totalPages)} de {totalPages}</span>
              <Link
                href={`/painel/campeonatos/${id}/financeiro/${slug}?page=${Math.min(totalPages, page + 1)}`}
                aria-disabled={page >= totalPages}
                className={`inline-flex items-center gap-1 ${page >= totalPages ? "pointer-events-none text-ink-muted/40" : "text-blue-600"}`}
              >
                Proxima <ChevronRight className="size-4" />
              </Link>
            </nav>
          )}
        </>
      )}
    </PageContainer>
  );
}
