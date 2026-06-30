import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Zap, CreditCard, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PublicarCampeonatoForm } from "@/components/painel/PublicarCampeonatoForm";
import { PlanoTaxas } from "@/components/painel/PlanoTaxas";
import { ChavePixClient } from "@/components/painel/ChavePixClient";

// Fluxo de publicação (rascunho → no ar). Mostra a taxa e como o repasse
// funciona ANTES de abrir as inscrições, e coleta os dados de recebimento no
// momento certo do funil — depois do organizador já ter criado o campeonato.
export default async function PublicarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, status, organizador_id, is_elite, premium_fee_pendente, max_parcelas_inscricao, max_parcelas_ingresso")
    .eq("id", id)
    .maybeSingle();

  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  // Já publicado → volta pro card de sucesso.
  if (champ.status === "inscricoes_abertas") {
    redirect(`/painel/campeonatos/${id}/criado`);
  }

  const [{ data: cats }, { data: orgAccount }, { data: tiposIngresso }] = await Promise.all([
    supabase
      .from("championship_categories")
      .select("valor_inscricao")
      .eq("championship_id", id),
    supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("spectator_ticket_types")
      .select("id, valor")
      .eq("championship_id", id),
  ]);

  const temCategoriaPaga     = (cats ?? []).some((c) => Number(c.valor_inscricao) > 0);
  const temChavePix          = !!orgAccount?.chave_pix;
  const precisaPix           = temCategoriaPaga && !temChavePix;
  const isElite              = !!champ?.is_elite;
  const feePendente          = Number(champ?.premium_fee_pendente ?? 0);
  const temIngresso          = (tiposIngresso ?? []).some((t) => Number(t.valor) > 0);
  const maxParcelasInscricao = (champ as Record<string, unknown>).max_parcelas_inscricao as number ?? 1;
  const maxParcelasIngresso  = (champ as Record<string, unknown>).max_parcelas_ingresso  as number ?? 1;

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}/criado`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Publicar campeonato</h1>
            <p className="mt-1 text-sm text-white/50">
              Ao publicar,{" "}
              <span className="font-medium text-white/80">{champ.nome}</span> fica
              visível pra todo mundo e as inscrições abrem.
            </p>
          </div>

          {/* Chave Pix — visível sempre que há categorias pagas */}
          {temCategoriaPaga && (
            <ChavePixClient chavePix={orgAccount?.chave_pix ?? null} />
          )}
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">

          {temCategoriaPaga ? (
            <>
              {/* Como funciona o repasse */}
              <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
                <p className="font-semibold text-blue-900">Como funciona o repasse</p>
                <ul className="mt-3 space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <Zap className="mt-0.5 size-4 shrink-0 text-blue-500" />
                    Atleta paga a inscrição + a taxa de serviço (Pix ou cartão)
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-500" />
                    Você recebe o valor cheio da inscrição — a taxa é paga pelo comprador
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="mt-0.5 size-4 shrink-0 text-blue-500" />
                    <span><strong>Pix:</strong> você recebe no mesmo dia</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CreditCard className="mt-0.5 size-4 shrink-0 text-blue-500" />
                    <span><strong>Cartão:</strong> no prazo da operadora (até 32 dias)</span>
                  </li>
                </ul>
              </div>

              {/* Plano de taxas (Padrão x Elite) */}
              <PlanoTaxas
                champId={id}
                isElite={isElite}
                status={champ.status}
                feePendente={feePendente}
              />

            </>
          ) : (
            /* Campeonato gratuito */
            <div className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
              <p className="font-semibold text-blue-800">Campeonato gratuito</p>
              <p className="mt-0.5 text-sm text-blue-700">
                Todas as categorias são grátis — não precisa configurar recebimento.
                É só publicar.
              </p>
            </div>
          )}

          {/* Form de publicação (mostra campos de Pix só quando precisa) */}
          <PublicarCampeonatoForm
            championshipId={id}
            precisaPix={precisaPix}
            temCategoriaPaga={temCategoriaPaga}
            temIngresso={temIngresso}
            maxParcelasInscricao={maxParcelasInscricao}
            maxParcelasIngresso={maxParcelasIngresso}
          />

        </div>
      </div>
    </div>
  );
}
