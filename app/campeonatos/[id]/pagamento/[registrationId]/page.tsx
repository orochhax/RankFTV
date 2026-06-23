import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PaymentUI } from "@/components/pagamento/PaymentUI";

export default async function PagamentoPage({
  params,
  searchParams,
}: {
  params:       Promise<{ id: string; registrationId: string }>;
  searchParams: Promise<{ pago?: string }>;
}) {
  const { id: champId, registrationId } = await params;
  const { pago: pagoParam } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, valor, status_pagamento, pix_copy_paste, pix_qr_code_base64, team_id, championship_id, category_id")
    .eq("id", registrationId)
    .single();
  if (!reg) notFound();

  const [champRes, catRes, teamRes] = await Promise.all([
    supabase.from("championships").select("nome, is_elite").eq("id", reg.championship_id).single(),
    supabase.from("championship_categories").select("nome").eq("id", reg.category_id).single(),
    supabase.from("teams").select("atleta1_id, atleta2_id").eq("id", reg.team_id).single(),
  ]);

  const champNome = champRes.data?.nome ?? "Campeonato";
  const catNome   = catRes.data?.nome   ?? "—";
  const isElite   = !!champRes.data?.is_elite;

  const atleta1Id = teamRes.data?.atleta1_id ?? null;
  const atleta2Id = teamRes.data?.atleta2_id ?? null;
  const ids = [atleta1Id, atleta2Id].filter(Boolean) as string[];

  const { data: profiles } = ids.length > 0
    ? await supabase.from("profiles").select("id, nome").in("id", ids)
    : { data: [] };

  const profMap  = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const atleta1  = atleta1Id ? (profMap[atleta1Id] ?? null) : null;
  const atleta2  = atleta2Id ? (profMap[atleta2Id] ?? null) : null;

  const isPago = reg.status_pagamento === "pago" || pagoParam === "1";

  if (isPago) {
    return (
      <div className="min-h-screen bg-[#0f0f13]">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm rounded-3xl bg-white p-10 text-center shadow-xl">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="size-9 text-emerald-500" />
            </div>
            <h1 className="mt-5 text-xl font-bold text-gray-900">Pagamento confirmado!</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sua dupla está inscrita na categoria{" "}
              <span className="font-medium text-gray-700">{catNome}</span>.
            </p>
            <p className="mt-1 text-xs text-gray-400">{champNome}</p>
            <Link
              href={`/campeonatos/${champId}`}
              className="mt-8 block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ver campeonato
            </Link>
            <Link href="/minhas-inscricoes" className="mt-3 block text-sm text-gray-400 hover:text-gray-600">
              Minhas inscrições
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PaymentUI
      champId={champId}
      champNome={champNome}
      catNome={catNome}
      valor={Number(reg.valor)}
      isElite={isElite}
      registrationId={registrationId}
      atleta1={atleta1}
      atleta2={atleta2}
      pixCopyPaste={reg.pix_copy_paste ?? null}
      pixQrBase64={reg.pix_qr_code_base64 ?? null}
    />
  );
}
