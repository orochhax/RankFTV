"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import {
  simularAntecipacoesOrganizador,
  solicitarAntecipacoesOrganizador,
  solicitarSaqueRecebiveisOrganizador,
} from "@/app/painel/campeonatos/[id]/financeiro/actions";

export type WalletSnapshot = {
  totalNet: number;
  available: number;
  pending: number;
  reserved: number;
  withdrawn: number;
  schedule: Array<{ date: string; amount: number }>;
};

export type WalletReceivable = {
  id: string;
  amount: number;
  availableAt: string;
  label: string;
  billingType?: string | null;
};

type DialogMode = "schedule" | "withdrawal" | "anticipation" | null;

type Props = {
  champId: string;
  wallet: WalletSnapshot;
  withdrawableReceivables: WalletReceivable[];
  anticipatableReceivables: WalletReceivable[];
  showValues: boolean;
  onToggleShowValues: () => void;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function OrganizerWalletPanel({
  champId,
  wallet,
  withdrawableReceivables,
  anticipatableReceivables,
  showValues,
  onToggleShowValues,
}: Props) {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([]);
  const [selectedAnticipations, setSelectedAnticipations] = useState<string[]>([]);
  const [withdrawalMessage, setWithdrawalMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [anticipationMessage, setAnticipationMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [anticipationQuote, setAnticipationQuote] = useState<{ fee: number; net: number; documents: number } | null>(null);
  const [withdrawing, startWithdrawal] = useTransition();
  const [anticipating, startAnticipation] = useTransition();
  const val = (value: number) => (showValues ? formatBRL(value) : "R$ ••••••");

  const withdrawalTotal = useMemo(
    () => withdrawableReceivables.reduce(
      (sum, item) => selectedWithdrawals.includes(item.id) ? sum + item.amount : sum,
      0,
    ),
    [selectedWithdrawals, withdrawableReceivables],
  );
  const anticipationTotal = useMemo(
    () => anticipatableReceivables.reduce(
      (sum, item) => selectedAnticipations.includes(item.id) ? sum + item.amount : sum,
      0,
    ),
    [selectedAnticipations, anticipatableReceivables],
  );

  function toggleWithdrawal(id: string, checked: boolean) {
    setWithdrawalMessage(null);
    setSelectedWithdrawals((current) => checked
      ? [...current, id]
      : current.filter((currentId) => currentId !== id));
  }

  function toggleAnticipation(id: string, checked: boolean) {
    setAnticipationMessage(null);
    setAnticipationQuote(null);
    setSelectedAnticipations((current) => checked
      ? [...current, id]
      : current.filter((currentId) => currentId !== id));
  }

  function submitWithdrawal() {
    setWithdrawalMessage(null);
    startWithdrawal(async () => {
      const result = await solicitarSaqueRecebiveisOrganizador(
        champId,
        selectedWithdrawals,
        crypto.randomUUID(),
      );
      setWithdrawalMessage({ ok: result.ok, text: result.message });
      if (result.ok) setSelectedWithdrawals([]);
    });
  }

  function submitAnticipation() {
    setAnticipationMessage(null);
    startAnticipation(async () => {
      if (!anticipationQuote) {
        const quote = await simularAntecipacoesOrganizador(champId, selectedAnticipations);
        if (quote.ok) {
          setAnticipationQuote({ fee: quote.fee, net: quote.net, documents: quote.documents });
        } else {
          setAnticipationMessage({ ok: false, text: quote.message });
        }
        return;
      }
      const result = await solicitarAntecipacoesOrganizador(
        champId,
        selectedAnticipations,
        anticipationQuote.fee,
      );
      setAnticipationMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        setSelectedAnticipations([]);
        setAnticipationQuote(null);
      }
    });
  }

  return (
    <section aria-labelledby="wallet-title" className="space-y-4">
      <div className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_right,_#312e81_0,_#111827_42%,_#030712_100%)] text-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.7)] ring-1 ring-white/10">
        <div className="relative p-5 sm:p-7">
          <div aria-hidden="true" className="absolute -right-14 -top-16 size-48 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-200">
                <WalletCards aria-hidden="true" className="size-4" />
                <h2 id="wallet-title" className="text-xs font-semibold uppercase tracking-[0.18em]">Sua carteira</h2>
              </div>
              <p className="mt-3 text-sm text-slate-300">Tudo o que entrou, está liberado ou ainda será recebido.</p>
            </div>
            <button
              type="button"
              onClick={onToggleShowValues}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              aria-label={showValues ? "Ocultar valores da carteira" : "Mostrar valores da carteira"}
            >
              {showValues ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
              <span className="hidden sm:inline">{showValues ? "Ocultar" : "Mostrar"}</span>
            </button>
          </div>

          <div className="relative mt-7 grid gap-3 md:grid-cols-[1.25fr_1fr_1fr]">
            <BalanceMetric eyebrow="Saldo líquido total" value={val(wallet.totalNet)} featured />
            <BalanceMetric eyebrow="Disponível agora" value={val(wallet.available)} accent="emerald" />
            <button
              type="button"
              onClick={() => setDialogMode("schedule")}
              className="group min-h-28 rounded-2xl bg-white/[0.07] p-4 text-left ring-1 ring-white/10 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-white/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 motion-reduce:transform-none"
            >
              <span className="flex items-center justify-between text-xs font-medium text-amber-200">
                Saldo pendente
                <ChevronRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
              </span>
              <strong className="mt-4 block text-2xl font-bold tabular-nums text-white">{val(wallet.pending)}</strong>
              <span className="mt-1 block text-xs text-slate-400">Veja cada data de liberação</span>
            </button>
          </div>

          {wallet.reserved > 0 ? (
            <div className="relative mt-4 flex items-center gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-100 ring-1 ring-amber-300/20">
              <Clock3 aria-hidden="true" className="size-4 shrink-0" />
              <span><strong>{val(wallet.reserved)}</strong> reservado em solicitações em processamento.</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-950">Movimente seu saldo</h3>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Escolha exatamente quais vendas deseja sacar ou antecipe apenas as compras no cartão que fizerem sentido para você.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={withdrawableReceivables.length === 0}
            onClick={() => setDialogMode("withdrawal")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none"
          >
            <ArrowUpRight aria-hidden="true" className="size-4" />
            Solicitar saque
          </button>
          <button
            type="button"
            disabled={anticipatableReceivables.length === 0}
            onClick={() => setDialogMode("anticipation")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CreditCard aria-hidden="true" className="size-4" />
            Antecipar cartão
          </button>
        </div>
      </div>

      <WalletDialog
        open={dialogMode === "schedule"}
        onClose={() => setDialogMode(null)}
        title="Próximas liberações"
        description="Cada venda tem sua própria data. Quando chegar o dia, o valor passa automaticamente para o saldo disponível."
      >
        {wallet.schedule.length === 0 ? (
          <EmptyState icon={<CalendarDays aria-hidden="true" className="size-5" />} text="Nenhum valor aguardando liberação." />
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {wallet.schedule.map((item) => (
              <div key={item.date} className="flex items-center justify-between gap-4 bg-white px-4 py-3.5">
                <span className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600"><CalendarDays aria-hidden="true" className="size-4" /></span>
                  {formatDate(item.date)}
                </span>
                <strong className="text-sm tabular-nums text-slate-950">{val(item.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </WalletDialog>

      <WalletDialog
        open={dialogMode === "withdrawal"}
        onClose={() => setDialogMode(null)}
        title="Selecionar vendas para saque"
        description="Marque os ingressos que deseja receber agora. O total selecionado será reservado antes do envio para sua chave Pix."
      >
        <DialogBalance label="Saldo disponível" value={val(wallet.available)} tone="emerald" />
        <ReceivableSelector
          items={withdrawableReceivables}
          selected={selectedWithdrawals}
          onToggle={toggleWithdrawal}
          onToggleAll={(checked) => setSelectedWithdrawals(checked ? withdrawableReceivables.map((item) => item.id) : [])}
          emptyText="Nenhum ingresso disponível para saque."
          val={val}
        />
        <div className="sticky bottom-0 -mx-1 mt-5 rounded-2xl bg-slate-950 p-4 text-white shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">Total selecionado</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{val(withdrawalTotal)}</p>
            </div>
            <button
              type="button"
              disabled={withdrawing || selectedWithdrawals.length === 0}
              onClick={submitWithdrawal}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {withdrawing ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <ArrowUpRight aria-hidden="true" className="size-4" />}
              {withdrawing ? "Reservando…" : "Confirmar saque"}
            </button>
          </div>
        </div>
        <StatusMessage message={withdrawalMessage} />
      </WalletDialog>

      <WalletDialog
        open={dialogMode === "anticipation"}
        onClose={() => setDialogMode(null)}
        title="Antecipar vendas no cartão"
        description="Escolha as vendas pendentes. Você verá a taxa e o valor líquido antes de confirmar qualquer antecipação."
      >
        <DialogBalance label="Vendas selecionadas" value={val(anticipationTotal)} tone="amber" />
        <ReceivableSelector
          items={anticipatableReceivables}
          selected={selectedAnticipations}
          onToggle={toggleAnticipation}
          onToggleAll={(checked) => {
            setAnticipationQuote(null);
            setSelectedAnticipations(checked ? anticipatableReceivables.map((item) => item.id) : []);
          }}
          emptyText="Nenhuma venda disponível para antecipação."
          val={val}
        />
        {anticipationQuote ? (
          <div className="mt-4 space-y-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">
            <div className="flex justify-between gap-3"><span>Taxa de antecipação</span><strong className="tabular-nums">{val(anticipationQuote.fee)}</strong></div>
            <div className="flex justify-between gap-3"><span>Valor líquido antecipado</span><strong className="tabular-nums">{val(anticipationQuote.net)}</strong></div>
            {anticipationQuote.documents > 0 ? <p className="pt-1 text-xs leading-5 text-amber-800">O processador solicitou documentos para {anticipationQuote.documents} venda(s). Nenhum valor será liberado antes da regularização.</p> : null}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={anticipating || selectedAnticipations.length === 0}
            onClick={submitAnticipation}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {anticipating ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <CreditCard aria-hidden="true" className="size-4" />}
            {anticipating ? "Processando…" : anticipationQuote ? "Confirmar antecipação" : "Calcular taxa"}
          </button>
        </div>
        <StatusMessage message={anticipationMessage} />
      </WalletDialog>
    </section>
  );
}

function BalanceMetric({ eyebrow, value, featured = false, accent }: { eyebrow: string; value: string; featured?: boolean; accent?: "emerald" }) {
  return (
    <div className={`min-h-28 rounded-2xl p-4 ring-1 ${featured ? "bg-blue-500/15 ring-blue-300/20" : "bg-white/[0.07] ring-white/10"}`}>
      <p className={`text-xs font-medium ${accent === "emerald" ? "text-emerald-300" : "text-slate-300"}`}>{eyebrow}</p>
      <p className={`${featured ? "text-3xl" : "text-2xl"} mt-4 font-bold tabular-nums tracking-tight text-white`}>{value}</p>
      {featured ? <p className="mt-1 text-xs text-blue-200/70">Depois das taxas da plataforma</p> : null}
    </div>
  );
}

function WalletDialog({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description: string; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto max-h-[min(88vh,760px)] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto overscroll-contain rounded-[28px] bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-md"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-balance text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h3>
            <p id={descriptionId} className="mt-2 text-pretty text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </dialog>
  );
}

function DialogBalance({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" }) {
  const colors = tone === "emerald"
    ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
    : "bg-amber-50 text-amber-950 ring-amber-200";
  return (
    <div className={`mb-4 flex items-center justify-between gap-4 rounded-2xl p-4 ring-1 ${colors}`}>
      <span className="text-sm font-medium">{label}</span>
      <strong className="text-xl tabular-nums">{value}</strong>
    </div>
  );
}

function ReceivableSelector({ items, selected, onToggle, onToggleAll, emptyText, val }: {
  items: WalletReceivable[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  emptyText: string;
  val: (value: number) => string;
}) {
  if (items.length === 0) return <EmptyState icon={<CheckCircle2 aria-hidden="true" className="size-5" />} text={emptyText} />;
  const allSelected = selected.length === items.length;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
        <span className="flex items-center gap-3">
          <input type="checkbox" checked={allSelected} onChange={(event) => onToggleAll(event.target.checked)} className="size-4 accent-blue-600" />
          Selecionar todos
        </span>
        <span className="text-xs font-medium text-slate-400">{items.length} venda{items.length === 1 ? "" : "s"}</span>
      </label>
      <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto overscroll-contain">
        {items.map((item) => (
          <label key={item.id} className="flex min-h-16 cursor-pointer items-center justify-between gap-4 bg-white px-4 py-3 transition-colors hover:bg-blue-50/50">
            <span className="flex min-w-0 items-center gap-3">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => onToggle(item.id, event.target.checked)} className="size-4 shrink-0 accent-blue-600" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-400">Disponível em {formatDate(item.availableAt)}</span>
              </span>
            </span>
            <strong className="shrink-0 text-sm tabular-nums text-slate-950">{val(item.amount)}</strong>
          </label>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500"><span className="space-y-2"><span className="mx-auto grid size-10 place-items-center rounded-full bg-white text-slate-400 shadow-sm">{icon}</span><span className="block">{text}</span></span></div>;
}

function StatusMessage({ message }: { message: { ok: boolean; text: string } | null }) {
  return message ? <p role={message.ok ? "status" : "alert"} aria-live="polite" className={`mt-3 rounded-xl px-3 py-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p> : null;
}

function formatDate(value: string) {
  const datePart = value.slice(0, 10);
  return DATE_FORMATTER.format(new Date(`${datePart}T12:00:00Z`));
}
