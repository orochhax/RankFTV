import Link from "next/link";
import { ArrowRight, Banknote, Check, ClipboardList, ShieldCheck } from "lucide-react";
import type { TabCopy } from "@/components/landing/para-voce-data";

/** Faixa de números-chave e grade de 6 benefícios da aba selecionada. */
export function ParaVoceBenefitsSection({ copy }: { copy: TabCopy }) {
  return (
    <>
      <section aria-label="Resumo da operação" className="grid gap-4 md:grid-cols-3">
        {copy.highlights.map((item) => (
          <div
            key={item.titulo}
            className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
          >
            <p className="text-2xl font-extrabold tracking-tight text-brand-ink">
              {item.valor}
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{item.titulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              {item.detalhe}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-ink">
            {copy.benefitsEyebrow}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {copy.benefitsHeading}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {copy.benefits.map(({ icon: Icon, titulo, descricao, tag }) => (
            <article
              key={titulo}
              className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-soft transition hover:border-brand-border"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {descricao}
                </p>
              </div>
              <div className="mt-5 border-t border-border pt-3 text-xs font-semibold text-brand-ink">
                ✓ {tag}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

/** Seção de transparência de taxas e repasses para organizadores de campeonato. */
export function CampeonatoFinanceDetails() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-ink">
          Transparência financeira
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Taxas e política de repasse claras antes de começar
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2.5 text-ink">
            <Banknote className="size-5 text-brand" />
            <h3 className="text-base font-bold">Taxa paga pelo comprador</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">
            No checkout, a taxa de serviço é somada ao preço do ingresso ou inscrição — você define o valor líquido e recebe{" "}
            <strong className="text-ink">100% dele</strong>.
          </p>
          <ul className="space-y-2 border-t border-border pt-3 text-xs text-ink">
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Plano Padrão: <strong>Pix 8%</strong> e <strong>Cartão (até 12x) 10%</strong>
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Plano Elite: <strong>Pix 7%</strong> e <strong>Cartão 9%</strong> (taxa mínima de R$ 3,99)
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Inscrições ou ingressos gratuitos têm taxa zero
            </li>
          </ul>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2.5 text-ink">
            <ShieldCheck className="size-5 text-brand" />
            <h3 className="text-base font-bold">Adiantamento de 70% + Reserva de 30%</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-muted">
            Use seu saldo antes do evento para pagar estrutura, tendas, árbitros e premiação com segurança para você e para os atletas.
          </p>
          <ul className="space-y-2 border-t border-border pt-3 text-xs text-ink">
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Até <strong>70%</strong> do líquido liberado para saque Pix pré-evento
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              <strong>30%</strong> em reserva técnica liberada 2 dias úteis após o fim
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Verificação KYC rápida enviada direto no painel antes de publicar evento pago
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Comparativo transparente entre os planos Start e Pro para arenas. */
export function ArenaPlansComparison() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-ink">
          Planos da plataforma
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          Comece pequeno sem mensalidade fixa ou escale sem limite de alunos
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Plano Start
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-ink">R$ 0</span>
            <span className="text-xs font-semibold text-ink-muted">/mês fixo</span>
          </div>
          <p className="mt-2 rounded-xl bg-surface-2 p-2.5 text-xs text-ink">
            Cobrança de <strong>R$ 4,90 por aluno ativo / mês</strong> (recorrente), limitado a 30 alunos.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-ink">
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Até 30 alunos simultâneos
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Chamada e presenças pelo celular
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              1 login de professor / dono
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border-2 border-brand bg-surface p-6 shadow-elevated">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-ink">
              Plano Pro
            </span>
            <span className="rounded-full bg-accent px-3 py-0.5 text-[11px] font-bold text-accent-ink">
              Mais escolhido
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-brand">R$ 139</span>
            <span className="text-xs font-bold text-ink">,00 /mês</span>
          </div>
          <p className="mt-2 rounded-xl bg-brand-soft p-2.5 text-xs font-semibold text-brand-ink">
            Alunos ilimitados: zero taxa por aluno adicional conforme sua arena cresce.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-ink">
            <li className="flex items-center gap-2 font-semibold">
              <Check className="size-4 shrink-0 text-success" />
              Alunos, turmas e equipe ilimitados
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Lembretes e Pix Copia e Cola automático no WhatsApp
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-success" />
              Radar Anti-Desistência + Torneios Internos + Selo Verificado
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Banner de rodapé com CTA principal e botão para alternar entre Campeonato e Arena. */
export function ParaVoceFinalBanner({
  heading,
  subtitle,
  primaryHref,
  primaryLabel,
  switchLabel,
  onSwitchTab,
}: {
  heading: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  switchLabel: string;
  onSwitchTab: () => void;
}) {
  return (
    <section className="rounded-3xl bg-brand-dark p-6 text-white sm:p-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            Pronto para começar?
          </p>
          <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
          <p className="text-sm text-app-bg/80">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row md:shrink-0">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white transition hover:bg-brand-hover"
          >
            {primaryLabel}
            <ArrowRight className="size-4" />
          </Link>
          <button
            type="button"
            onClick={onSwitchTab}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ClipboardList className="size-4" />
            {switchLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
