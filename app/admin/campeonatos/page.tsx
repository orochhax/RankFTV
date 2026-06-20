import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Phone, MapPin, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateRangeBR } from "@/lib/format";
import { AdminStatusSelect } from "@/components/admin/AdminStatusSelect";
import { AdminDeleteCampeonato } from "@/components/admin/AdminDeleteCampeonato";

export const dynamic = "force-dynamic";

type ChampRow = {
  id: string;
  nome: string;
  status: string;
  organizador_id: string;
  cidade: string;
  estado: string;
  data_inicio: string;
  data_fim: string;
  created_at: string;
};

export default async function AdminCampeonatosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const admin = createAdminClient();

  // Todos os campeonatos (admin client ignora RLS, então vê rascunhos de todos)
  const { data: rawChamps } = await admin
    .from("championships")
    .select("id, nome, status, organizador_id, cidade, estado, data_inicio, data_fim, created_at")
    .order("created_at", { ascending: false });

  const champs: ChampRow[] = (rawChamps ?? []) as ChampRow[];
  const organizadorIds = [...new Set(champs.map((c) => c.organizador_id))];

  // Contatos do organizador: nome/@ (profiles), telefone (organizer_accounts), email (auth)
  const [{ data: profiles }, { data: orgAccounts }, authData] = await Promise.all([
    organizadorIds.length
      ? admin.from("profiles").select("id, nome, username").in("id", organizadorIds)
      : Promise.resolve({ data: [] as { id: string; nome: string; username: string }[] }),
    organizadorIds.length
      ? admin.from("organizer_accounts").select("user_id, telefone").in("user_id", organizadorIds)
      : Promise.resolve({ data: [] as { user_id: string; telefone: string }[] }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profMap  = new Map((profiles ?? []).map((p) => [p.id, p]));
  const foneMap  = new Map((orgAccounts ?? []).map((o) => [o.user_id, o.telefone]));
  const emailMap = new Map(authData.data?.users.map((u) => [u.id, u.email ?? ""]));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Painel admin
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Campeonatos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Todos os campeonatos da plataforma. Mude o status, exclua ou veja o
          contato do organizador. {champs.length} no total.
        </p>
      </div>

      {champs.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhum campeonato criado ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {champs.map((c) => {
            const prof  = profMap.get(c.organizador_id);
            const email = emailMap.get(c.organizador_id) ?? "—";
            const fone  = foneMap.get(c.organizador_id);

            return (
              <li
                key={c.id}
                className="rounded-2xl bg-white p-4 ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/campeonatos/${c.id}`}
                        className="font-semibold text-gray-900 hover:underline"
                      >
                        {c.nome}
                      </Link>
                      <AdminStatusSelect champId={c.id} currentStatus={c.status} />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="size-3.5" />
                      {c.cidade} - {c.estado}
                      <span className="text-gray-300">·</span>
                      {formatDateRangeBR(c.data_inicio, c.data_fim)}
                    </p>
                  </div>
                  <AdminDeleteCampeonato champId={c.id} champNome={c.nome} />
                </div>

                {/* Contato do organizador */}
                <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Organizador
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="size-3.5 text-gray-400" />
                      {prof?.nome ?? "—"}
                      {prof?.username && (
                        <span className="text-gray-400">@{prof.username}</span>
                      )}
                    </span>
                    <a
                      href={`mailto:${email}`}
                      className="flex items-center gap-1.5 hover:text-blue-600"
                    >
                      <Mail className="size-3.5 text-gray-400" />
                      {email}
                    </a>
                    {fone ? (
                      <a
                        href={`tel:${fone.replace(/\D/g, "")}`}
                        className="flex items-center gap-1.5 hover:text-blue-600"
                      >
                        <Phone className="size-3.5 text-gray-400" />
                        {fone}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Phone className="size-3.5" />
                        Sem telefone cadastrado
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
