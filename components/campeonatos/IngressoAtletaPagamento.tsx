"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, QrCode, CreditCard, Loader2, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatBRL } from "@/lib/format";
import { calcularTaxaComprador, calcularTotalComprador } from "@/lib/taxas";
import { pagarIngressoAtletaComCartao } from "@/app/campeonatos/[id]/comprar/ingresso/[ticketId]/actions";

type Tab  = "pix" | "cartao";
type Tipo = "credito" | "debito";

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}
function formatCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

type Props = {
  ticketId:     string;
  accessToken:  string;
  isElite:      boolean;
  initialStatusPagamento: string; // "pendente" | "pago" | "estornado"
  initialCheckedIn: boolean;
  initialEntradaQr: string | null;
  qrToken:      string | null;
  code:         string | null;
  valor:        number;
  pixCopyPaste: string | null;
  pixQrBase64:  string | null;
};

export function IngressoAtletaPagamento({
  ticketId,
  accessToken,
  isElite,
  initialStatusPagamento,
  initialCheckedIn,
  initialEntradaQr,
  qrToken,
  code,
  valor,
  pixCopyPaste,
  pixQrBase64,
}: Props) {
  const [statusPagamento, setStatusPagamento] = useState(initialStatusPagamento);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [entradaQr, setEntradaQr] = useState(initialEntradaQr);
  const [tab, setTab] = useState<Tab>("pix");
  const stoppedRef = useRef(false);

  const pago = statusPagamento === "pago";

  async function gerarEntradaQr() {
    if (!qrToken) return;
    const dataUrl = await QRCode.toDataURL(qrToken, {
      width: 280,
      margin: 2,
      color: { dark: "#0f0f13", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    setEntradaQr(dataUrl);
  }

  // Polling: verifica a cada 3s se o Pix foi confirmado. Para sozinho
  // quando pago ou após 20 minutos.
  useEffect(() => {
    if (pago) return;
    stoppedRef.current = false;
    let timer: ReturnType<typeof setTimeout>;

    async function check() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(`/api/ticket-status?tipo=atleta&id=${ticketId}&token=${accessToken}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.status_pagamento === "pago") {
            setStatusPagamento("pago");
            setCheckedIn(!!data.checked_in);
            await gerarEntradaQr();
            return;
          }
        }
      } catch {
        // falha de rede — tenta de novo no próximo tick
      }
      if (!stoppedRef.current) timer = setTimeout(check, 3000);
    }

    timer = setTimeout(check, 3000);
    const maxTimer = setTimeout(() => { stoppedRef.current = true; clearTimeout(timer); }, 20 * 60 * 1000);

    return () => { stoppedRef.current = true; clearTimeout(timer); clearTimeout(maxTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pago, ticketId, accessToken, qrToken]);

  if (pago) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600">
          <CheckCircle2 className="size-4" /> Inscrição confirmada
        </div>
        {entradaQr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entradaQr} alt="QR de entrada" width={220} height={220} className={`rounded-2xl ${checkedIn ? "opacity-40 grayscale" : ""}`} />
        )}
        <p className="text-xs text-gray-400">
          {checkedIn ? "Check-in já realizado" : "Apresente este QR na entrada do evento"}
        </p>
        {code && <p className="font-mono text-xs tracking-[0.2em] text-gray-400">{code}</p>}
        <p className="text-xs text-blue-600">Salve o link desta página para acessar depois.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
        {([
          { key: "pix" as Tab, label: "Pix", icon: <QrCode className="size-4" /> },
          { key: "cartao" as Tab, label: "Cartão", icon: <CreditCard className="size-4" /> },
        ]).map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {tab === "pix" ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
            <Clock className="size-4" /> Aguardando pagamento
          </div>
          {pixQrBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${pixQrBase64}`} alt="QR Pix" width={220} height={220} className="rounded-2xl ring-1 ring-black/5" />
          ) : (
            <div className="flex size-[220px] items-center justify-center rounded-2xl bg-gray-100">
              <Clock className="size-10 text-gray-300" />
            </div>
          )}
          <p className="text-lg font-bold text-gray-900">{formatBRL(Number(valor))}</p>
          {pixCopyPaste && (
            <div className="flex w-full items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-black/5">
              <span className="flex-1 truncate font-mono text-xs text-gray-500">{pixCopyPaste}</span>
              <CopyButton text={pixCopyPaste} />
            </div>
          )}
          <p className="text-xs text-gray-400">
            Pague pelo app do seu banco. Assim que cair, a inscrição é confirmada e o QR de entrada aparece aqui automaticamente.
          </p>
        </div>
      ) : (
        <CardForm
          ticketId={ticketId}
          accessToken={accessToken}
          valor={valor}
          isElite={isElite}
          onPago={async () => {
            setStatusPagamento("pago");
            await gerarEntradaQr();
          }}
        />
      )}
    </div>
  );
}

