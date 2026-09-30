"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, UserPen, XCircle, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  confirmarAlteracaoTitularidadeAtleta,
  solicitarAlteracaoTitularidadeAtleta,
  cancelarIngressoAtleta,
  type TitularidadeAtletaInput,
} from "@/app/campeonatos/[id]/comprar/ingresso/[ticketId]/actions";
import {
  alterarTitularidadePlateia,
  cancelarIngressoPlateia,
  type TitularidadePlateiaInput,
} from "@/app/campeonatos/[id]/plateia/ingresso/[ticketId]/actions";
import type { RefundPolicyDecision } from "@/lib/refund-policy";
import { RefundPolicySummary } from "@/components/ingressos/RefundPolicySummary";

type DadosAtleta = {
  compradorNome:   string;
  compradorCpf:    string;
  compradorEmail:  string;
  compradorZap:    string | null;
  compradorGenero: string | null;
  parceiroNome:    string;
  parceiroCpf:     string;
  parceiroEmail:   string | null;
  parceiroZap:     string | null;
  parceiroGenero:  string | null;
  categoriaGenero: "masculino" | "feminino" | "mista" | null;
};

type DadosPlateia = {
  compradorNome:  string;
  compradorEmail: string;
  compradorCpf:   string | null;
};

type RefundContext = {
  ticketId: string;
  accessToken: string;
  billingType: string | null;
  refundPolicy: RefundPolicyDecision;
  purchasedAt: string;
  eventStartDate: string | null;
  baseAmount: number;
  paidAmount: number | null;
};

type Props = RefundContext & (
  | { tipo: "atleta"; dadosAtuais: DadosAtleta }
  | { tipo: "plateia"; dadosAtuais: DadosPlateia }
);

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelCls = "block text-xs font-medium text-gray-500";

