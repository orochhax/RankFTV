"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, UserPen, XCircle, Loader2, AlertTriangle } from "lucide-react";
import {
  alterarTitularidadeAtleta,
  cancelarIngressoAtleta,
  type TitularidadeAtletaInput,
} from "@/app/campeonatos/[id]/comprar/ingresso/[ticketId]/actions";
import {
  alterarTitularidadePlateia,
  cancelarIngressoPlateia,
  type TitularidadePlateiaInput,
} from "@/app/campeonatos/[id]/plateia/ingresso/[ticketId]/actions";

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

type Props =
  | { tipo: "atleta"; ticketId: string; accessToken: string; dadosAtuais: DadosAtleta }
  | { tipo: "plateia"; ticketId: string; accessToken: string; dadosAtuais: DadosPlateia };

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
        <CancelarModal tipo={props.tipo} ticketId={props.ticketId} accessToken={props.accessToken} onClose={() => setModal(null)} />
      )}
    </>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function TitularidadeModal(props: Props & { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        ? await alterarTitularidadeAtleta({
            ticketId: props.ticketId,
            accessToken: props.accessToken,
            compradorNome, compradorCpf, compradorEmail, compradorZap, compradorGenero,
            parceiroNome, parceiroCpf, parceiroEmail, parceiroZap, parceiroGenero,
          } satisfies TitularidadeAtletaInput)
        : await alterarTitularidadePlateia({
            ticketId: props.ticketId,
            accessToken: props.accessToken,
            compradorNome, compradorEmail, compradorCpf,
          } satisfies TitularidadePlateiaInput);

      if (!res.ok) { setError(res.error ?? "Erro ao salvar."); return; }
      props.onClose();
      router.refresh();
    });
  }

  return (
    <ModalShell onClose={props.onClose}>
      <p className="mb-1 text-lg font-semibold text-gray-900">Alterar titularidade</p>
      <p className="mb-5 text-xs text-gray-500">
        A troca é imediata e gratuita. O QR de entrada continua o mesmo.
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
                <div>
                  <label className={labelCls}>E-mail</label>
                  <input required className={inputCls} type="email" value={parceiroEmail} onChange={(e) => setParceiroEmail(e.target.value)} />
                </div>
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
  onClose,
}: {
  tipo: "atleta" | "plateia";
  ticketId: string;
  accessToken: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const res = tipo === "atleta"
        ? await cancelarIngressoAtleta(ticketId, accessToken)
        : await cancelarIngressoPlateia(ticketId, accessToken);

      if (!res.ok) { setError(res.error ?? "Erro ao cancelar."); return; }
      onClose();
      router.refresh();
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="size-5 text-red-600" />
        </div>
        <p className="font-semibold text-gray-900">Cancelar este ingresso?</p>
      </div>

      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 space-y-1.5">
        <p>Se ainda não foi pago, é só cancelado, sem cobrança.</p>
        <p>Se já foi pago: até 7 dias da compra, estorno total. Depois de 7 dias, estorno parcial (sem a taxa de serviço), conforme o CDC.</p>
        <p className="font-medium text-gray-800">Essa ação não pode ser desfeita.</p>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <button
          onClick={confirmar}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Cancelando…" : "Sim, cancelar ingresso"}
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
