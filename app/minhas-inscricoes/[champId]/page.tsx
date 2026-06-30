import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Link2,
  MapPin,
  ScrollText,
  Shirt,
  Users,
} from "lucide-react";

import { CopiarLink } from "@/components/ui/CopiarLink";
import { TamanhoCamisaPicker } from "@/components/inscricoes/TamanhoCamisaPicker";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRangeBR, formatBRL, generoLabel } from "@/lib/format";
import type { ChampionshipStatus } from "@/lib/types";

type TeamRow = {
  id: string;
  status: string;
  atleta1_id: string;
  atleta2_id: string | null;
  parceiro_username: string | null;
  championships: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim: string;
    cidade: string;
    estado: string;
    local: string;
    status: string;
    regulamento: string;
  } | null;
  championship_categories: {
    nome: string;
    genero: string;
    valor_inscricao: number;
  } | null;
  registrations: {
    id: string;
    valor: number;
    status_pagamento: string;
  }[] | null;
};

const PAG_BADGE: Record<string, { label: string; className: string; icon: "check" | "clock" }> = {
  pago:      { label: "Pagamento confirmado",   className: "bg-blue-100 text-blue-700", icon: "check" },
  pendente:  { label: "Aguardando pagamento",   className: "bg-amber-100  text-amber-700",   icon: "clock" },
  estornado: { label: "Pagamento estornado",    className: "bg-red-100    text-red-700",     icon: "clock" },
};