export function IngressoOpcoesMenu(props: Props) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"titularidade" | "cancelar" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Opções do ingresso"
          className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          <MoreVertical className="size-5" />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
            <button
              type="button"
              onClick={() => { setOpen(false); setModal("titularidade"); }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserPen className="size-4 shrink-0 text-gray-400" /> Alterar titularidade
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setModal("cancelar"); }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <XCircle className="size-4 shrink-0" /> Cancelar ingresso
            </button>
          </div>
        )}
      </div>

      {modal === "titularidade" && (
        <TitularidadeModal {...props} onClose={() => setModal(null)} />
      )}
      {modal === "cancelar" && (
        <CancelarModal
          tipo={props.tipo}
          ticketId={props.ticketId}
          accessToken={props.accessToken}
          billingType={props.billingType}
          refundPolicy={props.refundPolicy}
          purchasedAt={props.purchasedAt}
          eventStartDate={props.eventStartDate}
          baseAmount={props.baseAmount}
          paidAmount={props.paidAmount}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function ModalShell({
  children,
  onClose,
  closeOnBackdrop = true,
}: {
  children: React.ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
}

function TitularidadeModal(props: Props & { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<null | {
    id: string;
    currentEmailMasked: string;
    requiresNewEmailCode: boolean;
    newEmailMasked?: string;
  }>(null);
  const [currentEmailCode, setCurrentEmailCode] = useState("");
  const [newEmailCode, setNewEmailCode] = useState("");

  const atleta = props.tipo === "atleta";
  const d = props.dadosAtuais;

  const categoriaGenero = atleta ? (d as DadosAtleta).categoriaGenero : null;

  const [compradorNome,   setCompradorNome]   = useState(d.compradorNome);
  const [compradorCpf,    setCompradorCpf]    = useState(atleta ? (d as DadosAtleta).compradorCpf : (d as DadosPlateia).compradorCpf ?? "");
  const [compradorEmail,  setCompradorEmail]  = useState(d.compradorEmail);
  const [compradorZap,    setCompradorZap]    = useState(atleta ? (d as DadosAtleta).compradorZap ?? "" : "");
  const [compradorGenero, setCompradorGenero] = useState(atleta ? (d as DadosAtleta).compradorGenero ?? "" : "");
  const [parceiroNome,    setParceiroNome]    = useState(atleta ? (d as DadosAtleta).parceiroNome : "");
  const [parceiroCpf,     setParceiroCpf]     = useState(atleta ? (d as DadosAtleta).parceiroCpf : "");
  const [parceiroEmail,   setParceiroEmail]   = useState(atleta ? (d as DadosAtleta).parceiroEmail ?? "" : "");
  const [parceiroZap,     setParceiroZap]     = useState(atleta ? (d as DadosAtleta).parceiroZap ?? "" : "");
  const [parceiroGenero,  setParceiroGenero]  = useState(atleta ? (d as DadosAtleta).parceiroGenero ?? "" : "");
  const [usarMesmoEmail, setUsarMesmoEmail] = useState(
    atleta && d.compradorEmail.trim().toLowerCase() === ((d as DadosAtleta).parceiroEmail ?? "").trim().toLowerCase(),
  );

  const generoConflita =
    atleta &&
    categoriaGenero &&
    categoriaGenero !== "mista" &&
    ((!!compradorGenero && compradorGenero !== categoriaGenero) ||
      (!!parceiroGenero && parceiroGenero !== categoriaGenero));

  function salvar() {
    setError(null);
    startTransition(async () => {
      const res = atleta
        ? await solicitarAlteracaoTitularidadeAtleta({
            ticketId: props.ticketId,
            accessToken: props.accessToken,
            compradorNome, compradorCpf, compradorEmail, compradorZap, compradorGenero,
            parceiroNome, parceiroCpf, parceiroEmail, parceiroZap, parceiroGenero,
            usarMesmoEmail,
          } satisfies TitularidadeAtletaInput)
        : await alterarTitularidadePlateia({
            ticketId: props.ticketId,
            accessToken: props.accessToken,
            compradorNome, compradorEmail, compradorCpf,
          } satisfies TitularidadePlateiaInput);

      if (!res.ok) { setError(res.error ?? "Erro ao salvar."); return; }
      if (atleta && "completed" in res && !res.completed) {
        setChallenge({
          id: res.challengeId,
          currentEmailMasked: res.currentEmailMasked,
          requiresNewEmailCode: res.requiresNewEmailCode,
          newEmailMasked: res.newEmailMasked,
        });
        return;
      }
      props.onClose();
      const rotatedAccessToken = "accessToken" in res && typeof res.accessToken === "string"
        ? res.accessToken
        : null;
      if (rotatedAccessToken) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("token", rotatedAccessToken);
        router.replace(`${nextUrl.pathname}${nextUrl.search}`);
      } else {
        router.refresh();
      }
    });
  }

  function confirmarCodigos() {
    if (!challenge) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmarAlteracaoTitularidadeAtleta({
        ticketId: props.ticketId,
        accessToken: props.accessToken,
        challengeId: challenge.id,
        currentEmailCode,
        newEmailCode: challenge.requiresNewEmailCode ? newEmailCode : undefined,
      });
      if (!res.ok) { setError(res.error ?? "Não foi possível confirmar."); return; }
      props.onClose();
      if (res.accessToken) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("token", res.accessToken);
        router.replace(`${nextUrl.pathname}${nextUrl.search}`);
      } else {
        router.refresh();
      }
    });
  }

  if (atleta && challenge) {
    return (
      <ModalShell onClose={props.onClose} closeOnBackdrop={false}>
        <p className="mb-1 text-lg font-semibold text-gray-900">Confirme a alteração</p>
        <p className="mb-5 text-sm text-gray-600">
          Enviamos um código para o e-mail atual do comprador. Os dados só serão alterados depois da confirmação.
        </p>
        <label className={labelCls}>Código enviado para {challenge.currentEmailMasked}</label>
        <input
          className={`${inputCls} text-center tracking-[0.35em]`}
          inputMode="numeric"
          maxLength={6}
          value={currentEmailCode}
          onChange={(event) => setCurrentEmailCode(event.target.value.replace(/\D/g, ""))}
          placeholder="000000"
        />
        {challenge.requiresNewEmailCode && (
          <div className="mt-4">
            <label className={labelCls}>Código enviado para o novo e-mail {challenge.newEmailMasked}</label>
            <input
              className={`${inputCls} text-center tracking-[0.35em]`}
              inputMode="numeric"
              maxLength={6}
              value={newEmailCode}
              onChange={(event) => setNewEmailCode(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
          </div>
        )}
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={confirmarCodigos}
            disabled={pending || currentEmailCode.length !== 6 || (challenge.requiresNewEmailCode && newEmailCode.length !== 6)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Confirmando…" : "Confirmar e alterar"}
          </button>
          <button type="button" onClick={() => { setChallenge(null); setError(null); }} disabled={pending} className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700">
            Voltar e corrigir dados
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={props.onClose}>
      <p className="mb-1 text-lg font-semibold text-gray-900">Alterar titularidade</p>
      <p className="mb-5 text-xs text-gray-500">
        A troca é imediata e gratuita. Links e QRs dos atletas alterados serão substituídos e enviados aos novos e-mails.
      </p>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-800">
            {atleta ? "Atleta 1 (titular)" : "Titular do ingresso"}
          </p>
          <div className="space-y-2">
            <div>
              <label className={labelCls}>Nome</label>
              <input required className={inputCls} value={compradorNome} onChange={(e) => setCompradorNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>CPF</label>
                <input required className={inputCls} inputMode="numeric" maxLength={11} value={compradorCpf} onChange={(e) => setCompradorCpf(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <label className={labelCls}>E-mail</label>
                <input required className={inputCls} type="email" value={compradorEmail} onChange={(e) => setCompradorEmail(e.target.value)} />
              </div>
            </div>
            {atleta && (
              <>
                <label className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900">
                  <input
                    type="checkbox"
                    checked={usarMesmoEmail}
                    onChange={(event) => setUsarMesmoEmail(event.target.checked)}
                    className="size-4 rounded border-blue-300"
                  />
                  Enviar as duas credenciais para o e-mail do atleta 1
                </label>
                <div>
                  <label className={labelCls}>WhatsApp</label>
                  <input required className={inputCls} inputMode="numeric" value={compradorZap} onChange={(e) => setCompradorZap(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Gênero</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(["masculino", "feminino"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setCompradorGenero(g)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          compradorGenero === g
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {g === "masculino" ? "Masculino" : "Feminino"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {atleta && (
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800">Atleta 2 (parceiro)</p>
            <div className="space-y-2">
              <div>
                <label className={labelCls}>Nome</label>
                <input required className={inputCls} value={parceiroNome} onChange={(e) => setParceiroNome(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>CPF</label>
                  <input required className={inputCls} inputMode="numeric" maxLength={11} value={parceiroCpf} onChange={(e) => setParceiroCpf(e.target.value.replace(/\D/g, ""))} />
                </div>
                {!usarMesmoEmail && (
                  <div>
                    <label className={labelCls}>E-mail</label>
                    <input required className={inputCls} type="email" value={parceiroEmail} onChange={(e) => setParceiroEmail(e.target.value)} />
                  </div>
                )}
              </div>
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input required className={inputCls} inputMode="numeric" value={parceiroZap} onChange={(e) => setParceiroZap(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Gênero</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(["masculino", "feminino"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setParceiroGenero(g)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        parceiroGenero === g
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {g === "masculino" ? "Masculino" : "Feminino"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {generoConflita && (
        <p className="mt-3 text-xs text-red-600">
          Essa categoria é apenas {categoriaGenero === "feminino" ? "feminina" : "masculina"} — os dois atletas precisam ser do gênero {categoriaGenero === "feminino" ? "feminino" : "masculino"}.
        </p>
      )}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <button
          onClick={salvar}
          disabled={pending || !!generoConflita}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Salvando…" : "Salvar alteração"}
        </button>
        <button
          onClick={props.onClose}
          disabled={pending}
          className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </ModalShell>
  );
}

function CancelarModal({
  tipo,
  ticketId,
  accessToken,
  billingType,
  refundPolicy,
  purchasedAt,
  eventStartDate,
  baseAmount,
  paidAmount,
  onClose,
}: {
  tipo: "atleta" | "plateia";
  ticketId: string;
  accessToken: string;
  billingType: string | null;
  refundPolicy: RefundPolicyDecision;
  purchasedAt: string;
  eventStartDate: string | null;
  baseAmount: number;
  paidAmount: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"cancelado" | "estorno" | null>(null);

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const res = tipo === "atleta"
        ? await cancelarIngressoAtleta(ticketId, accessToken)
        : await cancelarIngressoPlateia(ticketId, accessToken);

      if (!res.ok) { setError(res.error ?? "Erro ao cancelar."); return; }
      setSuccess(res.outcome === "estorno_solicitado" ? "estorno" : "cancelado");
    });
  }

  if (success) {
    const isRefund = success === "estorno";
    const isCard = billingType === "CREDIT_CARD" || billingType === "DEBIT_CARD";
    const title = isRefund
      ? "Seu reembolso foi solicitado com sucesso"
      : "Ingresso cancelado com sucesso";
    const description = isRefund
      ? isCard
        ? "Acompanhe a confirmação neste ingresso. Depois de confirmado, o crédito pode levar até 10 dias úteis para aparecer na fatura."
        : billingType === "PIX"
          ? "Acompanhe a confirmação neste ingresso. No Pix, a devolução será enviada à conta usada no pagamento."
          : "Acompanhe a confirmação e o prazo do reembolso nos detalhes deste ingresso."
      : "A vaga foi liberada e o ingresso continuará disponível no seu histórico.";

    function showUpdatedTicket() {
      onClose();
      router.refresh();
    }

    return (
      <ModalShell onClose={showUpdatedTicket} closeOnBackdrop={false}>
        <div className="py-3 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
          <button
            type="button"
            onClick={showUpdatedTicket}
            className="mt-6 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            OK
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="size-5 text-red-600" />
        </div>
        <p className="font-semibold text-gray-900">Cancelar este ingresso?</p>
      </div>

      <RefundPolicySummary
        decision={refundPolicy}
        purchasedAt={purchasedAt}
        eventStartDate={eventStartDate}
        baseAmount={baseAmount}
        paidAmount={paidAmount}
      />

      {refundPolicy.allowed && (
        <p className="mt-3 text-sm font-medium text-gray-800">
          Ao confirmar, o ingresso e o QR Code serão cancelados. Essa ação não pode ser desfeita.
        </p>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <button
          onClick={confirmar}
          disabled={pending || !refundPolicy.allowed}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending
            ? "Cancelando…"
            : refundPolicy.allowed
              ? "Sim, cancelar ingresso"
              : "Cancelamento indisponível"}
        </button>
        <button
          onClick={onClose}
          disabled={pending}
          className="w-full rounded-2xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 transition-colors"
        >
          Voltar
        </button>
      </div>
    </ModalShell>
  );
}
