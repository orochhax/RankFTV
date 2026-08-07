import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { RoleSelector } from "@/components/admin/RoleSelector";

const ROLE_COLORS: Record<string, string> = {
  user:  "bg-gray-100 text-gray-700",
  admin: "bg-blue-100 text-blue-800",
  ceo:   "bg-yellow-100 text-yellow-800",
};
const PAGE_SIZE = 25;

type DirectoryUser = {
  id: string;
  nome: string;
  username: string;
  role: string;
  created_at: string;
  email: string | null;
};

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const requestedPage = Number.parseInt(String(query.page ?? "1"), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await getUserRole(supabase);

  // Só CEO acessa essa página
  if (!user || !isCeo(role)) redirect("/");

  const { data: directoryData } = await supabase.rpc("admin_user_directory", {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const directory = (directoryData ?? {}) as unknown as {
    items?: DirectoryUser[];
    total?: number;
    admins?: number;
    ceos?: number;
  };
  const usuarios = directory.items ?? [];
  const counts = {
    total: Number(directory.total ?? 0),
    admins: Number(directory.admins ?? 0),
    ceos: Number(directory.ceos ?? 0),
  };
  const totalPages = Math.max(1, Math.ceil(counts.total / PAGE_SIZE));
  if (page > totalPages) redirect(`/admin/usuarios?page=${totalPages}`);

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Painel admin
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie os roles da plataforma. Apenas CEO pode alterar.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total de contas", value: counts.total },
          { label: "Admins",          value: counts.admins },
          { label: "CEOs",            value: counts.ceos },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-white p-4 text-center ring-1 ring-black/5">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabela de usuários */}
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">@usuário</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                <td className="px-4 py-3 text-gray-500">@{u.username}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  {u.id === user.id ? (
                    /* CEO não altera o próprio role pela UI */
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${ROLE_COLORS[u.role] ?? ROLE_COLORS.user}`}
                    >
                      {u.role} (você)
                    </span>
                  ) : (
                    <RoleSelector userId={u.id} currentRole={u.role} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {counts.total > 0 && (
        <nav className="flex items-center justify-between border-t border-gray-200 pt-4" aria-label="Paginacao de usuarios">
          <span className="text-sm text-gray-500">Pagina {page} de {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/usuarios?page=${page - 1}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <ChevronLeft className="size-4" /> Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/usuarios?page=${page + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                Proxima <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
