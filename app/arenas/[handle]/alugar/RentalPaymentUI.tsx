"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, AlertCircle, CheckCircle, ArrowLeft, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { alugarQuadra } from "./actions";
import { formatBRL } from "@/lib/format";

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
function formatExpiry(v: string, prev: string) {
  if (v.length < prev.length) return v;
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

type Tipo = "credito" | "debito";

type Props = {
  planId:       string;
  handle:       string;
  planNome:     string;
  valorBase:    number;
  aceitaCredito: boolean;
  aceitaDebito:  boolean;
  cpfSalvo:     string | null;
};

const TAXA = 0.10;

export function RentalPaymentUI({ planId, handle, planNome, valorBase, aceitaCredito, aceitaDebito, cpfSalvo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sucesso, setSucesso]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  const defaultTipo: Tipo = aceitaCredito ? "credito" : "debito";
  const [tipo,   setTipo]   = useState<Tipo>(defaultTipo);
  const [data,   setData]   = useState("");
  const [hora,   setHora]   = useState("");
  const [cpf,    setCpf]    = useState(cpfSalvo ? formatCPF(cpfSalvo) : "");
  const [numero, setNumero] = useState("");
  const [nome,   setNome]   = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv,    setCvv]    = useState("");

  const valorTotal = parseFloat((valorBase * (1 + TAXA)).toFixed(2));
  const taxa       = parseFloat((valorBase * TAXA).toFixed(2));

  function handleExpiry(v: string) {
    setExpiry((prev) => formatExpiry(v, prev));
  }

  // Data mínima = amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cpfNum = cpf.replace(/\D/g, "");
    if (cpfNum.length !== 11)  { setError("CPF inválido."); return; }
    if (!data)                  { setError("Selecione a data do aluguel."); return; }
    if (!hora)                  { setError("Selecione o horário."); return; }

    const [mes, ano] = expiry.split("/");
    if (!mes || !ano || mes.length !== 2 || ano.length !== 2) {
      setError("Data de validade inválida. Use MM/AA."); return;
    }
    const digits = numero.replace(/\s/g, "");
    if (digits.length < 16) { setError("Número do cartão incompleto."); return; }
    if (cvv.length < 3)     { setError("CVV inválido."); return; }
    if (!nome.trim())       { setError("Digite o nome como está no cartão."); return; }

    startTransition(async () => {
      const res = await alugarQuadra({
        planId,
        handle,
        data,
        hora,
        cpf:         cpfNum,
        tipo,
        numero:      digits,
        nomeTitular: nome,
        mesValidade: mes,
        anoValidade: "20" + ano,
        cvv,
      });

      if (!res.ok) { setError(res.error); return; }
      setSucesso(true);
    });
  }

  if (sucesso) {
    const dataFmt = data
      ? new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      : "";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f13] px-6 py-12">
        <div className="w-full max-w-sm rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle className="size-9 text-blue-500" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-gray-900">Reserva confirmada!</h1>
          <p className="mt-2 text-sm text-gray-500">
            Quadra reservada para{" "}
            <span className="font-medium text-gray-700">{dataFmt} às {hora}</span>.
            A arena receberá a notificação.
          </p>
          <button
            onClick={() => { router.push(`/arenas/${handle}`); router.refresh(); }}
            className="mt-8 block w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ir para a arena
          </button>
        </div>
      </div>
    );
  }

  const mostrarToggle = aceitaCredito && aceitaDebito;
  const inputCls = "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-500";

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho escuro ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-lg space-y-4">
          <Link
            href={`/arenas/${handle}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">Aluguel de quadra</p>
            <h1 className="mt-1 text-xl font-bold text-white">{planNome}</h1>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{formatBRL(valorBase)}</span>
            <span className="text-sm text-white/40">/hora</span>
          </div>
        </div>
      </div>

      {/* ── Área branca ── */}
      <div className="relative -mt-6 min-h-screen rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-lg space-y-6">
          <form onSubmit={submit} className="space-y-5">

            {/* Data e hora */}
            <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100 space-y-3">
              <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <CalendarCheck className="size-4" /> Escolha data e horário
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-blue-700">Data</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={data}
                    min={minDate}
                    onChange={(e) => setData(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700">Horário</label>
                  <input
                    type="time"
                    className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Toggle crédito/débito */}
            {mostrarToggle && (
              <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
                {(["credito", "debito"] as Tipo[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-all ${
                      tipo === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t === "credito" ? "Crédito" : "Débito"}
                  </button>
                ))}
              </div>
            )}

            {!mostrarToggle && (
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CreditCard className="size-4 text-blue-500" />
                {aceitaCredito ? "Cartão de crédito" : "Cartão de débito"}
              </p>
            )}

            {/* CPF */}
            <div>
              <label className={labelCls}>CPF do titular</label>
              <input
                className={inputCls}
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                inputMode="numeric"
                maxLength={14}
                required
              />
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
                  required
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
                required
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
                  required
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
                  required
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between text-gray-500">
                <span>Aluguel (1h)</span><span>{formatBRL(valorBase)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-gray-500">
                <span>Taxa de serviço (10%)</span><span>+ {formatBRL(taxa)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>Total</span><span>{formatBRL(valorTotal)}</span>
              </div>
            </div>

            {/* Erro */}
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
                : `Reservar e pagar ${formatBRL(valorTotal)}`
              }
            </button>

            <p className="text-center text-xs text-gray-400">
              Seus dados de cartão são processados com segurança e não ficam armazenados.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
