import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TAXAS_EXIBICAO } from "@/lib/taxas";

export default async function AdminTaxasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const { padrao, elite, minimo } = TAXAS_EXIBICAO;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-12 pt-6">
        <div className="mx-auto max-w-2xl">
          <Link href="/admin" className="mb-4 flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors w-fit">
            <ArrowLeft className="size-4" />
            Admin
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Taxas da Plataforma</h1>
          <p className="mt-1 text-sm text-white/40">
            A taxa de serviço é paga pelo comprador (somada ao valor). O organizador recebe o
            valor cheio; a plataforma fica com a taxa.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-gray-50 px-6 pb-24 pt-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <PlanoCard titulo="Padrão" pix={padrao.pix} cartao={padrao.cartao} minimo={minimo} />
          <PlanoCard titulo="Elite" pix={elite.pix} cartao={elite.cartao} minimo={minimo} destaque />

          <p className="rounded-2xl bg-white p-4 text-xs text-gray-400 ring-1 ring-black/5">
            Cartão é flat (crédito/débito, à vista ou parcelado em até 12x = mesma taxa). A taxa
            nunca é menor que o mínimo. Pra alterar esses valores, edite{" "}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-gray-600">lib/taxas.ts</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanoCard({
  titulo, pix, cartao, minimo, destaque,
}: {
  titulo: string; pix: number; cartao: number; minimo: number; destaque?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 ring-1 ${destaque ? "bg-amber-50 ring-amber-300" : "bg-white ring-black/5"}`}>
      <p className="font-semibold text-gray-900">{titulo}</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex justify-between"><span className="text-gray-500">⚡ Pix</span><span className="font-medium text-gray-900">{pix}%</span></li>
        <li className="flex justify-between"><span className="text-gray-500">💳 Cartão (crédito/débito)</span><span className="font-medium text-gray-900">{cartao}%</span></li>
        <li className="flex justify-between"><span className="text-gray-500">Mínimo</span><span className="font-medium text-gray-900">R$ {minimo.toFixed(2).replace(".", ",")}</span></li>
      </ul>
    </div>
  );
}
