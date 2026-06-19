"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { type PlatformConfig, GATEWAY_FEES } from "@/lib/platform-config";
import { salvarTaxas } from "./actions";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function NetTag({ net }: { net: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
      líquido ≈ {net > 0 ? "+" : ""}{fmt(net)}
      {net > 0 && "%"}
    </span>
  );
}

export function TaxasForm({ config }: { config: PlatformConfig }) {
  const [values, setValues] = useState({ ...config });
  const [saved,  setSaved]  = useState(false);
  const [erro,   setErro]   = useState<string | null>(null);
  const [pending, start]    = useTransition();

  function handleChange(key: keyof PlatformConfig, raw: string) {
    const v = parseFloat(raw);
    setValues((prev) => ({ ...prev, [key]: isNaN(v) ? 0 : v }));
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

  // Net liquid estimates (platform fee - gateway cost)
  const netPix    = values.plataformaPixFixo - GATEWAY_FEES.pix.fixo;
  const netDebito = values.plataformaDebitoPercent - GATEWAY_FEES.debito.percent;
  const netCred0  = values.plataformaCreditoPercent - GATEWAY_FEES.creditoAvista.percent;
  const netCred6  = values.plataformaCreditoPercent - GATEWAY_FEES.credito2a6.percent;
  const netCred12 = values.plataformaCreditoPercent - GATEWAY_FEES.credito7a12.percent;

  function Field({ name, label, suffix, valueKey }: {
    name: string; label: string; suffix: string; valueKey: keyof PlatformConfig;
  }) {
    return (
      <div className="flex items-center gap-3">
        <label className="w-36 shrink-0 text-sm text-gray-500">{label}</label>
        <div className="relative">
          <input
            type="number"
            name={name}
            step="0.01"
            min="0"
            value={values[valueKey]}
            onChange={(e) => handleChange(valueKey, e.target.value)}
            className="w-28 rounded-xl border border-gray-200 px-3 py-2 pr-8 text-right text-sm font-mono focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* PIX */}
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h2 className="text-base font-semibold text-gray-900">Pix</h2>
          </div>
          <p className="mt-1 text-xs text-gray-400 pl-8">
            Custo Asaas: R${fmt(GATEWAY_FEES.pix.fixo)} fixo por transação
          </p>
        </div>
        <div className="space-y-3">
          <Field name="plataforma_pix_fixo" label="Taxa plataforma" suffix="R$" valueKey="plataformaPixFixo" />
          <div className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-sm text-gray-400">Líquido</span>
            <NetTag net={netPix} />
            <span className="text-xs text-gray-400">por transação</span>
          </div>
        </div>
      </section>

      {/* Débito */}
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏦</span>
            <h2 className="text-base font-semibold text-gray-900">Cartão de Débito</h2>
          </div>
          <p className="mt-1 text-xs text-gray-400 pl-8">
            Custo Asaas: {fmt(GATEWAY_FEES.debito.percent)}% + R${fmt(GATEWAY_FEES.debito.fixo)}
          </p>
        </div>
        <div className="space-y-3">
          <Field name="plataforma_debito_percent" label="Taxa %" suffix="%" valueKey="plataformaDebitoPercent" />
          <Field name="plataforma_debito_fixo"    label="Taxa fixa"  suffix="R$" valueKey="plataformaDebitoFixo" />
          <div className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-sm text-gray-400">Líquido</span>
            <NetTag net={netDebito} />
            <span className="text-xs text-gray-400">% (taxas fixas se cancelam)</span>
          </div>
        </div>
      </section>

      {/* Crédito */}
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">💳</span>
            <h2 className="text-base font-semibold text-gray-900">Cartão de Crédito</h2>
          </div>
          <div className="mt-1 pl-8 space-y-0.5 text-xs text-gray-400">
            <p>Custo Asaas à vista: {fmt(GATEWAY_FEES.creditoAvista.percent)}% + R${fmt(GATEWAY_FEES.creditoAvista.fixo)}</p>
            <p>Custo Asaas 2–6x: {fmt(GATEWAY_FEES.credito2a6.percent)}% + R${fmt(GATEWAY_FEES.credito2a6.fixo)}</p>
            <p>Custo Asaas 7–12x: {fmt(GATEWAY_FEES.credito7a12.percent)}% + R${fmt(GATEWAY_FEES.credito7a12.fixo)}</p>
          </div>
        </div>
        <div className="space-y-3">
          <Field name="plataforma_credito_percent" label="Taxa % organiz." suffix="%" valueKey="plataformaCreditoPercent" />
          <Field name="plataforma_credito_fixo"    label="Taxa fixa organiz." suffix="R$" valueKey="plataformaCreditoFixo" />

          <div className="mt-2 space-y-1 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm text-gray-400">Líquido à vista</span>
              <NetTag net={netCred0} />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm text-gray-400">Líquido 2–6x</span>
              <NetTag net={netCred6} />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm text-gray-400">Líquido 7–12x</span>
              <NetTag net={netCred12} />
              <span className="text-xs text-gray-400">+ atleta paga extra</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
              Sobretaxa cobrada do atleta — parcelas 7–12x
            </p>
            <Field name="atleta_credito_7a12_extra" label="Extra atleta" suffix="%" valueKey="atletaCredito7a12Extra" />
            <p className="mt-2 text-xs text-blue-500">
              O organizador sempre paga a mesma taxa. Esse extra é adicionado ao valor pago pelo atleta ao parcelar em mais de 6x.
            </p>
          </div>
        </div>
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
