import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { PlateiaLista, type PlateiaItem } from "@/components/plateia/PlateiaLista";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 30;

function href(champId: string, page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/painel/campeonatos/${champId}/plateia/lista${suffix ? `?${suffix}` : ""}`;
}

export default async function PlateiaListaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const query = String(filters.q ?? "").trim().slice(0, 80).replace(/[,()%_'"\\]/g, "");
  const requestedPage = Number.parseInt(String(filters.page ?? "1"), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, organizador_id")
    .eq("id", id)
    .maybeSingle();
  if (!champ || champ.organizador_id !== user.id) notFound();

  let request = supabase
    .from("spectator_tickets")
    .select("id, comprador_nome, comprador_email, tipo_nome, valor, quantidade, status_pagamento, checked_in, code", { count: "exact" })
    .eq("championship_id", id)
    .order("created_at", { ascending: false });
  if (query) request = request.or(`comprador_nome.ilike.%${query}%,comprador_email.ilike.%${query}%`);
  const { data, count } = await request.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const items = (data ?? []) as PlateiaItem[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pages) redirect(href(id, pages, query));

  return (
    <PageContainer width="wide" className="space-y-6 py-8">
      <PageHeader title="Plateia" description={`${total} ${total === 1 ? "pedido" : "pedidos"} no total`} />

      <form method="get" className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar por nome ou e-mail</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input name="q" defaultValue={query} maxLength={80} placeholder="Buscar por nome ou e-mail..." className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
        <button type="submit" title="Buscar" className="inline-flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white"><Search className="size-4" /></button>
        {query && <Link href={href(id, 1, "")} title="Limpar busca" className="inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500"><X className="size-4" /></Link>}
      </form>

      <PlateiaLista itens={items} />
      {total > 0 && (
        <nav className="flex items-center justify-between border-t border-gray-200 pt-4" aria-label="Paginacao da plateia">
          <span className="text-sm text-gray-500">Pagina {Math.min(page, pages)} de {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href(id, page - 1, query)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"><ChevronLeft className="size-4" /> Anterior</Link>}
            {page < pages && <Link href={href(id, page + 1, query)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">Proxima <ChevronRight className="size-4" /></Link>}
          </div>
        </nav>
      )}
    </PageContainer>
  );
}
