import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Link2, Unlink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RemoverVinculoButton } from "@/components/painel/RemoverVinculoButton";

export default async function VinculacoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: camp } = await supabase
    .from("championships")
    .select("nome, organizador_id, page_id")
    .eq("id", id)
    .single();

  if (!camp) notFound();
  if (camp.organizador_id !== user.id) notFound();

  // Busca a página vinculada (se existir)
  let linkedPage: { id: string; nome: string; handle: string } | null = null;
  if (camp.page_id) {
    const { data: pg } = await supabase
      .from("pages")
      .select("id, nome, handle")
      .eq("id", camp.page_id)
      .single();
    linkedPage = pg ?? null;
  }

  // Convites pendentes recebidos
  const { data: pendingInvites } = await supabase
    .from("page_championship_invites")
    .select("id, page_id, pages(nome, handle)")
    .eq("championship_id", id)
    .eq("status", "pendente");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-12 pt-6">
        <div className="mx-auto max-w-2xl space-y-3">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <Link2 className="size-5 text-blue-400" /> Vinculações
          </h1>
          <p className="text-sm text-white/50">
            Páginas que exibem este campeonato como etapa.
          </p>
        </div>
      </div>

      <div className="relative -mt-4 min-h-64 rounded-t-3xl bg-gray-50 px-6 pb-24 pt-8">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Vínculo ativo */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vinculado a</h2>
            {linkedPage ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{linkedPage.nome}</p>
                  <p className="text-sm text-gray-400">@{linkedPage.handle}</p>
                </div>
                <RemoverVinculoButton champId={id} label="Remover" />
              </div>
            ) : (
              <div className="rounded-2xl bg-white px-5 py-6 text-center ring-1 ring-black/5">
                <Unlink className="mx-auto mb-2 size-8 text-gray-200" />
                <p className="text-sm text-gray-400">Este campeonato não está vinculado a nenhuma página.</p>
              </div>
            )}
          </section>

          {/* Convites pendentes */}
          {(pendingInvites ?? []).length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Convites pendentes</h2>
              {(pendingInvites ?? []).map((inv) => {
                const pg = inv.pages as unknown as { nome: string; handle: string } | null;
                return (
                  <div key={inv.id} className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200">
                    <p className="font-semibold text-gray-900">{pg?.nome ?? "—"}</p>
                    <p className="text-sm text-gray-500">@{pg?.handle}</p>
                    <p className="mt-1 text-xs text-blue-600">Aguardando sua resposta no painel do campeonato</p>
                    <Link
                      href={`/painel/campeonatos/${id}`}
                      className="mt-2 inline-flex text-xs font-medium text-blue-700 hover:text-blue-900"
                    >
                      Responder →
                    </Link>
                  </div>
                );
              })}
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
