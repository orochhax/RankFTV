import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Zap, CreditCard, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPlatformConfig } from "@/lib/platform-config";
import { PublicarCampeonatoForm } from "@/components/painel/PublicarCampeonatoForm";
import { PlanoTaxas } from "@/components/painel/PlanoTaxas";

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
    .select("nome, status, organizador_id, is_elite, premium_fee_pendente")
    .eq("id", id)
    .maybeSingle();

  if (!champ) notFound();
  if (champ.organizador_id !== user.id) notFound();

  // Já publicado → volta pro card de sucesso.
  if (champ.status === "inscricoes_abertas") {
    redirect(`/painel/campeonatos/${id}/criado`);
  }

  const [{ data: cats }, { data: orgAccount }, config] = await Promise.all([
    supabase
      .from("championship_categories")
      .select("valor_inscricao")
      .eq("championship_id", id),
    supabase
      .from("organizer_accounts")
      .select("chave_pix")
      .eq("user_id", user.id)
      .maybeSingle(),
    getPlatformConfig(),
  ]);

  const temCategoriaPaga = (cats ?? []).some((c) => Number(c.valor_inscricao) > 0);
  const temChavePix      = !!orgAccount?.chave_pix;
  const precisaPix       = temCategoriaPaga && !temChavePix;
  const isElite          = !!champ?.is_elite;
  const feePendente      = Number(champ?.premium_fee_pendente ?? 0);

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
                    Atleta paga a inscrição (Pix ou cartão)
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-500" />
                    A plataforma retém a taxa e repassa o restante pra você
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
                padrao={{
                  pixFixo:        config.plataformaPixFixo,
                  debitoPercent:  config.plataformaDebitoPercent,
                  debitoFixo:     config.plataformaDebitoFixo,
                  creditoPercent: config.plataformaCreditoPercent,
                  creditoFixo:    config.plataformaCreditoFixo,
                }}
                elite={{
                  pixFixo:        config.premiumPixFixo,
                  debitoPercent:  config.premiumDebitoPercent,
                  debitoFixo:     config.premiumDebitoFixo,
                  creditoPercent: config.premiumCreditoPercent,
                  creditoFixo:    config.premiumCreditoFixo,
                }}
              />

              {/* Recebimento já configurado */}
              {!precisaPix && (
                <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                  <p className="text-sm font-medium text-emerald-800">
                    Recebimento já configurado ✓
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-600">
                    Sua chave Pix já está cadastrada. É só publicar.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Campeonato gratuito */
            <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
              <p className="font-semibold text-emerald-800">Campeonato gratuito</p>
              <p className="mt-0.5 text-sm text-emerald-700">
                Todas as categorias são grátis — não precisa configurar recebimento.
                É só publicar.
              </p>
            </div>
          )}

          {/* Form de publicação (mostra campos de Pix só quando precisa) */}
          <PublicarCampeonatoForm championshipId={id} precisaPix={precisaPix} />

        </div>
      </div>
    </div>
  );
}
