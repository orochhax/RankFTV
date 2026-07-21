import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MinhasComprasClient } from "@/components/perfil/MinhasComprasClient";
import type { Ingresso } from "@/components/ingressos/IngressoCard";

// "Minhas Compras": ingressos (atleta/plateia) do usuário logado.
//
// O vínculo é feito por user_id (auth.uid()), nunca por e-mail — e-mail não
// é uma identidade autenticada nesse ponto (quem cria conta com um e-mail
// que apareceu num checkout de visitante não prova que comprou aquilo). Ver
// harden-ticket-user-linking.sql e Bug 4 do relatório de correções. Compras
// antigas sem user_id (feitas antes desta correção) só aparecem depois que
// o próprio dono as vincula explicitamente em /meus-ingressos, provando
// posse via o código OTP que já existe pra recuperação de ingresso.
export default async function MinhasComprasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let ingressos: Ingresso[] = [];

  {
    const admin = createAdminClient();

    const [ath1, ath2, plateia] = await Promise.all([
      admin
        .from("athlete_tickets")
        .select("id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("athlete_tickets")
        .select("id, championship_id, categoria_nome, comprador_nome, parceiro_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)")
        .eq("parceiro_user_id", user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("spectator_tickets")
        .select("id, championship_id, tipo_nome, comprador_nome, valor, status_pagamento, code, access_token, checked_in, championships(nome)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    type Row = { id: string; championship_id: string; championships: unknown; [k: string]: unknown };
    const champNome = (row: Row) => (row.championships as { nome?: string } | null)?.nome ?? "Campeonato";

    const atleta = [
      ...(ath1.data ?? []).map((r) => ({
        tipo: "atleta" as const, ticket_id: r.id, championship_id: r.championship_id,
        campeonato_nome: champNome(r as Row), categoria_nome: r.categoria_nome ?? null,
        tipo_nome: null, comprador_nome: r.comprador_nome, parceiro_nome: r.parceiro_nome ?? null,
        valor: Number(r.valor), status_pagamento: r.status_pagamento, code: r.code ?? null,
        access_token: r.access_token ?? null, checked_in: r.checked_in, id: r.id,
      })),
      ...(ath2.data ?? []).map((r) => ({
        tipo: "atleta" as const, ticket_id: r.id, championship_id: r.championship_id,
        campeonato_nome: champNome(r as Row), categoria_nome: r.categoria_nome ?? null,
        tipo_nome: null, comprador_nome: r.comprador_nome, parceiro_nome: r.parceiro_nome ?? null,
        valor: Number(r.valor), status_pagamento: r.status_pagamento, code: r.code ?? null,
        access_token: r.access_token ?? null, checked_in: r.checked_in, id: r.id,
      })),
    ];

    const plateiaList = (plateia.data ?? []).map((r) => ({
      tipo: "plateia" as const, ticket_id: r.id, championship_id: r.championship_id,
      campeonato_nome: champNome(r as Row), categoria_nome: null, tipo_nome: r.tipo_nome ?? null,
      comprador_nome: r.comprador_nome, parceiro_nome: null, valor: Number(r.valor),
      status_pagamento: r.status_pagamento, code: r.code ?? null, access_token: r.access_token ?? null,
      checked_in: r.checked_in, id: r.id,
    }));

    // Deduplica (mesmo atleta como comprador e parceiro no mesmo ticket)
    const seen = new Set<string>();
    ingressos = [...atleta, ...plateiaList].filter((i) => {
      const key = `${i.tipo}-${i.ticket_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-3">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Perfil
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Minhas Compras</h1>
          </div>
          <p className="text-sm text-white/50">
            Ingressos de atleta e de plateia que você comprou.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
          <MinhasComprasClient ingressos={ingressos} />
        </div>
      </div>
    </div>
  );
}