function CardForm({
  ticketId,
  accessToken,
  valor,
  isElite,
  onPago,
}: {
  ticketId: string;
  accessToken: string;
  valor: number;
  isElite: boolean;
  onPago: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [tipo,    setTipo]    = useState<Tipo>("credito");
  const [numero,  setNumero]  = useState("");
  const [nome,    setNome]    = useState("");
  const [expiry,  setExpiry]  = useState("");
  const [cvv,     setCvv]     = useState("");
  const [cep,     setCep]     = useState("");
  const [numeroEndereco, setNumeroEndereco] = useState("");
  const [parcelas,setParcelas]= useState(1);
  const [error,   setError]   = useState<string | null>(null);

  const taxa         = calcularTaxaComprador(valor, tipo, isElite);
  const valorAtleta  = calcularTotalComprador(valor, tipo, isElite);
  const valorParcela = valorAtleta / parcelas;

  const OPCOES_PARCELAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(
    (n) => valorAtleta / n >= 5,
  );

  function handleExpiry(v: string) {
    if (v.length < expiry.length) { setExpiry(v); return; }
    setExpiry(formatExpiry(v));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const [mes, ano] = expiry.split("/");
    if (!mes || !ano || mes.length !== 2 || ano.length !== 2) {
      setError("Data de validade inválida. Use MM/AA."); return;
    }
    const digits = numero.replace(/\s/g, "");
    if (digits.length < 16) { setError("Número do cartão incompleto."); return; }
    if (cvv.length < 3)     { setError("CVV inválido."); return; }
    if (!nome.trim())       { setError("Digite o nome como está no cartão."); return; }

    if (cep.replace(/\D/g, "").length !== 8) { setError("CEP invalido."); return; }
    if (!numeroEndereco.trim()) { setError("Informe o numero do endereco do titular."); return; }

    setPending(true);
    const res = await pagarIngressoAtletaComCartao({
      ticketId,
      accessToken,
      tipo,
      numero:      digits,
      nomeTitular: nome,
      mesValidade: mes,
      anoValidade: "20" + ano,
      cvv,
      parcelas: tipo === "credito" ? parcelas : 1,
      cep,
      numeroEndereco,
    });
    setPending(false);

    if (!res.ok) { setError(res.error); return; }
    if (res.pago) onPago();
    else setError("Pagamento em análise. Aguarde a confirmação por e-mail.");
  }

  const inputCls = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-500";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
        {(["credito", "debito"] as Tipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTipo(t); setParcelas(1); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
              tipo === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "credito" ? "Crédito" : "Débito"}
          </button>
        ))}
      </div>

      <div>
        <label className={labelCls}>Número do cartão</label>
        <input
          className={`${inputCls} font-mono tracking-widest`}
          placeholder="0000 0000 0000 0000"
          value={numero}
          onChange={(e) => setNumero(formatCardNumber(e.target.value))}
          inputMode="numeric"
          autoComplete="cc-number"
        />
      </div>

      <div>
        <label className={labelCls}>Nome no cartão</label>
        <input
          className={`${inputCls} uppercase`}
          placeholder="NOME COMO NO CARTÃO"
          value={nome}
          onChange={(e) => setNome(e.target.value.toUpperCase())}
          autoComplete="cc-name"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Validade</label>
          <input
            className={inputCls}
            placeholder="MM/AA"
            value={expiry}
            onChange={(e) => handleExpiry(e.target.value)}
            inputMode="numeric"
            autoComplete="cc-exp"
            maxLength={5}
          />
        </div>
        <div>
          <label className={labelCls}>CVV</label>
          <input
            className={inputCls}
            placeholder="•••"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>CEP do titular</label>
          <input className={inputCls} placeholder="00000-000" value={cep}
            onChange={(e) => setCep(formatCEP(e.target.value))} inputMode="numeric"
            autoComplete="postal-code" maxLength={9} required />
        </div>
        <div>
          <label className={labelCls}>Numero</label>
          <input className={inputCls} placeholder="123" value={numeroEndereco}
            onChange={(e) => setNumeroEndereco(e.target.value.slice(0, 20))}
            autoComplete="address-line2" maxLength={20} required />
        </div>
      </div>

      {tipo === "credito" && (
        <div>
          <label className={labelCls}>Parcelamento</label>
          <select
            className={inputCls}
            value={parcelas}
            onChange={(e) => setParcelas(Number(e.target.value))}
          >
            {OPCOES_PARCELAS.map((n) => {
              const vParcela = valorAtleta / n;
              if (n === 1) return <option key={n} value={n}>À vista — {formatBRL(valorAtleta)}</option>;
              return <option key={n} value={n}>{n}x de {formatBRL(vParcela)} sem juros</option>;
            })}
          </select>
        </div>
      )}

      <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between text-gray-500">
          <span>Ingresso</span><span>{formatBRL(valor)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-gray-500">
          <span>Taxa de serviço</span><span>+ {formatBRL(taxa)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
          <span>Total</span><span>{formatBRL(valorAtleta)}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {pending
          ? <><Loader2 className="size-4 animate-spin" /> Processando…</>
          : parcelas === 1
          ? `Pagar ${formatBRL(valorAtleta)}`
          : `Pagar ${parcelas}x de ${formatBRL(valorParcela)}`}
      </button>

      <p className="text-center text-xs text-gray-400">
        Seus dados de cartão são processados com segurança e não ficam armazenados.
      </p>
    </form>
  );
}
