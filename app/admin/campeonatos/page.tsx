import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateRangeBR } from "@/lib/format";
import { isAdminUser } from "@/lib/supabase/roles";
import {
  AdminCampeonatosLista,
  type AdminCampItem,
} from "@/components/admin/AdminCampeonatosLista";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

type ChampRow = {
  id: string;
  nome: string;
  status: string;
  is_vitrine: boolean | null;
  organizador_id: string;
  cidade: string;
  estado: string;
  data_inicio: string;
  data_fim: string;
  created_at: string;
  organizer_name: string | null;
  organizer_username: string | null;
  organizer_phone: string | null;
  organizer_email: string | null;
};

export default async function AdminCampeonatosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const requestedPage = Number.parseInt(String(query.page ?? "1"), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createClient();
  if (!(await isAdminUser(supabase))) redirect("/");

  // Diretório privilegiado e paginado, incluindo rascunhos.
  const { data: directoryData } = await supabase.rpc("admin_championship_directory", {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const directory = (directoryData ?? {}) as unknown as { items?: ChampRow[]; total?: number };
  const champs = directory.items ?? [];
  const total = Number(directory.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) redirect(`/admin/campeonatos?page=${totalPages}`);

  // Os contatos chegam na mesma consulta para evitar N+1 em auth.users.
  const itens: AdminCampItem[] = champs.map((c) => {
    return {
      id:     c.id,
      nome:   c.nome,
      status: c.status,
      isVitrine: c.is_vitrine ?? false,
      cidade: c.cidade,
      estado: c.estado,
      datas:  formatDateRangeBR(c.data_inicio, c.data_fim),
      org: {
        nome:     c.organizer_name ?? "—",
        username: c.organizer_username,
        email:    c.organizer_email ?? "—",
        fone:     c.organizer_phone,
      },
    };
  });

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Painel admin
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campeonatos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Todos os campeonatos da plataforma. Mude o status, exclua ou veja o
            contato do organizador. {total} no total.
          </p>
        </div>
        <Link
          href="/admin/campeonatos/novo"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" /> Campeonato vitrine
        </Link>
      </div>

      <AdminCampeonatosLista itens={itens} />

      {total > 0 && (
        <nav className="flex items-center justify-between border-t border-gray-200 pt-4" aria-label="Paginacao dos campeonatos do admin">
          <span className="text-sm text-gray-500">Pagina {page} de {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/campeonatos?page=${page - 1}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <ChevronLeft className="size-4" /> Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/campeonatos?page=${page + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                Proxima <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
