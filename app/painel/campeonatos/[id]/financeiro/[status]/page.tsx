import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { FinanceiroStatusClient } from "@/components/painel/FinanceiroStatusClient";
import type { InscricaoDetalhe } from "@/components/painel/InscricaoExpandivel";

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
    bg:        "bg-success-bg",
    ring:      "ring-success/25",
    text:      "text-success",
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
  const champId = camp.id;
  const publicSlug = camp.slug ?? champId;

  // Busca inscrições com o status filtrado
  const [{ data: rawRegs }, { data: rawTickets }] = await Promise.all([
    supabase
    .from("registrations")
    .select(`id, valor, created_at, billing_type, team_id, championship_categories(nome), teams(atleta1_id, atleta2_id)`)
    .eq("championship_id", champId)
    .eq("status_pagamento", status)
    .order("created_at", { ascending: false }),
    supabase
    .from("athlete_tickets")
    .select(`
      id, valor, created_at, billing_type, categoria_nome,
      comprador_nome, comprador_email, comprador_zap,
      parceiro_nome, parceiro_email, parceiro_zap
    `)
    .eq("championship_id", champId)
    .eq("status_pagamento", status)
    .order("created_at", { ascending: false }),
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
      p_championship_id: champId,
      p_user_ids: ids,
    });
    for (const contact of (contacts ?? []) as Array<{ id: string; nome: string; username: string; telefone: string | null; email: string | null }>) {
      perfilMap[contact.id] = { nome: contact.nome, username: contact.username, telefone: contact.telefone };
      emailMap[contact.id] = contact.email;
    }
  }

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
      billingType: r.billing_type ?? null,
      atleta1:   { nome: p1?.nome ?? "—", username: p1?.username ?? "—", telefone: p1?.telefone ?? null, email: emailMap[a1id] ?? null },
      atleta2:   p2 ? { nome: p2.nome, username: p2.username, telefone: p2.telefone ?? null, email: emailMap[a2id ?? ""] ?? null } : null,
    };
  });

  type AthleteTicketRow = {
    id: string;
    valor: number;
    created_at: string;
    billing_type: string | null;
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
    billingType: ticket.billing_type ?? null,
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
  void lista;

  const listaCompleta = [...listaRegs, ...listaTickets].sort((a, b) =>
    b.criadoEm.localeCompare(a.criadoEm)
  );

  return (
    <FinanceiroStatusClient
      champId={publicSlug}
      champNome={camp.nome}
      statusSlug={slug}
      titulo={cfg.titulo}
      descricao={cfg.descricao}
      itens={listaCompleta}
      cfg={cfg}
    />
  );
}
