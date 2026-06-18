"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, CreditCard, QrCode, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatBRL } from "@/lib/format";
import { pagarComCartao } from "@/app/campeonatos/[id]/pagamento/[registrationId]/actions";
import { calcularValorFinal } from "@/lib/asaas";

const AVATAR_COLORS = ["bg-blue-500","bg-emerald-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-teal-500"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

type Atleta = { id: string; nome: string };
type Tab    = "pix" | "cartao";
type Tipo   = "credito" | "debito";

type Props = {
  champId:       string;
  champNome:     string;
  catNome:       string;
  valor:         number;
  registrationId: string;
  atleta1:       Atleta | null;
  atleta2:       Atleta | null;
  pixCopyPaste:  string | null;
  pixQrBase64:   string | null;
};

function CopyPixButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
        copied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
      }`}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado!" : "Copiar código Pix"}
    </button>
  );
}

function CardForm({ valor, registrationId, champId }: { valor: number; registrationId: string; champId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipo,    setTipo]    = useState<Tipo>("credito");
  const [numero,  setNumero]  = useState("");
  const [nome,    setNome]    = useState("");
  const [expiry,  setExpiry]  = useState("");
  const [cvv,     setCvv]     = useState("");
  const [parcelas,setParcelas]= useState(1);
  const [error,   setError]   = useState<string | null>(null);

  const valorTotal   = calcularValorFinal(valor, tipo, parcelas);
  const valorParcela = parcelas > 1 ? valorTotal / parcelas : valorTotal;

  const OPCOES_PARCELAS = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12].filter(
    (n) => valorTotal / n >= 5,
  );

  function handleExpiry(v: string) {
    const prev = expiry;
    if (v.length < prev.length) { setExpiry(v); return; }
    setExpiry(formatExpiry(v));
  }

  function submit(e: React.FormEvent) {
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

    startTransition(async () => {
      const res = await pagarComCartao({
        registrationId,
        tipo,
        numero:      digits,
        nomeTitular: nome,
        mesValidade: mes,
        anoValidade: "20" + ano,
        cvv,
        parcelas: tipo === "credito" ? parcelas : 1,
      });

      if (!res.ok) { setError(res.error); return; }
      if (res.pago) {
        router.push(`/campeonatos/${champId}/pagamento/${registrationId}?pago=1`);
        router.refresh();
      } else {
        setError("Pagamento em análise. Aguarde a confirmação por e-mail.");
      }
    });
  }

  const inputCls = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-500";

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Toggle crédito / débito */}
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

      {/* Número do cartão */}
      <div>
        <label className={labelCls}>Número do cartão</label>
        <div className="relative">
          <input
            className={`${inputCls} pr-10 font-mono tracking-widest`}
            placeholder="0000 0000 0000 0000"
            value={numero}
            onChange={(e) => setNumero(formatCardNumber(e.target.value))}
            inputMode="numeric"
            autoComplete="cc-number"
          />
          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-300" />
        </div>
      </div>

      {/* Nome */}
      <div>
        <label className={labelCls}>Nome no cartão</label>
        <input
          className={`${inputCls} uppercase`}
          placeholder="CARLOS ROCHA"
          value={nome}
          onChange={(e) => setNome(e.target.value.toUpperCase())}
          autoComplete="cc-name"
        />
      </div>

      {/* Validade + CVV */}
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

      {/* Parcelas — só crédito */}
      {tipo === "credito" && (
        <div>
          <label className={labelCls}>Parcelamento</label>
          <select
            className={inputCls}
            value={parcelas}
            onChange={(e) => setParcelas(Number(e.target.value))}
          >
            {OPCOES_PARCELAS.map((n) => {
              const vt = calcularValorFinal(valor, "credito", n);
              return (
                <option key={n} value={n}>
                  {n === 1
                    ? `À vista — ${formatBRL(vt)}`
                    : n <= 6
                    ? `${n}x de ${formatBRL(vt / n)} sem juros — total ${formatBRL(vt)}`
                    : `${n}x de ${formatBRL(vt / n)} — total ${formatBRL(vt)}`}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Até 6x sem juros · 7–12x com taxa adicional de 0,50%
          </p>
        </div>
      )}

      {/* Resumo de débito */}
      {tipo === "debito" && (
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 ring-1 ring-black/5">
          Total: <span className="font-semibold text-gray-900">{formatBRL(valorTotal)}</span>
          <span className="ml-2 text-xs text-gray-400">(5,89% + R$ 0,35 de taxa)</span>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <AlertCircle className="size-4 shrink-0 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {pending
          ? <><Loader2 className="size-4 animate-spin" /> Processando…</>
          : `Pagar ${parcelas > 1 ? `${parcelas}x de ${formatBRL(valorParcela)}` : formatBRL(valorTotal)}`}
      </button>

      <p className="text-center text-xs text-gray-400">
        Seus dados de cartão são enviados de forma segura e não são armazenados.
      </p>
    </form>
  );
}

export function PaymentUI({
  champId,
  champNome,
  catNome,
  valor,
  registrationId,
  atleta1,
  atleta2,
  pixCopyPaste,
  pixQrBase64,
}: Props) {
  const [tab, setTab] = useState<Tab>("pix");

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho escuro ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-lg space-y-5">
          <Link
            href={`/campeonatos/${champId}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar ao campeonato
          </Link>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">Inscrição</p>
            <h1 className="mt-1 text-xl font-bold text-white">{champNome}</h1>
            <p className="text-sm text-white/50">Categoria {catNome}</p>
          </div>

          {(atleta1 || atleta2) && (
            <div className="flex items-center gap-3">
              {atleta1 && (
                <div className="flex items-center gap-2">
                  <Avatar nome={atleta1.nome} color={avatarColor(atleta1.id)} size="sm" />
                  <span className="text-sm font-medium text-white">{atleta1.nome.split(" ")[0]}</span>
                </div>
              )}
              {atleta2 && (
                <>
                  <span className="text-white/30">+</span>
                  <div className="flex items-center gap-2">
                    <Avatar nome={atleta2.nome} color={avatarColor(atleta2.id)} size="sm" />
                    <span className="text-sm font-medium text-white">{atleta2.nome.split(" ")[0]}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{formatBRL(valor)}</span>
            <span className="text-sm text-white/40">por dupla</span>
          </div>
        </div>
      </div>

      {/* ── Área branca ── */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-lg space-y-6">

          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
            {([
              { key: "pix"   as Tab, label: "Pix",    icon: <QrCode className="size-4" /> },
              { key: "cartao"as Tab, label: "Cartão",  icon: <CreditCard className="size-4" /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* ── Tab Pix ── */}
          {tab === "pix" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-gray-50 px-6 py-8 ring-1 ring-black/5">
                {pixQrBase64 ? (
                  <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${pixQrBase64}`}
                      alt="QR Code Pix"
                      className="size-52"
                    />
                  </div>
                ) : (
                  <div className="flex size-52 items-center justify-center rounded-2xl bg-gray-200 text-sm text-gray-400">
                    QR code indisponível
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Abra o app do seu banco e escaneie</p>
                  <p className="mt-0.5 text-xs text-gray-400">Ou copie o código abaixo</p>
                </div>
              </div>

              {pixCopyPaste && (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-black/5">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">Pix copia e cola</p>
                    <p className="break-all font-mono text-xs text-gray-600 leading-relaxed">{pixCopyPaste}</p>
                  </div>
                  <div className="flex justify-center">
                    <CopyPixButton text={pixCopyPaste} />
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-blue-50 px-4 py-4 ring-1 ring-blue-100">
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-blue-500" />Confirmação automática em segundos</li>
                  <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-blue-500" />Válido por 24 horas</li>
                  <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-blue-500" />Disponível em qualquer banco</li>
                </ul>
              </div>

              <Link href={`/campeonatos/${champId}`} className="block text-center text-sm text-gray-400 hover:text-gray-600">
                Pagar depois
              </Link>
            </div>
          )}

          {/* ── Tab Cartão ── */}
          {tab === "cartao" && (
            <CardForm valor={valor} registrationId={registrationId} champId={champId} />
          )}

        </div>
      </div>
    </div>
  );
}
