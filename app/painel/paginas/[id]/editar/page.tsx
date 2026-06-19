import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPageChampionships } from "@/lib/supabase/pages";
import { EditarPaginaForm } from "@/components/painel/EditarPaginaForm";
import { RemoverVinculoPaginaButton } from "@/components/painel/RemoverVinculoPaginaButton";
import { SocialLinksBar, type SocialLink } from "@/components/paginas/SocialLinksBar";
import { ExcluirPaginaButton } from "@/components/painel/ExcluirPaginaButton";

export default async function EditarPaginaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("pages")
    .select("id, owner_id, nome, handle, descricao, social_links")
    .eq("id", id)
    .single();

  if (!page) notFound();
  if (page.owner_id !== user.id) notFound();

  const editions = await getPageChampionships(id);
  const socialLinks: SocialLink[] = (page.social_links as SocialLink[] | null) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-12 pt-6">
        <div className="mx-auto max-w-2xl space-y-3">
          <Link
            href={`/painel/paginas/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {page.nome}
          </Link>
          <h1 className="text-xl font-bold text-white">Editar página</h1>
        </div>
      </div>

      <div className="relative -mt-4 min-h-64 rounded-t-3xl bg-gray-50 px-6 pb-24 pt-8">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Dados da página */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Informações</h2>
            <EditarPaginaForm
              pageId={page.id}
              initialNome={page.nome}
              initialDescricao={page.descricao ?? ""}
            />
          </section>

          {/* Links sociais */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Links sociais</h2>
            <div className="rounded-2xl bg-[#1a1a22] p-4">
              <SocialLinksBar pageId={page.id} initialLinks={socialLinks} isOwner />
            </div>
          </section>

          {/* Campeonatos vinculados */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Campeonatos vinculados</h2>
            {editions.length === 0 ? (
              <div className="rounded-2xl bg-white px-5 py-6 text-center ring-1 ring-black/5">
                <p className="text-sm text-gray-400">Nenhum campeonato vinculado ainda.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {editions.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{e.nome}</p>
                      <p className="text-xs text-gray-400">{e.cidade} · {e.estado}</p>
                    </div>
                    <RemoverVinculoPaginaButton champId={e.id} pageId={id} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Zona de perigo */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400">Zona de perigo</h2>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-red-200">
              <p className="text-sm font-semibold text-gray-900">Excluir página</p>
              <p className="mt-1 text-sm text-gray-500">
                Ação permanente. Todos os seguidores, links e vínculos com campeonatos serão removidos. Não tem volta.
              </p>
              <div className="mt-4">
                <ExcluirPaginaButton pageId={id} nomePagina={page.nome} />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
