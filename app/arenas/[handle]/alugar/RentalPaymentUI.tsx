"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CalendarCheck, CreditCard, Loader2 } from "lucide-react";
import { alugarQuadra } from "./actions";
import { formatBRL } from "@/lib/format";

type Props = { planId: string; handle: string; planNome: string; valorBase: number; aceitaCredito: boolean; cpfSalvo: string | null };
const TAXA = 0.1;

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function RentalPaymentUI({ planId, handle, planNome, valorBase, aceitaCredito, cpfSalvo }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [cpf, setCpf] = useState(cpfSalvo ? formatCPF(cpfSalvo) : "");
  const total = Number((valorBase * (1 + TAXA)).toFixed(2));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const cpfNum = cpf.replace(/\D/g, "");
    if (cpfNum.length !== 11) return setError("CPF inválido.");
    if (!data || !hora) return setError("Selecione a data e o horário do aluguel.");
    if (!aceitaCredito) return setError("Esta arena não aceita cartão de crédito para aluguel.");
    startTransition(async () => {
      const result = await alugarQuadra({ planId, handle, data, hora, cpf: cpfNum, tipo: "credito" });
      if (!result.ok) return setError(result.error);
      window.location.assign(result.invoiceUrl);
    });
  }

  return <main className="min-h-screen bg-app-bg">
    <header className="bg-brand-dark px-6 pb-16 pt-6"><div className="mx-auto max-w-lg space-y-4">
      <Link href={`/arenas/${handle}`} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"><ArrowLeft className="size-4" /> Voltar</Link>
      <div><p className="text-xs font-medium uppercase tracking-widest text-white/40">Aluguel de quadra</p><h1 className="mt-1 text-xl font-bold text-white">{planNome}</h1></div>
      <p className="text-3xl font-bold text-white">{formatBRL(valorBase)} <span className="text-sm font-normal text-white/45">/hora</span></p>
    </div></header>
    <section className="relative -mt-6 min-h-screen rounded-t-3xl bg-app-bg px-6 pb-24 pt-8"><form onSubmit={submit} className="mx-auto max-w-lg space-y-5">
      <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"><p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800"><CalendarCheck className="size-4" /> Escolha data e horário</p><div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-blue-700">Data<input type="date" value={data} min={minDate} onChange={(event) => setData(event.target.value)} className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm" required /></label>
        <label className="text-xs font-medium text-blue-700">Horário<input type="time" value={hora} onChange={(event) => setHora(event.target.value)} className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm" required /></label>
      </div></div>
      <label className="block text-xs font-medium text-gray-600">CPF do pagador<input value={cpf} onChange={(event) => setCpf(formatCPF(event.target.value))} inputMode="numeric" maxLength={14} placeholder="000.000.000-00" className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" required /></label>
      <div className="rounded-xl bg-gray-50 p-4 text-sm ring-1 ring-black/5"><div className="flex justify-between text-gray-500"><span>Aluguel (1h)</span><span>{formatBRL(valorBase)}</span></div><div className="mt-1 flex justify-between text-gray-500"><span>Taxa de serviço (10%)</span><span>+ {formatBRL(valorBase * TAXA)}</span></div><div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900"><span>Total</span><span>{formatBRL(total)}</span></div></div>
      {error && <div className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200"><AlertCircle className="size-4 shrink-0" />{error}</div>}
      <button type="submit" disabled={pending || !aceitaCredito} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{pending ? <><Loader2 className="size-4 animate-spin" /> Abrindo checkout…</> : <><CreditCard className="size-4" /> Pagar com cartão</>}</button>
      <p className="text-center text-xs text-gray-500">Você preencherá os dados do cartão diretamente no checkout seguro do Asaas. O RankFTV não recebe nem armazena número ou CVV.</p>
    </form></section>
  </main>;
}
