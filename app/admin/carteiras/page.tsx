import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDashed } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { walletReadiness } from "@/lib/wallet-readiness";

export default async function WalletReadinessPage() {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([supabase.auth.getUser(), getUserRole(supabase)]);
  if (!user || !isCeo(role)) redirect("/");
  const providers = walletReadiness();
  return <div className="w-full space-y-6 px-6 py-8">
    <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500"><ArrowLeft className="size-4" /> Painel admin</Link>
    <div><h1 className="text-2xl font-semibold text-gray-900">Carteiras digitais</h1><p className="mt-1 text-sm text-gray-500">Diagnóstico de configuração. Nenhum segredo é mostrado nesta página.</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      {([['Apple Wallet', providers.apple], ['Google Wallet', providers.google]] as const).map(([name, status]) => <section key={name} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">{status.ready ? <CheckCircle2 className="size-5 text-emerald-600" /> : <CircleDashed className="size-5 text-amber-600" />}{name}</h2>
        <p className="mt-2 text-sm text-gray-600">{status.configured} de {status.required} requisitos configurados.</p>
        {status.missing.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-500">{status.missing.map((item) => <li key={item}>{item}</li>)}</ul>}
      </section>)}
    </div>
    <p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">Os botões nos ingressos serão liberados somente depois da emissão real ser implementada e homologada com as duas plataformas. O PDF e o link protegido continuam disponíveis.</p>
    <p className="text-sm font-semibold text-blue-600">Próximos passos documentados em docs/WALLET-SETUP.md.</p>
  </div>;
}
