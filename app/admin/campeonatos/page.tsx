import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateRangeBR } from "@/lib/format";
import {
  AdminCampeonatosLista,
  type AdminCampItem,
} from "@/components/admin/AdminCampeonatosLista";

export const dynamic = "force-dynamic";

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
};

export default async function AdminCampeonatosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const admin = createAdminClient();

  // Todos os campeonatos (admin client ignora RLS, então vê rascunhos de todos)
  const { data: rawChamps } = await admin
    .from("championships")
    .select("id, nome, status, is_vitrine, organizador_id, cidade, estado, data_inicio, data_fim, created_at")
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

  const itens: AdminCampItem[] = champs.map((c) => {
    const prof = profMap.get(c.organizador_id);
    return {
      id:     c.id,
      nome:   c.nome,
      status: c.status,
      isVitrine: c.is_vitrine ?? false,
      cidade: c.cidade,
      estado: c.estado,
      datas:  formatDateRangeBR(c.data_inicio, c.data_fim),
      org: {
        nome:     prof?.nome ?? "—",
        username: prof?.username ?? null,
        email:    emailMap.get(c.organizador_id) ?? "—",
        fone:     foneMap.get(c.organizador_id) ?? null,
      },
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
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
            contato do organizador. {champs.length} no total.
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
    </div>
  );
}
