import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { categoryLevelRecommendationEnabled } from "@/lib/release-flags";
import { availableCategorySpots } from "@/lib/category-availability";
import { formatDateRangeBR } from "@/lib/format";
import {
  IngressoAtletaForm,
  type AuthenticatedAthleteProfile,
  type CategoriaOpcao,
} from "@/components/campeonatos/IngressoAtletaForm";
import { resolverPrecos, listarLotesComStatus } from "@/lib/lotes";
import {
  athleteCheckoutCookieName,
  hashCheckoutReservationToken,
  isCheckoutReservationToken,
  type AthleteCheckoutReservation,
} from "@/lib/checkout-reservation";

function countByCategory(rows: Array<{ category_id: string | null }> | null) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    if (!row.category_id) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  return counts;
}

// Compra de ingresso de atleta (dupla) como visitante, sem conta.
export default async function ComprarAtletaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ categoria?: string; convite?: string }>;
}) {
  const { id } = await params;
  const { categoria: initialCategoryId, convite: waitlistInviteToken } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const reservationToken = cookieStore.get(athleteCheckoutCookieName(id))?.value;

  const [{ data: champ }, { data: cats }, { data: profile }, { data: privateProfile }] = await Promise.all([
    supabase
      .from("championships")
      .select("nome, cidade, estado, local, data_inicio, data_fim, status, is_elite, usa_motor_categoria")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("championship_categories")
      .select("id, nome, genero, valor_inscricao, corte_rating_min, corte_rating_max, max_duplas")
      .eq("championship_id", id)
      .order("valor_inscricao", { ascending: true }),
    user
      ? supabase
          .from("profiles")
          .select("nome, genero, tamanho_camisa")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("profiles_private")
          .select("cpf, telefone")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!champ) notFound();

  const championshipReviewSummary = {
    name: champ.nome,
    dateLabel: formatDateRangeBR(champ.data_inicio, champ.data_fim),
    locationLabel: [
      champ.local?.trim(),
      [champ.cidade?.trim(), champ.estado?.trim()].filter(Boolean).join("/"),
    ].filter(Boolean).join(" · ") || "Local a confirmar",
  };

  const authenticatedAthlete: AuthenticatedAthleteProfile | null = user
    ? {
        name: profile?.nome?.trim() ?? "",
        email: user.email?.trim() ?? "",
        cpf: privateProfile?.cpf?.trim() ?? "",
        whatsapp: privateProfile?.telefone?.trim() ?? "",
        gender: profile?.genero?.trim() ?? "",
        shirt: profile?.tamanho_camisa?.trim() ?? "",
      }
    : null;

  const vendaAberta =
    champ.status === "inscricoes_abertas" || champ.status === "em_andamento";

  // Preço vigente (lote atual, se houver) — sobrepõe o valor "de tabela".
  const categoryIds = (cats ?? []).map((c) => c.id);
  const reservationPromise = isCheckoutReservationToken(reservationToken)
    ? admin
        .from("checkout_reservations")
        .select("id, category_id, expires_at, price_snapshot, pricing_tier_id")
        .eq("token_hash", hashCheckoutReservationToken(reservationToken))
        .eq("championship_id", id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle()
    : Promise.resolve({ data: null });
  const occupiedTicketsPromise = categoryIds.length > 0
    ? admin
        .from("athlete_tickets")
        .select("category_id")
        .in("category_id", categoryIds)
        .not("status_pagamento", "in", "(cancelado,estornado,expirado)")
    : Promise.resolve({ data: [] });
  const occupiedRegistrationsPromise = categoryIds.length > 0
    ? admin
        .from("registrations")
        .select("category_id")
        .in("category_id", categoryIds)
        .in("status_pagamento", ["pendente", "pago"])
    : Promise.resolve({ data: [] });
  const activeReservationsPromise = categoryIds.length > 0
    ? admin
        .from("checkout_reservations")
        .select("category_id")
        .in("category_id", categoryIds)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
    : Promise.resolve({ data: [] });
  const [precos, lotesPorCategoria, reservationResult, occupiedTickets, occupiedRegistrations, activeReservations] = await Promise.all([
    resolverPrecos(
      "category",
      categoryIds,
      Object.fromEntries((cats ?? []).map((c) => [c.id, Number(c.valor_inscricao)])),
    ),
    listarLotesComStatus("category", categoryIds),
    reservationPromise,
    occupiedTicketsPromise,
    occupiedRegistrationsPromise,
    activeReservationsPromise,
  ]);
  const ticketCountByCategory = countByCategory(occupiedTickets.data);
  const registrationCountByCategory = countByCategory(occupiedRegistrations.data);
  const reservationCountByCategory = countByCategory(activeReservations.data);

  const existingReservation = reservationResult.data;
  const initialReservation: AthleteCheckoutReservation | null = existingReservation
    ? {
        id: existingReservation.id,
        categoryId: existingReservation.category_id,
        expiresAt: existingReservation.expires_at,
        serverNow: new Date().toISOString(),
        price: Number(existingReservation.price_snapshot),
        pricingTierId: existingReservation.pricing_tier_id,
        reused: true,
      }
    : null;

  const categorias: CategoriaOpcao[] = (cats ?? []).map((c) => {
    const lotes = lotesPorCategoria[c.id] ?? [];
    const occupiedPairs = (ticketCountByCategory.get(c.id) ?? 0)
      + (registrationCountByCategory.get(c.id) ?? 0)
      + (reservationCountByCategory.get(c.id) ?? 0);
    const vagasDisponiveis = availableCategorySpots(
      c.max_duplas,
      occupiedPairs,
      lotes.find((tier) => tier.status === "ativo"),
    );
    const hasExistingReservation = initialReservation?.categoryId === c.id;
    return {
      id:             c.id,
      nome:           c.nome,
      genero:         c.genero,
      valorInscricao: initialReservation && initialReservation.categoryId === c.id
        ? initialReservation.price
        : precos[c.id].valor,
      corteRatingMin: Number(c.corte_rating_min ?? 0),
      corteRatingMax: Number(c.corte_rating_max ?? 0),
      lotes,
      // A reserva já criada pelo próprio visitante continua acessível até
      // expirar. Para as demais categorias, não permita iniciar o checkout
      // quando a capacidade real ou o lote vigente já chegaram a zero.
      esgotado: hasExistingReservation
        ? false
        : precos[c.id].esgotado || vagasDisponiveis === 0,
      vagasDisponiveis,
    };
  });

  return (
    <div className="min-h-screen">
      <div className="bg-brand-dark px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-4">
          <Link
            href={`/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {champ.nome}
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Inscrever minha dupla</h1>
          </div>
          <p className="text-sm text-white/50">
            {champ.nome} — {champ.cidade}/{champ.estado}
          </p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-xl">
          {!vendaAberta ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500 ring-1 ring-black/5">
              As inscrições não estão abertas no momento.
            </p>
          ) : categorias.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500 ring-1 ring-black/5">
              Nenhuma categoria disponível ainda.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Não é necessário ter conta. Selecione a categoria e preencha os dados dos dois atletas.
              </p>
              <IngressoAtletaForm
                championshipId={id}
                championshipSummary={championshipReviewSummary}
                categorias={categorias}
                isElite={!!champ.is_elite}
                usaMotorCategoria={categoryLevelRecommendationEnabled(champ.usa_motor_categoria)}
                authenticatedAthlete={authenticatedAthlete}
                initialCategoryId={initialCategoryId ?? null}
                waitlistInviteToken={waitlistInviteToken ?? null}
                initialReservation={initialReservation}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