export default async function IngressoPage({
  params,
}: {
  params: Promise<{ champId: string }>;
}) {
  const { champId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Busca a inscrição do usuário neste campeonato (pega a mais recente caso haja duplicatas)
  const { data: teamsRes } = await supabase
    .from("teams")
    .select(`
      id, status, atleta1_id, atleta2_id, parceiro_username,
      championships(id, nome, data_inicio, data_fim, cidade, estado, local, status, regulamento),
      championship_categories(nome, genero, valor_inscricao),
      registrations(id, valor, status_pagamento)
    `)
    .eq("championship_id", champId)
    .or(`atleta1_id.eq.${user.id},atleta2_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(1);

  const rawTeam = teamsRes?.[0] ?? null;
  if (!rawTeam) notFound();

  const team = rawTeam as unknown as TeamRow;
  const champ = team.championships;
  if (!champ) notFound();

  const cat = team.championship_categories;
  const reg = team.registrations?.[0];
  const pagCfg = reg ? PAG_BADGE[reg.status_pagamento] ?? PAG_BADGE["pendente"] : PAG_BADGE["pendente"];

  // Busca credencial (QR token + código curto) deste usuário neste campeonato
  const { data: credential } = await supabase
    .from("credentials")
    .select("qr_token, code, checked_in, checkin_at")
    .eq("user_id", user.id)
    .eq("championship_id", champId)
    .maybeSingle();

  // Busca perfil do parceiro (se existir)
  let parceiro: { nome: string; username: string } | null = null;
  const parceiroId = team.atleta1_id === user.id ? team.atleta2_id : team.atleta1_id;
  if (parceiroId) {
    const { data } = await supabase
      .from("profiles")
      .select("nome, username")
      .eq("id", parceiroId)
      .maybeSingle();
    parceiro = data;
  }

  // Busca perfil do próprio usuário (inclui tamanho_camisa para seção de uniforme)
  const { data: meProfile } = await supabase
    .from("profiles")
    .select("nome, username, tamanho_camisa")
    .eq("id", user.id)
    .maybeSingle();

  // Gera QR code como data URL (server-side, sem lib no browser)
  let qrDataUrl: string | null = null;
  if (credential?.qr_token) {
    qrDataUrl = await QRCode.toDataURL(credential.qr_token, {
      width: 280,
      margin: 2,
      color: { dark: "#0f0f13", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  }

  const isPago = reg?.status_pagamento === "pago";
  const isCheckedIn = credential?.checked_in ?? false;

  // Atleta2 (convidado) que ainda não confirmou o tamanho de camisa
  const isAtleta2 = team.atleta1_id !== user.id;
  const precisaConfirmarCamisa = isAtleta2
    && team.status === "confirmado"
    && !meProfile?.tamanho_camisa;

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-md space-y-4">
          <Link
            href="/minhas-inscricoes"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Minhas inscrições
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{champ.nome}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
              <span className="flex items-center gap-1">
                <CalendarDays className="size-4" />
                {formatDateRangeBR(champ.data_inicio, champ.data_fim)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {champ.cidade} — {champ.estado}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={champ.status as ChampionshipStatus} />
            {isCheckedIn && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
                <CheckCircle2 className="size-3.5" /> Check-in realizado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-md space-y-5">

          {/* ── Ingresso / QR ── */}
          <div className="overflow-hidden rounded-3xl ring-1 ring-black/8 shadow-sm">
            {/* Topo do ingresso */}
            <div className="bg-[#0f0f13] px-5 py-4">
              {/* Código curto — discreet, para digitação manual se o QR falhar */}
              {credential?.code && (
                <p className="mb-2 text-center font-mono text-[10px] tracking-[0.25em] text-white/50">
                  {credential.code}
                </p>
              )}
              <p className="text-center text-[11px] font-bold uppercase tracking-widest text-white/40">
                Ingresso digital
              </p>
              {cat && (
                <p className="mt-0.5 text-center text-sm font-semibold text-white">
                  {cat.nome} · {generoLabel(cat.genero as "masculino" | "feminino" | "mista")}
                </p>
              )}
            </div>

            {/* QR code */}
            <div className="bg-white px-8 py-6">
              {qrDataUrl ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="QR code do ingresso"
                    width={220}
                    height={220}
                    className={`rounded-2xl ${isCheckedIn ? "opacity-40 grayscale" : ""}`}
                  />
                  {isCheckedIn ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
                      <CheckCircle2 className="size-4" />
                      Check-in já realizado
                      {credential?.checkin_at && (
                        <span className="text-gray-400">
                          · {new Date(credential.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-gray-400">
                      Apresente este código na entrada do evento
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                    <Clock className="size-8 text-gray-300" />
                  </div>
                  <p className="text-center text-sm text-gray-400">
                    {isPago
                      ? "Seu ingresso está sendo gerado. Verifique em breve."
                      : "Ingresso disponível após confirmação do pagamento."}
                  </p>
                </div>
              )}
            </div>

            {/* Linha pontilhada separadora */}
            <div className="relative border-t border-dashed border-gray-200">
              <div className="absolute -left-4 top-1/2 size-8 -translate-y-1/2 rounded-full bg-gray-50" />
              <div className="absolute -right-4 top-1/2 size-8 -translate-y-1/2 rounded-full bg-gray-50" />
            </div>

            {/* Info rápida do atleta */}
            <div className="bg-white px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{meProfile?.nome ?? "Atleta"}</p>
                  {meProfile?.username && (
                    <p className="text-xs text-gray-400">@{meProfile.username}</p>
                  )}
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${pagCfg.className}`}>
                  {pagCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* ── Informações do evento ── */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Informações do evento
            </h2>

            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <InfoRow icon={<MapPin className="size-4 text-gray-400" />} label="Local">
                <span className="text-sm font-medium text-gray-900">{champ.local}</span>
                <br />
                <span className="text-xs text-gray-400">
                  {champ.cidade} — {champ.estado}
                </span>
              </InfoRow>

              <InfoRow icon={<CalendarDays className="size-4 text-gray-400" />} label="Data">
                <span className="text-sm font-medium text-gray-900">
                  {formatDateRangeBR(champ.data_inicio, champ.data_fim)}
                </span>
              </InfoRow>

              <InfoRow icon={<Shirt className="size-4 text-gray-400" />} label="Retirada do kit">
                <span className="text-sm text-gray-500">
                  Informação divulgada pelo organizador
                </span>
              </InfoRow>
            </div>
          </section>

          {/* ── Minha dupla ── */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Minha dupla
            </h2>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              <InfoRow icon={<Users className="size-4 text-gray-400" />} label="Parceiro">
                {parceiro ? (
                  <div>
                    <span className="text-sm font-medium text-gray-900">{parceiro.nome}</span>
                    <br />
                    <span className="text-xs text-gray-400">@{parceiro.username}</span>
                  </div>
                ) : (
                  <span className="text-sm text-amber-600">Aguardando parceiro aceitar o convite</span>
                )}
              </InfoRow>

              <InfoRow icon={<Users className="size-4 text-gray-400" />} label="Status da dupla">
                <span className={`text-sm font-medium ${
                  team.status === "confirmado" ? "text-blue-600" :
                  team.status === "cancelado"  ? "text-red-600" :
                  "text-amber-600"
                }`}>
                  {team.status === "confirmado"       ? "Dupla confirmada" :
                   team.status === "convite_pendente" ? "Aguardando parceiro" :
                   "Cancelado"}
                </span>
              </InfoRow>

              {reg && (
                <InfoRow icon={<CheckCircle2 className="size-4 text-gray-400" />} label="Valor pago">
                  <span className="text-sm font-medium text-gray-900">
                    {formatBRL(Number(reg.valor))}
                  </span>
                </InfoRow>
              )}
            </div>
          </section>

          {/* ── Tamanho do uniforme (atleta2 após aceitar convite) ── */}
          {isAtleta2 && team.status === "confirmado" && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Uniforme
              </h2>
              {precisaConfirmarCamisa ? (
                <TamanhoCamisaPicker champId={champId} />
              ) : (
                <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/5">
                  <Shirt className="size-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Tamanho confirmado</p>
                    <p className="text-sm font-semibold text-gray-900">{meProfile?.tamanho_camisa}</p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Card de convite ── */}
          {team.status === "convite_pendente" && team.atleta1_id === user.id && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Convidar parceiro
              </h2>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 space-y-3">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-blue-500" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-800">
                      Compartilhe o link de convite
                    </p>
                    <p className="text-xs text-gray-500">
                      Envie para seu parceiro. Se ele ainda não tem conta no RankFTV,
                      peça para criar uma — ao acessar o link, ele poderá aceitar o
                      convite e selecionar o tamanho da camisa.
                    </p>
                  </div>
                </div>
                <CopiarLink
                  link={`${process.env.NEXT_PUBLIC_BASE_URL}/convite/${team.id}`}
                />
                {team.parceiro_username && (
                  <p className="text-center text-xs text-gray-400">
                    Convite enviado para{" "}
                    <span className="font-medium text-gray-600">
                      @{team.parceiro_username}
                    </span>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Regulamento ── */}
          {champ.regulamento && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Regulamento
              </h2>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <ScrollText className="mt-0.5 size-4 shrink-0 text-gray-400" />
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                    {champ.regulamento}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Link para ver a página pública */}
          <Link
            href={`/campeonatos/${champ.id}`}
            className="flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
          >
            Ver página pública do campeonato
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-xs font-medium text-gray-400">{label}</p>
        {children}
      </div>
    </div>
  );
}
