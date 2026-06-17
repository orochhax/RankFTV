import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { CopyButton } from "@/components/ui/CopyButton";

export default async function PagamentoPage({
  params,
}: {
  params: Promise<{ id: string; registrationId: string }>;
}) {
  const { id: championshipId, registrationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reg } = await supabase
    .from("registrations")
    .select(
      "id, valor, status_pagamento, pix_copy_paste, pix_qr_code_base64, invoice_url, asaas_payment_id, championship_categories(nome)"
    )
    .eq("id", registrationId)
    .single();

  if (!reg) notFound();

  const catRaw = reg.championship_categories;
  const categoria = (Array.isArray(catRaw) ? catRaw[0] : catRaw as { nome: string } | null)?.nome ?? "—";

  if (reg.status_pagamento === "pago") {
    return (
      <div className="mx-auto max-w-lg px-6 py-12 text-center">
        <CheckCircle className="mx-auto size-14 text-emerald-500" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Pagamento confirmado!</h1>
        <p className="mt-1 text-sm text-gray-500">Sua dupla está inscrita na categoria {categoria}.</p>
        <Link
          href={`/campeonatos/${championshipId}`}
          className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Ver campeonato
        </Link>
      </div>
    );
  }

  // Cartão: redireciona pro link do Asaas (débito ou crédito)
  if (!reg.pix_copy_paste && reg.invoice_url) {
    redirect(reg.invoice_url);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pagar inscrição</h1>
        <p className="text-sm text-gray-500">
          Categoria {categoria} · {formatBRL(Number(reg.valor))}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5 space-y-5">
        <p className="text-sm font-semibold text-gray-700 text-center">
          Escaneie o QR code ou use o código Pix
        </p>

        {/* QR Code */}
        {reg.pix_qr_code_base64 ? (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${reg.pix_qr_code_base64}`}
              alt="QR Code Pix"
              className="size-52 rounded-xl"
            />
          </div>
        ) : (
          <div className="flex h-52 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-400">
            QR code indisponível
          </div>
        )}

        {/* Copia e cola */}
        {reg.pix_copy_paste && (
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Pix copia e cola</p>
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <p className="flex-1 truncate font-mono text-xs text-gray-700">
                {reg.pix_copy_paste}
              </p>
              <CopyButton text={reg.pix_copy_paste} />
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Válido por 24 horas · A confirmação é automática após o pagamento
        </p>
      </div>

      <Link
        href={`/campeonatos/${championshipId}`}
        className="block text-center text-sm text-gray-400 hover:text-gray-600"
      >
        Pagar depois
      </Link>
    </div>
  );
}
