import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Users, Trophy, ChevronLeft, ChevronRight, Radio, CalendarDays, Ticket, Info } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { formatDateRangeBR, generoLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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

const AVATAR_COLORS = ["bg-blue-500","bg-blue-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-teal-500"];
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

  // Campeonato vitrine: evento externo só informativo. Esconde tudo que é
  // inscrição/plateia/chaveamento — a página vira uma vitrine do evento.
  const isVitrine = championship.isVitrine ?? false;

  const voltarCriado = voltar === "criado";
  const backHref  = voltarCriado ? `/painel/campeonatos/${id}/criado` : "/campeonatos";
  const backLabel = voltarCriado ? "Voltar" : "Campeonatos";

  const supabase = await createClient();

  /* ── Duplas inscritas (pagas) ── */
  let duplas: DuplaDisplay[] = [];
  const { data: regs } = await supabase
    .from("registrations")
    .select("team_id")
    .eq("championship_id", id)
    .eq("status_pagamento", "pago");

  if (regs && regs.length > 0) {
    const teamIds = [...new Set(regs.map((r) => r.team_id as string))];
    const { data: teams } = await supabase
      .from("teams")
      .select("id, atleta1_id, atleta2_id, category_id")
      .in("id", teamIds);

    const athleteIdSet = new Set<string>();
    for (const t of teams ?? []) {
      athleteIdSet.add(t.atleta1_id);
      if (t.atleta2_id) athleteIdSet.add(t.atleta2_id);
    }

    const [profilesRes, catsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, nome, username, foto_url")
        .in("id", Array.from(athleteIdSet)),
      supabase
        .from("championship_categories")
        .select("id, nome, genero")
        .in("id", [...new Set((teams ?? []).map((t) => t.category_id))]),
    ]);

    const profMap = Object.fromEntries((profilesRes.data ?? []).map((p) => [p.id, p]));
    const catMap  = Object.fromEntries((catsRes.data ?? []).map((c) => [c.id, c]));

    duplas = (teams ?? []).map((t) => {
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

  /* ── Bracket ── */
  const { count: bracketCount } = await supabase
    .from("bracket_matches")
    .select("id", { count: "exact", head: true })
    .eq("championship_id", id);
  const hasDbBracket = (bracketCount ?? 0) > 0;

  /* ── Cronograma ── */
  const { data: scheduleRow } = await supabase
    .from("championships")
    .select("prevenda_inicio, prevenda_fim, inscricoes_inicio, inscricoes_fim, data_inicio, data_fim")
    .eq("id", id)
    .single();

  type ScheduleItem = { label: string; inicio: string | null; fim: string | null };
  const schedule: ScheduleItem[] = [
    { label: "Pré-venda",   inicio: (scheduleRow as unknown as Record<string,string|null>)?.prevenda_inicio ?? null,   fim: (scheduleRow as unknown as Record<string,string|null>)?.prevenda_fim ?? null },
    { label: "Inscrições",  inicio: (scheduleRow as unknown as Record<string,string|null>)?.inscricoes_inicio ?? null, fim: (scheduleRow as unknown as Record<string,string|null>)?.inscricoes_fim ?? null },
    { label: "Evento",      inicio: (scheduleRow as unknown as Record<string,string|null>)?.data_inicio ?? null,       fim: (scheduleRow as unknown as Record<string,string|null>)?.data_fim ?? null },
  ];

  // Ingressos de plateia disponíveis? (mostra o botão "Vou assistir")
  const { count: ingressoPlateiaCount } = await supabase
    .from("spectator_ticket_types")
    .select("id", { count: "exact", head: true })
    .eq("championship_id", id)
    .eq("ativo", true);
  const temIngressoPlateia = (ingressoPlateiaCount ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> {backLabel}
      </Link>

      <div>
        <div className="relative h-32 overflow-hidden rounded-2xl">
          {championship.bannerUrl ? (
            <Image
              src={championship.bannerUrl}
              alt={championship.nome}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${championship.bannerFrom} ${championship.bannerTo}`} />
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{championship.nome}</h1>
            <p className="text-gray-500">{championship.descricao}</p>
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
                href={`/campeonatos/${championship.id}/chaveamento`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Trophy className="size-4" />
                Ver chaveamento
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="O chaveamento ainda não está disponível"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-400"
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
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                <Radio className="size-4" />
                Ver ao vivo
              </a>
            ) : (
              <span
                aria-disabled="true"
                title="Sem transmissão ao vivo cadastrada"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-400"
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
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <CalendarDays className="size-4 text-blue-500" />
          Cronograma
        </h2>
        <div className="space-y-3">
          {schedule.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <span className="w-24 shrink-0 text-sm font-medium text-gray-700">{item.label}</span>
              <span className="flex-1 text-right text-sm text-gray-500">
                {item.inicio
                  ? item.fim && item.fim !== item.inicio
                    ? `${new Date(item.inicio + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → ${new Date(item.fim + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
                    : new Date(item.inicio + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                  : "Sem data definida"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {championship.status === "em_andamento" && hasDbBracket && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Trophy className="size-5 text-blue-500" />
              Chaveamento ao vivo
            </h2>
            <Link
              href={`/campeonatos/${championship.id}/chaveamento`}
              className="flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Ver completo <ChevronRight className="size-4" />
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            Acesse o chaveamento completo pelo link acima.
          </p>
        </section>
      )}

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
          href={`/campeonatos/${championship.id}/comprar`}
          className="flex items-center gap-3 rounded-2xl bg-blue-600 p-5 text-white transition-colors hover:bg-blue-700"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Trophy className="size-6" />
          </div>
          <div>
            <p className="font-semibold">Sou atleta</p>
            <p className="text-sm text-blue-100/80">Inscrever minha dupla</p>
          </div>
        </Link>

        {temIngressoPlateia ? (
          <Link
            href={`/campeonatos/${championship.id}/plateia`}
            className="flex items-center gap-3 rounded-2xl bg-gray-900 p-5 text-white transition-colors hover:bg-gray-800"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Ticket className="size-6" />
            </div>
            <div>
              <p className="font-semibold">Vou assistir o evento</p>
              <p className="text-sm text-white/60">Comprar ingresso de plateia</p>
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

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Regulamento</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{championship.regulamento}</p>
      </section>

      {!isVitrine && (
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
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
                        <Link
                          key={atleta.id}
                          href={`/atletas/${atleta.username}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Avatar nome={atleta.nome} color={atleta.avatarColor} fotoUrl={atleta.fotoUrl} size="sm" />
                          <span className="text-sm text-gray-800">{atleta.nome}</span>
                        </Link>
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
