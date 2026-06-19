import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlatformConfig, GATEWAY_FEES } from "@/lib/platform-config";
import { TaxasForm } from "./TaxasForm";

export default async function AdminTaxasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const config = await getPlatformConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-12 pt-6">
        <div className="mx-auto max-w-2xl">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/30">
            Admin
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Taxas da Plataforma</h1>
          <p className="mt-1 text-sm text-white/40">
            O organizador paga essas taxas — descontadas do repasse após pagamento confirmado.
          </p>

          {/* Referência gateway */}
          <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">
              Custos Asaas (referência — não editável)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/50 sm:grid-cols-3">
              <div>⚡ Pix: R$ {GATEWAY_FEES.pix.fixo.toFixed(2)} fixo</div>
              <div>🏦 Débito: {GATEWAY_FEES.debito.percent}% + R${GATEWAY_FEES.debito.fixo.toFixed(2)}</div>
              <div>💳 Crédito à vista: {GATEWAY_FEES.creditoAvista.percent}% + R${GATEWAY_FEES.creditoAvista.fixo.toFixed(2)}</div>
              <div>💳 Crédito 2–6x: {GATEWAY_FEES.credito2a6.percent}% + R${GATEWAY_FEES.credito2a6.fixo.toFixed(2)}</div>
              <div>💳 Crédito 7–12x: {GATEWAY_FEES.credito7a12.percent}% + R${GATEWAY_FEES.credito7a12.fixo.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-gray-50 px-6 pb-24 pt-8">
        <div className="mx-auto max-w-2xl">
          <TaxasForm config={config} />
        </div>
      </div>
    </div>
  );
}
