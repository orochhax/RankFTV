import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { MapPin, Users, Trophy, ChevronLeft, Radio, CalendarDays, Ticket, Info } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { isUuid } from "@/lib/championship-slug";
import { formatDateRangeBR, generoLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PublicFunnelEvent } from "@/components/analytics/PublicFunnelEvent";
import { ExpandableTextBlock } from "@/components/campeonatos/ExpandableTextBlock";

type AtletaDisplay = {
  id: string;
  nome: string;
  username: string;
  avatarColor: string;
  fotoUrl?: string | null;
};
type DuplaDisplay = {
  id: string;
  categoriaNome: string;
  categoriaGenero: string;
  atleta1: AtletaDisplay | null;
  atleta2: AtletaDisplay | null;
};

const AVATAR_COLORS = ["bg-brand","bg-brand-dark","bg-amber-600","bg-emerald-700","bg-rose-500","bg-teal-600"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default async function CampeonatoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ voltar?: string }>;
}) {
  const { id } = await params;
  const { voltar } = await searchParams;

  const championship = await getDbChampionshipById(id);
  if (!championship) notFound();

  const champId = championship.id;
  const publicSlug = championship.slug ?? championship.id;
  if (isUuid(id) && publicSlug !== id) {
    redirect(`/campeonatos/${publicSlug}${voltar ? `?voltar=${encodeURIComponent(voltar)}` : ""}`);
  }

  // Campeonato vitrine: evento externo só informativo. Esconde tudo que é
  // inscrição/plateia/chaveamento — a página vira uma vitrine do evento.
  const isVitrine = championship.isVitrine ?? false;

  const voltarCriado = voltar === "criado";
  const backHref  = voltarCriado ? `/painel/campeonatos/${champId}/criado` : "/campeonatos";
  const backLabel = voltarCriado ? "Voltar" : "Campeonatos";

  const supabase = await createClient();

  /* ── Duplas inscritas (pagas: registrations autenticadas + athlete_tickets de visitante) ── */
  let duplas: DuplaDisplay[] = [];
  const [regsRes, ticketsRes] = await Promise.all([
    supabase
      .from("registrations")
      .select("team_id")
      .eq("championship_id", champId)
      .eq("status_pagamento", "pago"),
    supabase
      .from("athlete_tickets")
      .select("id, category_id, categoria_nome, comprador_nome, parceiro_nome")
      .eq("championship_id", champId)
      .eq("status_pagamento", "pago")
      .limit(1000),
  ]);

  const regs = regsRes.data ?? [];
  const tickets = ticketsRes.data ?? [];

  const categoryIdSet = new Set<string>();
  for (const t of tickets) {
    if (t.category_id) categoryIdSet.add(t.category_id);
  }

  let duplasRegs: DuplaDisplay[] = [];
  if (regs.length > 0) {
    const teamIds = [...new Set(regs.map((r) => r.team_id as string))];
    const { data: teams } = await supabase
      .from("teams")
      .select("id, atleta1_id, atleta2_id, category_id")
      .in("id", teamIds);

    const athleteIdSet = new Set<string>();
    for (const t of teams ?? []) {
      athleteIdSet.add(t.atleta1_id);
      if (t.atleta2_id) athleteIdSet.add(t.atleta2_id);
      if (t.category_id) categoryIdSet.add(t.category_id);
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome, username, foto_url")
      .in("id", Array.from(athleteIdSet));
    const profMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    let catMap: Record<string, { id: string; nome: string; genero: string }> = {};
    if (categoryIdSet.size > 0) {
      const { data: cats } = await supabase
        .from("championship_categories")
        .select("id, nome, genero")
        .in("id", Array.from(categoryIdSet));
      catMap = Object.fromEntries((cats ?? []).map((c) => [c.id, c]));
    }

    duplasRegs = (teams ?? []).map((t) => {
      const cat = catMap[t.category_id] ?? { nome: "—", genero: "masculino" };
      const p1  = profMap[t.atleta1_id];
      const p2  = t.atleta2_id ? profMap[t.atleta2_id] : null;
      return {
        id: t.id,
        categoriaNome: cat.nome,
        categoriaGenero: cat.genero as string,
        atleta1: p1 ? { id: t.atleta1_id, nome: p1.nome, username: p1.username ?? "", avatarColor: avatarColor(t.atleta1_id), fotoUrl: p1.foto_url ?? null } : null,
        atleta2: p2 ? { id: t.atleta2_id, nome: p2.nome, username: p2.username ?? "", avatarColor: avatarColor(t.atleta2_id), fotoUrl: p2.foto_url ?? null } : null,
      };
    });
  }

  let ticketCatMap: Record<string, { id: string; nome: string; genero: string }> = {};
  if (categoryIdSet.size > 0) {
    const { data: cats } = await supabase
      .from("championship_categories")
      .select("id, nome, genero")
      .in("id", Array.from(categoryIdSet));
    ticketCatMap = Object.fromEntries((cats ?? []).map((c) => [c.id, c]));
  }

  const duplasTickets: DuplaDisplay[] = tickets.map((t) => {
    const cat = (t.category_id && ticketCatMap[t.category_id])
      ? ticketCatMap[t.category_id]
      : { nome: t.categoria_nome ?? "Geral", genero: "masculino" };
    return {
      id: t.id,
      categoriaNome: cat.nome,
      categoriaGenero: cat.genero,
      atleta1: {
        id: `${t.id}-1`,
        nome: t.comprador_nome,
        username: "",
        avatarColor: avatarColor(t.comprador_nome),
        fotoUrl: null,
      },
      atleta2: t.parceiro_nome
        ? {
            id: `${t.id}-2`,
            nome: t.parceiro_nome,
            username: "",
            avatarColor: avatarColor(t.parceiro_nome),
            fotoUrl: null,
          }
        : null,
    };
  });

  duplas = [...duplasRegs, ...duplasTickets].sort((a, b) =>
    a.categoriaNome.localeCompare(b.categoriaNome, "pt-BR") ||
    (a.atleta1?.nome ?? "").localeCompare(b.atleta1?.nome ?? "", "pt-BR")
  );

  /* ── Bracket ── */
  const { count: bracketCount } = await supabase
    .from("bracket_matches")
    .select("id", { count: "exact", head: true })
    .eq("championship_id", champId);
  const hasDbBracket = (bracketCount ?? 0) > 0;

  /* ── Cronograma ── */
  const { data: scheduleRow } = await supabase
    .from("championships")
    .select("prevenda_inicio, prevenda_fim, prevenda_hora_inicio, inscricoes_inicio, inscricoes_fim, inscricoes_hora_inicio, data_inicio, data_fim, hora_inicio, hora_fim")
    .eq("id", champId)
    .single();

  const sr = (scheduleRow as unknown as Record<string, string | null> | null) ?? {};
  type ScheduleItem = { label: string; inicio: string | null; fim: string | null; horaInicio?: string | null; horaFim?: string | null };
  const schedule: ScheduleItem[] = [
    { label: "Pré-venda",   inicio: sr.prevenda_inicio ?? null,   fim: sr.prevenda_fim ?? null,   horaInicio: sr.prevenda_hora_inicio ?? null },
    { label: "Inscrições",  inicio: sr.inscricoes_inicio ?? null, fim: sr.inscricoes_fim ?? null, horaInicio: sr.inscricoes_hora_inicio ?? null },
    { label: "Evento",      inicio: sr.data_inicio ?? null,       fim: sr.data_fim ?? null,       horaInicio: sr.hora_inicio ?? null, horaFim: sr.hora_fim ?? null },
  ];

  // Ingressos de plateia disponíveis? (mostra o botão "Vou assistir")
  const { count: ingressoPlateiaCount } = await supabase
    .from("spectator_ticket_types")
    .select("id", { count: "exact", head: true })
    .eq("championship_id", champId)
    .eq("ativo", true);
  const temIngressoPlateia = (ingressoPlateiaCount ?? 0) > 0;

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <PublicFunnelEvent event="championship_viewed" championshipId={championship.id} />
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> {backLabel}
      </Link>

      <div>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl md:aspect-[16/8.5]">
          {championship.cardUrl || championship.bannerUrl ? (
            <Image
              src={championship.cardUrl || championship.bannerUrl || ""}
              alt={championship.nome}
              fill
              unoptimized
              priority
              className="object-cover"
              style={{ objectPosition: `${championship.bannerPositionX ?? 50}% ${championship.bannerPositionY ?? 50}%` }}
              sizes="(max-width: 767px) calc(100vw - 3rem), calc(100vw - 8rem)"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${championship.bannerFrom} ${championship.bannerTo}`} />
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-ink">{championship.nome}</h1>
            <ExpandableTextBlock
              text={championship.descricao}
              expandLabel="Ver descrição completa"
              collapseLabel="Recolher descrição"
              collapsedMaxHeightClass="max-h-14"
              className="mt-2"
            />
          </div>
          <StatusBadge status={championship.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>{formatDateRangeBR(championship.dataInicio, championship.dataFim)}</span>
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            {championship.local}, {championship.cidade} - {championship.estado}
          </span>
        </div>
        {!isVitrine && (
          <div className="mt-4 flex flex-wrap gap-2">
            {hasDbBracket ? (
              <Link
                href={`/campeonatos/${publicSlug}/chaveamento`}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
              >
                <Trophy className="size-4" />
                Ver chaveamento
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="O chaveamento ainda não está disponível"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-surface-2 px-5 py-2.5 text-sm font-medium text-ink-muted/60 ring-1 ring-border"
              >
                <Trophy className="size-4" />
                Ver chaveamento
              </span>
            )}

            {championship.liveUrl ? (
              <a
                href={championship.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-danger bg-white px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger-bg transition-colors"
              >
                <span className="size-2 animate-pulse rounded-full bg-danger" aria-hidden="true" />
                Ver ao vivo
              </a>
            ) : (
              <span
                aria-disabled="true"
                title="Sem transmissão ao vivo cadastrada"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-surface-2 px-5 py-2.5 text-sm font-medium text-ink-muted/60 ring-1 ring-border"
              >
                <Radio className="size-4" />
                Ver ao vivo
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cronograma */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarDays className="size-4 text-brand" />
          Cronograma
        </h2>
        <div className="space-y-3">
          {schedule.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <span className="w-24 shrink-0 text-sm font-medium text-gray-700">{item.label}</span>
              <span className="flex-1 text-right text-sm text-gray-500">
                {item.inicio
                  ? item.fim && item.fim !== item.inicio
                    ? `${new Date(item.inicio + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}${item.horaInicio ? ` às ${item.horaInicio}` : ""} → ${new Date(item.fim + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}${item.horaFim ? ` às ${item.horaFim}` : ""}`
                    : `${new Date(item.inicio + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}${item.horaInicio ? ` às ${item.horaInicio}` : ""}${item.horaFim ? ` – ${item.horaFim}` : ""}`
                  : "Sem data definida"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Aviso de evento informativo (vitrine) */}
      {isVitrine && (
        <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
          <Info className="mt-0.5 size-5 shrink-0 text-gray-400" />
          <div>
            <p className="font-semibold text-gray-800">Evento informativo</p>
            <p className="mt-0.5 text-sm text-gray-500">
              As inscrições deste campeonato não são feitas pela plataforma. Esta página é
              só pra você acompanhar as informações do evento.
            </p>
          </div>
        </div>
      )}

      {/* Escolha principal: jogar (atleta) ou assistir (plateia) */}
      {!isVitrine && (
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/campeonatos/${publicSlug}/comprar`}
          style={{ background: "linear-gradient(135deg, #FFF3EB 0%, #FFFFFF 100%)" }}
          className="group relative flex items-center gap-3 rounded-2xl border-2 border-brand p-5 text-ink shadow-soft transition-all hover:shadow-elevated"
        >
          <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-ink">
            Inscrição
          </span>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-transform group-hover:scale-105">
            <Trophy className="size-6" />
          </div>
          <div className="min-w-0 pr-16">
            <p className="font-bold text-ink">Sou atleta</p>
            <p className="text-sm text-ink-muted">Inscrever minha dupla</p>
          </div>
        </Link>

        {temIngressoPlateia ? (
          <Link
            href={`/campeonatos/${publicSlug}/plateia`}
            className="group relative flex items-center gap-3 rounded-2xl bg-brand-dark p-5 text-white shadow-soft transition-colors hover:bg-brand-dark-2"
          >
            <span className="absolute right-4 top-4 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Plateia
            </span>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent">
              <Ticket className="size-6" />
            </div>
            <div className="min-w-0 pr-16">
              <p className="font-bold text-white">Vou assistir o evento</p>
              <p className="text-sm text-app-bg/80">Comprar ingresso de plateia</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-gray-100 p-5 text-gray-400 ring-1 ring-black/5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-200">
              <Ticket className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-500">Ingresso de plateia</p>
              <p className="text-sm">Ainda não disponível pra este evento</p>
            </div>
          </div>
        )}
      </div>
      )}

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-2 text-lg font-semibold text-ink">Regulamento</h2>
        <ExpandableTextBlock
          text={championship.regulamento}
          expandLabel="Ver regulamento completo"
          collapseLabel="Ocultar regulamento"
          collapsedMaxHeightClass="max-h-20"
        />
      </section>

      {!isVitrine && (
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink">
          <Users className="size-5" /> Duplas inscritas ({duplas.length})
        </h2>
        {duplas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma dupla inscrita ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {duplas.map((t) => (
              <li key={t.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  Categoria {t.categoriaNome} · {generoLabel(t.categoriaGenero as "masculino" | "feminino" | "mista")}
                </p>
                <div className="space-y-2">
                  {[t.atleta1, t.atleta2].map(
                    (atleta) =>
                      atleta && (
                        atleta.username ? (
                          <Link
                            key={atleta.id}
                            href={`/atletas/${atleta.username}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Avatar nome={atleta.nome} color={atleta.avatarColor} fotoUrl={atleta.fotoUrl} size="sm" />
                            <span className="text-sm text-gray-800">{atleta.nome}</span>
                          </Link>
                        ) : (
                          <div key={atleta.id} className="flex items-center gap-2">
                            <Avatar nome={atleta.nome} color={atleta.avatarColor} fotoUrl={atleta.fotoUrl} size="sm" />
                            <span className="text-sm text-gray-800">{atleta.nome}</span>
                          </div>
                        )
                      ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}
    </div>
  );
}
