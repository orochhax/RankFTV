import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlateiaCheckin, type CheckinItem } from "@/components/plateia/PlateiaCheckin";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";

const PAGE_SIZE = 50;

function pageHref(championshipId: string, page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/painel/campeonatos/${championshipId}/plateia/checkin${suffix ? `?${suffix}` : ""}`;
}

export default async function CheckinPlateiaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const search = String(query.q ?? "").trim().slice(0, 80).replace(/[,()%_'"\\]/g, "");
  const requestedPage = Number.parseInt(String(query.page ?? "1"), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, organizador_id")
    .eq("id", id)
    .maybeSingle();
  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  // Só ingressos pagos entram na portaria
  let ticketRequest = supabase
    .from("spectator_tickets")
    .select("id, comprador_nome, tipo_nome, code, quantidade, checked_in", { count: "exact" })
    .eq("championship_id", id)
    .eq("status_pagamento", "pago")
    .order("comprador_nome", { ascending: true });
  if (search) ticketRequest = ticketRequest.or(`comprador_nome.ilike.%${search}%,code.ilike.%${search}%`);

  const [{ data: raw, count }, { data: metricData }] = await Promise.all([
    ticketRequest.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.rpc("organizer_spectator_financial_metrics", { p_championship_id: id }),
  ]);

  const itens = (raw ?? []) as CheckinItem[];
  const metrics = (metricData ?? {}) as {
    statuses?: Array<{ status: string; orders: number; quantity: number; checkedIn?: number }>;
  };
  const paid = metrics.statuses?.find((item) => item.status === "pago");
  const presentes = Number(paid?.checkedIn ?? 0);
  const totalIngressos = Number(paid?.quantity ?? 0);
  const totalOrders = Number(count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));
  if (page > totalPages) redirect(pageHref(id, totalPages, search));

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Check-in da plateia" description={`${presentes} de ${totalIngressos} presentes`} />
      <PlateiaCheckin champId={id} itens={itens} initialSearch={search} />
      {totalOrders > 0 && totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-border pt-4" aria-label="Paginacao do check-in da plateia">
          <span className="text-sm text-ink-muted">Pagina {page} de {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(id, page - 1, search)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-ink">
                <ChevronLeft className="size-4" /> Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(id, page + 1, search)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-ink">
                Proxima <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </nav>
      )}
    </PageContainer>
  );
}
