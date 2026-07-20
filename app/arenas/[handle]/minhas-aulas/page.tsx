import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MinhasAulasClient, type MinhaAula } from "@/components/arena/MinhasAulasClient";
import { hhmm } from "@/lib/arena-dates";

type ClasseRel = { titulo: string; hora_inicio: string | null; hora_fim: string | null; publico: string | null; professor_id: string | null };
function classeDe(raw: unknown): ClasseRel | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] as ClasseRel) ?? null : (raw as ClasseRel);
}

export default async function MinhasAulasPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arenas/${handle}/minhas-aulas`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .maybeSingle();
  if (!arena) notFound();

  // Confirma associação/autorização no servidor: só aluno ativo desta arena
  // acessa o próprio relatório — nunca dados de outro aluno.
  const { data: vinculo } = await supabase
    .from("arena_students")
    .select("id")
    .eq("arena_id", arena.id)
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();
  if (!vinculo) redirect(`/arenas/${handle}`);

  const { data: presencas } = await supabase
    .from("arena_attendance")
    .select("id, data, status, tipo_cobranca, valor_avulso, pagamento_status, pagamento_erro, class_id, arena_classes(titulo, hora_inicio, hora_fim, publico, professor_id)")
    .eq("arena_id", arena.id)
    .eq("user_id", user.id)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  const professorIds = [...new Set(
    (presencas ?? []).map((p) => classeDe(p.arena_classes)?.professor_id).filter((id): id is string => !!id),
  )];
  const admin = createAdminClient();
  const { data: professores } = professorIds.length > 0
    ? await admin.from("profiles").select("id, nome").in("id", professorIds)
    : { data: [] as { id: string; nome: string }[] };
  const professorMap = new Map((professores ?? []).map((p) => [p.id, p.nome]));

  const aulas: MinhaAula[] = (presencas ?? []).map((p) => {
    const classe = classeDe(p.arena_classes);
    return {
      id: p.id,
      data: p.data,
      titulo: classe?.titulo ?? "Aula",
      horaInicio: hhmm(classe?.hora_inicio ?? null),
      horaFim: hhmm(classe?.hora_fim ?? null),
      publico: (classe?.publico ?? "misto") as MinhaAula["publico"],
      professorNome: classe?.professor_id ? (professorMap.get(classe.professor_id) ?? null) : null,
      status: p.status as MinhaAula["status"],
      tipoCobranca: p.tipo_cobranca as MinhaAula["tipoCobranca"],
      valorAvulso: p.valor_avulso != null ? Number(p.valor_avulso) : null,
      pagamentoStatus: p.pagamento_status as MinhaAula["pagamentoStatus"],
      pagamentoErro: p.pagamento_erro,
    };
  });

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href={`/arenas/${arena.handle}`} className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> {arena.nome}
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-6 text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Minhas aulas</h1>
          </div>
          <p className="text-sm text-white/40">Data, horário, professor, público e status de cada presença.</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <MinhasAulasClient aulas={aulas} />
        </div>
      </div>
    </div>
  );
}
