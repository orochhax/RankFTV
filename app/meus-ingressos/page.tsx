import Link from "next/link";
import { ArrowLeft, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { IngressoCard, type Ingresso } from "@/components/ingressos/IngressoCard";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { MeusIngressosDeslogado } from "./MeusIngressosDeslogado";
import { VincularComprasForm } from "./VincularComprasForm";

type Row = { id: string; championship_id: string; championships: unknown; [k: string]: unknown };
function champNome(row: Row): string {
  const c = row.championships as { nome?: string } | null;
  return c?.nome ?? "Campeonato";
}

// Logado: consulta os próprios ingressos no servidor via auth.uid() — nunca
// por e-mail (ver harden-ticket-user-linking.sql e Bug 4 do relatório).
// RLS já restringe as linhas a user_id/parceiro_user_id = auth.uid(), mas o
// filtro explícito é defesa em profundidade, no mesmo padrão do resto do
// projeto (nunca confiar só na RLS silenciosamente).
async function buscarIngressosDaConta(userId: string) {
  const supabase = await createClient();

  const [ath, plateia] = await Promise.all([
    supabase
      .from("athlete_tickets")
      .select("id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)")
      .or(`user_id.eq.${userId},parceiro_user_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("spectator_tickets")
      .select("id, championship_id, tipo_nome, comprador_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const atleta: Ingresso[] = (ath.data ?? []).map((r) => ({
    id: r.id,
    tipo: "atleta" as const,
    ticket_id: r.id,
    championship_id: r.championship_id,
    campeonato_nome: champNome(r as Row),
    categoria_nome: r.categoria_nome ?? null,
    tipo_nome: null,
    comprador_nome: r.comprador_nome,
    parceiro_nome: r.parceiro_nome ?? null,
    valor: Number(r.valor),
    status_pagamento: r.status_pagamento,
    code: r.code ?? null,
    access_token: r.access_token ?? null,
    checked_in: r.checked_in,
  }));

  const plateiaList: Ingresso[] = (plateia.data ?? []).map((r) => ({
    id: r.id,
    tipo: "plateia" as const,
    ticket_id: r.id,
    championship_id: r.championship_id,
    campeonato_nome: champNome(r as Row),
    categoria_nome: null,
    tipo_nome: r.tipo_nome ?? null,
    comprador_nome: r.comprador_nome,
    parceiro_nome: null,
    valor: Number(r.valor),
    status_pagamento: r.status_pagamento,
    code: r.code ?? null,
    access_token: r.access_token ?? null,
    checked_in: r.checked_in,
  }));

  return [...atleta, ...plateiaList];
}

export default async function MeusIngressosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ingressos = user ? await buscarIngressosDaConta(user.id) : null;

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho: faixa escura no mobile, PageHeader claro no desktop ── */}
      <div className="bg-black px-6 pb-16 pt-8 md:hidden">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            <ArrowLeft className="size-4" /> Início
          </Link>
          <p className="text-[11px] font-bold tracking-widest text-blue-400 uppercase">Meus ingressos</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {user ? "Seus ingressos" : "Consultar ingresso por CPF"}
          </h1>
          <p className="text-sm text-white/50">
            {user
              ? "Ingressos de atleta e de plateia vinculados à sua conta."
              : "Digite o CPF e e-mail usados na compra — mandamos um código de acesso pro seu e-mail."}
          </p>
        </div>
      </div>

      <div className="hidden border-b border-border bg-surface md:block">
        <PageContainer width="form" className="py-8">
          <PageHeader
            eyebrow="Meus ingressos"
            title={user ? "Seus ingressos" : "Consultar ingresso por CPF"}
            description={
              user
                ? "Ingressos de atleta e de plateia vinculados à sua conta."
                : "Digite o CPF e e-mail usados na compra — mandamos um código de acesso pro seu e-mail."
            }
          />
        </PageContainer>
      </div>

      {/* ── Corpo: sheet arredondada no mobile, cartão flutuando num fundo
          neutro no desktop (nada de página estreita boiando num vazio) ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:pb-16 md:shadow-none">
        <PageContainer width="form" className="space-y-6">
          {user ? (
            <>
              {ingressos && ingressos.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {ingressos.map((ing) => (
                    <IngressoCard key={`${ing.tipo}-${ing.ticket_id}`} ingresso={ing} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Ticket}
                  title="Nenhum ingresso vinculado à sua conta"
                  description="Se você comprou antes de ter conta (ou como visitante), vincule a compra abaixo."
                />
              )}
              <VincularComprasForm />
            </>
          ) : (
            <MeusIngressosDeslogado />
          )}
        </PageContainer>
      </div>
    </div>
  );
}
