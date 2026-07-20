"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, AlertCircle, CheckCircle, Trash2, RotateCw, Inbox, Pencil } from "lucide-react";
import { salvarCartaoArena, removerCartaoArena } from "@/app/arenas/[handle]/financeiro/actions";
import { tentarCobrancaNovamente } from "@/app/arena/actions";
import { CATEGORIA_LABEL, STATUS_COBRANCA_LABEL, type CobrancaHistorico, type StatusCobranca } from "@/lib/arena-cobranca";
import { formatBRL } from "@/lib/format";

type Cartao = { brand: string | null; last4: string | null; exp_month: number | null; exp_year: number | null };

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.slice(0, 3) + "." + d.slice(3);
  if (d.length <= 9) return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6);
  return d.slice(0, 3) + "." + d.slice(3, 6) + "." + d.slice(6, 9) + "-" + d.slice(9);
}
function formatCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function formatExpiry(v: string, prev: string) {
  if (v.length < prev.length) return v;
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

const STATUS_BADGE_CLS: Record<StatusCobranca, string> = {
  pendente:    "bg-orange-50 text-orange-600",
  processando: "bg-amber-50 text-amber-600",
  pago:        "bg-emerald-50 text-emerald-600",
  falhou:      "bg-red-50 text-red-600",
  estornado:   "bg-gray-100 text-gray-500",
  cancelado:   "bg-gray-100 text-gray-400",
};

function CartaoForm({ arenaId, handle, onClose }: { arenaId: string; handle: string; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [numeroEndereco, setNumeroEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const inputCls = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-500";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cpfNum = cpf.replace(/\D/g, "");
    if (cpfNum.length !== 11) { setError("CPF inválido."); return; }
    const [mes, ano] = expiry.split("/");
    if (!mes || !ano || mes.length !== 2 || ano.length !== 2) { setError("Data de validade inválida. Use MM/AA."); return; }
    const digits = numero.replace(/\s/g, "");
    if (digits.length < 16) { setError("Número do cartão incompleto."); return; }
    if (cvv.length < 3) { setError("CVV inválido."); return; }
    if (!nome.trim()) { setError("Digite o nome como está no cartão."); return; }
    if (cep.replace(/\D/g, "").length !== 8) { setError("CEP inválido."); return; }
    if (!numeroEndereco.trim()) { setError("Informe o número do endereço do titular."); return; }

    startTransition(async () => {
      const res = await salvarCartaoArena({
        arenaId, handle, cpf: cpfNum, cep, numeroEndereco,
        numero: digits, nomeTitular: nome, mesValidade: mes, anoValidade: "20" + ano, cvv,
      });
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <p className="mb-4 text-lg font-semibold text-gray-900">Cadastrar cartão</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelCls}>CPF do titular</label>
            <input className={inputCls} placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} inputMode="numeric" maxLength={14} required />
          </div>
          <div>
            <label className={labelCls}>Número do cartão</label>
            <input className={`${inputCls} font-mono tracking-widest`} placeholder="0000 0000 0000 0000" value={numero} onChange={(e) => setNumero(formatCardNumber(e.target.value))} inputMode="numeric" autoComplete="cc-number" required />
          </div>
          <div>
            <label className={labelCls}>Nome no cartão</label>
            <input className={`${inputCls} uppercase`} placeholder="CARLOS ROCHA" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} autoComplete="cc-name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>CEP do titular</label>
              <input className={inputCls} placeholder="00000-000" value={cep} onChange={(e) => setCep(formatCEP(e.target.value))} inputMode="numeric" maxLength={9} required />
            </div>
            <div>
              <label className={labelCls}>Número</label>
              <input className={inputCls} placeholder="123" value={numeroEndereco} onChange={(e) => setNumeroEndereco(e.target.value.slice(0, 20))} maxLength={20} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Validade</label>
              <input className={inputCls} placeholder="MM/AA" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value, expiry))} inputMode="numeric" autoComplete="cc-exp" maxLength={5} required />
            </div>
            <div>
              <label className={labelCls}>CVV</label>
              <input className={inputCls} placeholder="•••" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="cc-csc" maxLength={4} required />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {pending && <Loader2 className="size-4 animate-spin" />} Salvar cartão
            </button>
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Cancelar
            </button>
          </div>
          <p className="text-center text-xs text-gray-400">
            Seus dados de cartão são processados com segurança pelo Asaas e não ficam armazenados aqui.
          </p>
        </form>
      </div>
    </div>
  );
}

export function FinanceiroAlunoClient({
  arenaId,
  handle,
  cartao,
  historico,
  cobrancasComRetry,
}: {
  arenaId: string;
  handle: string;
  cartao: Cartao | null;
  historico: CobrancaHistorico[];
  cobrancasComRetry: string[];
}) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [removendo, startRemover] = useTransition();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [pendingRetry, startRetry] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const retrySet = new Set(cobrancasComRetry);

  function remover() {
    startRemover(async () => {
      await removerCartaoArena(arenaId);
      router.refresh();
    });
  }

  function retry(id: string) {
    setRetrying(id);
    setMsg(null);
    startRetry(async () => {
      const r = await tentarCobrancaNovamente(id);
      if (r.error) setMsg({ tipo: "erro", texto: r.error });
      else { setMsg({ tipo: "ok", texto: "Pagamento confirmado." }); router.refresh(); }
      setRetrying(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Cartão padrão ── */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-700">Cartão padrão</h2>
        </div>
        <p className="mt-1 text-xs text-gray-400">Usado pra recorrência e aulas avulsas nesta arena.</p>

        {cartao ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {cartao.brand ?? "Cartão"} •••• {cartao.last4 ?? "----"}
              </p>
              {cartao.exp_month && cartao.exp_year && (
                <p className="text-xs text-gray-400">
                  Validade {String(cartao.exp_month).padStart(2, "0")}/{cartao.exp_year}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => setMostrarForm(true)} aria-label="Trocar cartão" className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                <Pencil className="size-4" />
              </button>
              <button type="button" onClick={remover} disabled={removendo} aria-label="Remover cartão" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                {removendo ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarForm(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <CreditCard className="size-4" /> Cadastrar cartão
          </button>
        )}
      </section>

      {/* ── Histórico ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Histórico de cobranças</h2>
        {historico.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
            <Inbox className="size-8 text-gray-300" />
            <p className="text-sm text-gray-400">Nenhuma cobrança ainda.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {historico.map((item) => (
              <li key={`${item.categoria}-${item.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{item.descricao}</p>
                  <p className="text-xs text-gray-400">{CATEGORIA_LABEL[item.categoria]}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{formatBRL(item.valor)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE_CLS[item.status]}`}>
                    {STATUS_COBRANCA_LABEL[item.status]}
                  </span>
                  {retrySet.has(item.id) && (
                    <button
                      type="button"
                      onClick={() => retry(item.id)}
                      disabled={pendingRetry && retrying === item.id}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {pendingRetry && retrying === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {msg && (
          <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${msg.tipo === "ok" ? "text-emerald-600" : "text-red-600"}`}>
            {msg.tipo === "ok" ? <CheckCircle className="size-3.5" /> : <AlertCircle className="size-3.5" />} {msg.texto}
          </p>
        )}
      </section>

      {mostrarForm && <CartaoForm arenaId={arenaId} handle={handle} onClose={() => setMostrarForm(false)} />}
    </div>
  );
}
