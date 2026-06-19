"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Save, Crown } from "lucide-react";
import { type PlatformConfig, GATEWAY_FEES } from "@/lib/platform-config";
import { salvarTaxas } from "./actions";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function NetTag({ net }: { net: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
      líquido ≈ {net > 0 ? "+" : ""}{fmt(net)}{net > 0 && "%"}
    </span>
  );
}

function Field({ name, label, suffix, value, onChange }: {
  name: string; label: string; suffix: string; value: number; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-sm text-gray-500 shrink-0">{label}</label>
      <div className="relative">
        <input
          type="number"
          name={name}
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded-xl border border-gray-200 px-3 py-1.5 pr-7 text-right text-sm font-mono focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
      </div>
    </div>
  );
}

export function TaxasForm({ config }: { config: PlatformConfig }) {
  const [v, setV] = useState({ ...config });
  const [saved, setSaved] = useState(false);
  const [erro, setErro]   = useState<string | null>(null);
  const [pending, start]  = useTransition();

  function set(key: keyof PlatformConfig, raw: string) {
    const n = parseFloat(raw);
    setV((prev) => ({ ...prev, [key]: isNaN(n) ? 0 : n }));
    setSaved(false);
    setErro(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await salvarTaxas(fd);
      if (!res.ok) { setErro(res.error ?? "Erro ao salvar."); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  // Líquidos plano gratuito
  const netPix    = v.plataformaPixFixo - GATEWAY_FEES.pix.fixo;
  const netDebito = v.plataformaDebitoPercent - GATEWAY_FEES.debito.percent;
  const netCred0  = v.plataformaCreditoPercent - GATEWAY_FEES.creditoAvista.percent;

  // Líquidos plano premium
  const pNetPix    = v.premiumPixFixo - GATEWAY_FEES.pix.fixo;
  const pNetDebito = v.premiumDebitoPercent - GATEWAY_FEES.debito.percent;
  const pNetCred0  = v.premiumCreditoPercent - GATEWAY_FEES.creditoAvista.percent;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Cabeçalhos dos planos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gray-100 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-gray-700">Plano Gratuito</p>
          <p className="text-xs text-gray-400">Taxa padrão da plataforma</p>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-center ring-1 ring-amber-200">
          <div className="flex items-center justify-center gap-1.5">
            <Crown className="size-4 text-amber-500" />
            <p className="text-sm font-semibold text-amber-700">Plano Premium</p>
          </div>
          <p className="text-xs text-amber-500">Taxa reduzida para assinantes</p>
        </div>
      </div>

      {/* PIX */}
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 shadow-sm space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="text-sm font-semibold text-gray-900">Pix</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-400 pl-7">Asaas: R${fmt(GATEWAY_FEES.pix.fixo)} fixo</p>
          </div>
          <Field name="plataforma_pix_fixo" label="Taxa" suffix="R$" value={v.plataformaPixFixo} onChange={(r) => set("plataformaPixFixo", r)} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Líquido</span>
            <NetTag net={netPix} />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-amber-100 shadow-sm space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="text-sm font-semibold text-gray-900">Pix</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-400 pl-7">Asaas: R${fmt(GATEWAY_FEES.pix.fixo)} fixo</p>
          </div>
          <Field name="premium_pix_fixo" label="Taxa" suffix="R$" value={v.premiumPixFixo} onChange={(r) => set("premiumPixFixo", r)} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Líquido</span>
            <NetTag net={pNetPix} />
          </div>
        </section>
      </div>

      {/* Débito */}
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 shadow-sm space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏦</span>
              <h2 className="text-sm font-semibold text-gray-900">Débito</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-400 pl-7">Asaas: {fmt(GATEWAY_FEES.debito.percent)}% + R${fmt(GATEWAY_FEES.debito.fixo)}</p>
          </div>
          <Field name="plataforma_debito_percent" label="Taxa %" suffix="%" value={v.plataformaDebitoPercent} onChange={(r) => set("plataformaDebitoPercent", r)} />
          <Field name="plataforma_debito_fixo" label="Taxa fixa" suffix="R$" value={v.plataformaDebitoFixo} onChange={(r) => set("plataformaDebitoFixo", r)} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Líquido</span>
            <NetTag net={netDebito} />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-amber-100 shadow-sm space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🏦</span>
              <h2 className="text-sm font-semibold text-gray-900">Débito</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-400 pl-7">Asaas: {fmt(GATEWAY_FEES.debito.percent)}% + R${fmt(GATEWAY_FEES.debito.fixo)}</p>
          </div>
          <Field name="premium_debito_percent" label="Taxa %" suffix="%" value={v.premiumDebitoPercent} onChange={(r) => set("premiumDebitoPercent", r)} />
          <Field name="premium_debito_fixo" label="Taxa fixa" suffix="R$" value={v.premiumDebitoFixo} onChange={(r) => set("premiumDebitoFixo", r)} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Líquido</span>
            <NetTag net={pNetDebito} />
          </div>
        </section>
      </div>

      {/* Crédito */}
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 shadow-sm space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <h2 className="text-sm font-semibold text-gray-900">Crédito</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-400 pl-7">Asaas à vista: {fmt(GATEWAY_FEES.creditoAvista.percent)}%</p>
          </div>
          <Field name="plataforma_credito_percent" label="Taxa %" suffix="%" value={v.plataformaCreditoPercent} onChange={(r) => set("plataformaCreditoPercent", r)} />
          <Field name="plataforma_credito_fixo" label="Taxa fixa" suffix="R$" value={v.plataformaCreditoFixo} onChange={(r) => set("plataformaCreditoFixo", r)} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Líquido à vista</span>
            <NetTag net={netCred0} />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-amber-100 shadow-sm space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <h2 className="text-sm font-semibold text-gray-900">Crédito</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-400 pl-7">Asaas à vista: {fmt(GATEWAY_FEES.creditoAvista.percent)}%</p>
          </div>
          <Field name="premium_credito_percent" label="Taxa %" suffix="%" value={v.premiumCreditoPercent} onChange={(r) => set("premiumCreditoPercent", r)} />
          <Field name="premium_credito_fixo" label="Taxa fixa" suffix="R$" value={v.premiumCreditoFixo} onChange={(r) => set("premiumCreditoFixo", r)} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Líquido à vista</span>
            <NetTag net={pNetCred0} />
          </div>
        </section>
      </div>

      {/* Sobretaxa parcelamento (campo único, vale pra ambos os planos) */}
      <section className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-600">
          Sobretaxa cobrada do atleta — parcelas 7–12x (ambos os planos)
        </p>
        <Field name="atleta_credito_7a12_extra" label="Extra atleta" suffix="%" value={v.atletaCredito7a12Extra} onChange={(r) => set("atletaCredito7a12Extra", r)} />
        <p className="mt-2 text-xs text-blue-500">
          O organizador sempre paga a mesma taxa. Esse extra é adicionado ao valor pago pelo atleta ao parcelar em mais de 6x.
        </p>
      </section>

      {erro && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200">{erro}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          <Save className="size-4" />
          {pending ? "Salvando…" : "Salvar taxas"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" /> Salvo com sucesso!
          </span>
        )}
      </div>
    </form>
  );
}
