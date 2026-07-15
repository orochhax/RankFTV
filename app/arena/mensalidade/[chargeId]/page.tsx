import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatBRL } from "@/lib/format";

// Tela do aluno para pagar a mensalidade via Pix.
export default async function MensalidadePage({
  params,
}: {
  params: Promise<{ chargeId: string }>;
}) {
  const { chargeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: charge } = await supabase
    .from("student_charges")
    .select("id, competencia, valor, status_pagamento, pix_copy_paste, pix_qr_code_base64, arena_id, arenas(nome)")
    .eq("id", chargeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!charge) notFound();

  const arenaRow = Array.isArray(charge.arenas) ? charge.arenas[0] : charge.arenas;
  const arenaNome = (arenaRow as { nome?: string })?.nome ?? "Arena";
  const pago = charge.status_pagamento === "pago";

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-md px-6 py-8">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="size-4" /> Perfil
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-xl">
          <div className="bg-black px-6 py-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Mensalidade</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{arenaNome}</p>
            <p className="mt-0.5 text-xs text-white/50">
              {charge.competencia.slice(5)}/{charge.competencia.slice(0,4)}
            </p>
          </div>

          <div className="px-6 py-6">
            {pago ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="size-10 text-blue-500" />
                <p className="font-semibold text-blue-700">Mensalidade paga!</p>
                <p className="text-sm text-gray-500">{formatBRL(Number(charge.valor))}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <Clock className="size-4" /> Aguardando pagamento
                </div>
                {charge.pix_qr_code_base64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${charge.pix_qr_code_base64}`}
                    alt="QR Pix"
                    width={220}
                    height={220}
                    className="rounded-2xl ring-1 ring-black/5"
                  />
                ) : (
                  <div className="flex size-[220px] items-center justify-center rounded-2xl bg-gray-100">
                    <Clock className="size-10 text-gray-300" />
                  </div>
                )}
                <p className="text-lg font-bold text-gray-900">{formatBRL(Number(charge.valor))}</p>
                {charge.pix_copy_paste && (
                  <div className="flex w-full items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 ring-1 ring-black/5">
                    <span className="flex-1 truncate font-mono text-xs text-gray-500">
                      {charge.pix_copy_paste}
                    </span>
                    <CopyButton text={charge.pix_copy_paste} />
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Pague pelo app do seu banco. A confirmação é automática.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
