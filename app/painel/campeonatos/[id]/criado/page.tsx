import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  CalendarDays,
  MapPin,
  Tag,
  DollarSign,
  ArrowRight,
  ExternalLink,
  LayoutDashboard,
  Rocket,
  Eye,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBRL, formatDateRangeBR, generoLabel } from "@/lib/format";
import { PageContainer } from "@/components/shell/PageContainer";
import { Surface } from "@/components/shell/Surface";
import type { ChampionshipStatus, GeneroCategoria } from "@/lib/types";

type CatRow = {
  id: string;
  nome: string;
  genero: string;
  valor_inscricao: number;
  max_duplas: number | null;
};

// Card de sucesso pós-criação. Em vez de jogar direto pro painel, mostramos um
// resumo do que foi criado + o próximo passo (configurar PIX) no momento certo
// do funil — depois do organizador já ter investido o esforço de criar.
export default async function CampeonatoCriadoPage({
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

  const resolved = await getDbChampionshipById(id);
  if (!resolved || resolved.organizadorId !== user.id) notFound();
  const champId = resolved.id;
  const publicSlug = resolved.slug ?? champId;

  const { data: champ } = await supabase
    .from("championships")
    .select("nome, data_inicio, data_fim, cidade, estado, status, organizador_id")
    .eq("id", champId)
    .maybeSingle();

  if (!champ) notFound();

  const [{ data: rawCats }, { data: orgAccount }] = await Promise.all([
    supabase
      .from("championship_categories")
      .select("id, nome, genero, valor_inscricao, max_duplas")
      .eq("championship_id", champId)
      .order("nome"),
    supabase
      .from("organizer_accounts")
      .select("chave_pix, status_verificacao, motivo_rejeicao")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const cats = (rawCats ?? []) as CatRow[];
  const temChavePix      = !!orgAccount?.chave_pix;
  const temCategoriaPaga = cats.some((c) => (c.valor_inscricao ?? 0) > 0);
  const vagasTotais      = cats.reduce((acc, c) => acc + (c.max_duplas ?? 0), 0);
  const publicado        = champ.status === "inscricoes_abertas";

  return (
    <PageContainer width="prose" className="space-y-6 py-10">
      {/* ── Cabeçalho celebratório ── */}
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-soft">
          <CheckCircle2 className="size-9 text-brand" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          {publicado ? "Campeonato no ar! 🎉" : "Campeonato criado! 🎉"}
        </h1>
        <p className="mt-2 text-ink-muted">
          <span className="font-medium text-ink">{champ.nome}</span>{" "}
          {publicado
            ? "está com inscrições abertas."
            : "foi criado como rascunho."}
        </p>
      </div>

      {/* Resumo do campeonato */}
      <Surface padding="lg">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="font-semibold text-ink">{champ.nome}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {formatDateRangeBR(champ.data_inicio, champ.data_fim)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {champ.cidade} — {champ.estado}
              </span>
            </div>
          </div>
          <StatusBadge status={champ.status as ChampionshipStatus} />
        </div>

        {/* Mini stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-border">
            <p className="text-xs text-ink-muted">Categorias</p>
            <p className="text-lg font-bold text-ink">{cats.length}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-border">
            <p className="text-xs text-ink-muted">Vagas totais</p>
            <p className="text-lg font-bold text-ink">
              {vagasTotais > 0 ? vagasTotais : "—"}
            </p>
          </div>
        </div>

        {/* Lista de categorias */}
        {cats.length > 0 && (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl ring-1 ring-border">
            {cats.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="size-3.5 text-ink-muted" />
                  <span className="text-sm font-medium text-ink">{cat.nome}</span>
                  <span className="text-xs text-ink-muted">
                    {generoLabel(cat.genero as GeneroCategoria)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-ink">
                  {cat.valor_inscricao > 0 ? formatBRL(cat.valor_inscricao) : "Grátis"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      {/* Rascunho: aviso de status */}
      {!publicado && (
        <div className="space-y-3">
          <div className="rounded-card-lg bg-warning-bg p-4 ring-1 ring-warning/30">
            <p className="font-semibold text-ink">Ainda é um rascunho</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Só você consegue ver. Publique pra abrir as inscrições públicas.
            </p>
          </div>

          {temCategoriaPaga && (
            orgAccount?.status_verificacao === "em_analise" ? (
              <div className="rounded-card-lg bg-brand-soft p-4 ring-1 ring-brand-border flex items-start gap-3">
                <Clock className="size-5 shrink-0 text-brand mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-ink">Documentos em análise de segurança</p>
                  <p className="text-ink-muted text-xs mt-0.5">
                    Sua conta de organizador está sendo verificada pela equipe (até 24h úteis). A publicação de inscrições pagas será liberada assim que concluída.
                  </p>
                </div>
              </div>
            ) : orgAccount?.status_verificacao === "rejeitado" ? (
              <Link
                href={`/perfil/ativar-organizador?champId=${id}`}
                className="rounded-card-lg bg-rose-50 p-4 ring-1 ring-rose-200 flex items-start gap-3 transition-colors hover:brightness-95"
              >
                <AlertTriangle className="size-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="text-sm flex-1">
                  <p className="font-semibold text-rose-900">Pendência nos documentos do organizador</p>
                  <p className="text-rose-800 text-xs mt-0.5">
                    {orgAccount.motivo_rejeicao || "Por favor, reenvie seus documentos para liberar as vendas."}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-rose-700">Reenviar documentos agora →</p>
                </div>
              </Link>
            ) : (!temChavePix || orgAccount?.status_verificacao !== "aprovado") ? (
              <Link
                href={`/perfil/ativar-organizador?champId=${id}`}
                className="rounded-card-lg bg-warning-bg p-4 ring-1 ring-warning/30 flex items-start gap-3 transition-colors hover:brightness-95"
              >
                <DollarSign className="size-5 shrink-0 text-warning mt-0.5" />
                <div className="text-sm flex-1">
                  <p className="font-semibold text-ink">Configure seu recebimento e envie seus documentos</p>
                  <p className="text-ink-muted text-xs mt-0.5">
                    Este evento tem categorias pagas. Para receber os valores e liberar as vendas, cadastre sua chave Pix e envie seus documentos.
                  </p>
                  <p className="mt-1 text-xs font-medium text-warning">Configurar recebimento agora →</p>
                </div>
              </Link>
            ) : null
          )}
        </div>
      )}

      {/* Publicado mas sem PIX (segurança — não deveria acontecer após o fluxo de publicar) */}
      {publicado && temCategoriaPaga && !temChavePix && (
        <Link
          href={`/painel/campeonatos/${publicSlug}/financeiro`}
          className="flex items-start gap-3 rounded-card-lg bg-warning-bg p-4 ring-1 ring-warning/30 transition-colors hover:brightness-95"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface">
            <DollarSign className="size-5 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Falta 1 passo: configure seu PIX</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Pra receber o dinheiro das inscrições, cadastre a chave PIX onde
              você quer receber. Sem isso, os atletas não conseguem se inscrever.
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-warning">
              Configurar agora <ArrowRight className="size-3" />
            </p>
          </div>
        </Link>
      )}

      {/* Ações */}
      {!publicado ? (
        <div className="space-y-3">
          <Link
            href={`/painel/campeonatos/${publicSlug}/publicar`}
            className="flex w-full items-center justify-center gap-2 rounded-card-lg bg-brand px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <Rocket className="size-4" /> Quero publicar
          </Link>
          <Link
            href={`/campeonatos/${publicSlug}?voltar=criado`}
            className="flex w-full items-center justify-center gap-2 rounded-card-lg bg-surface-2 px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-border/40"
          >
            <Eye className="size-4" /> Ver página pública (prévia)
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <Link
            href={`/painel/campeonatos/${publicSlug}`}
            className="flex w-full items-center justify-center gap-2 rounded-card-lg bg-brand px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <LayoutDashboard className="size-4" /> Ir para o painel do campeonato
          </Link>
          <Link
            href={`/campeonatos/${publicSlug}`}
            className="flex w-full items-center justify-center gap-2 rounded-card-lg bg-surface-2 px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-border/40"
          >
            <ExternalLink className="size-4" /> Ver página pública
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
