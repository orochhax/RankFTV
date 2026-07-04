import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Settings,
  Settings2,
  Tag,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AceitarAlunoButton } from "@/components/arena/AceitarAlunoButton";
import { CopyCodeButton } from "@/components/arena/CopyCodeButton";

type ProfileRow = { nome: string; username: string; foto_url: string | null };
function perfil(raw: unknown): ProfileRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as ProfileRow) ?? null;
  return raw as ProfileRow;
}

type ClassRow = {
  id: string;
  titulo: string;
  horario: string | null;
  dias_semana: number[] | null;
  nivel: string | null;
  max_alunos: number | null;
};

const NIVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
};

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// Agenda em janela fixa: 1 dia que passou (ontem), o dia atual e 3 dias à
// frente. Para cada dia lista as aulas recorrentes daquele dia da semana,
// sem duplicatas (mesmo título + horário) e ordenadas por horário. Dias sem
// nada aparecem mesmo assim, com um aviso de "sem aula ou reserva".
function computeAgenda(classes: ClassRow[]) {
  const result: {
    key: number;
    date: string;
    label: string;
    relLabel: string;
    isToday: boolean;
    isPast: boolean;
    aulas: ClassRow[];
  }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = -1; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();

    const aulas = classes
      .filter((c) => (c.dias_semana ?? []).includes(dow))
      .filter(
        (c, idx, arr) =>
          arr.findIndex(
            (x) => x.titulo === c.titulo && x.horario === c.horario,
          ) === idx,
      )
      .sort((a, b) => (a.horario ?? "").localeCompare(b.horario ?? ""));

    result.push({
      key: i,
      // Data ISO local (YYYY-MM-DD) usada pra casar com as presenças do dia
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      label: `${DIAS_PT[dow]}, ${d.getDate()} ${MESES_PT[d.getMonth()]}`,
      relLabel: i === -1 ? "Ontem" : i === 0 ? "Hoje" : i === 1 ? "Amanhã" : "",
      isToday: i === 0,
      isPast: i < 0,
      aulas,
    });
  }
  return result;
}

export default async function ArenaPainelPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado, invite_code")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();

  if (!arena) redirect("/arena");

  const [alunosRes, aulasRes] = await Promise.all([
    supabase
      .from("arena_students")
      .select("id, status, data_entrada, valor_mensalidade, profiles(nome, username, foto_url)")
      .eq("arena_id", arena.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("arena_classes")
      .select("id, titulo, horario, dias_semana, nivel, max_alunos")
      .eq("arena_id", arena.id)
      .eq("ativo", true)
      .order("horario", { ascending: true }),
  ]);

  const alunos    = alunosRes.data ?? [];
  const ativos    = alunos.filter((a) => a.status === "ativo");
  const pendentes = alunos.filter((a) => a.status === "pendente");
  const classes   = (aulasRes.data ?? []) as ClassRow[];
  const agenda    = computeAgenda(classes);

  // Conta presenças confirmadas por aula e por dia, dentro da janela da agenda,
  // pra montar as "vagas" (ex.: 10/12). Chave: `${class_id}|${data}`.
  const datas = agenda.map((d) => d.date);
  const presencasMap = new Map<string, number>();
  if (datas.length > 0) {
    const { data: presencas } = await supabase
      .from("arena_attendance")
      .select("class_id, data")
      .eq("arena_id", arena.id)
      .gte("data", datas[0])
      .lte("data", datas[datas.length - 1]);
    for (const p of presencas ?? []) {
      const chave = `${p.class_id}|${p.data}`;
      presencasMap.set(chave, (presencasMap.get(chave) ?? 0) + 1);
    }
  }

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-2xl space-y-2">
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Minhas arenas
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
            Painel da arena
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">{arena.nome}</h1>
          <p className="text-sm text-white/50">{arena.cidade}/{arena.estado}</p>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* ── Cards de resumo ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
              <p className="text-xs text-gray-400">Alunos ativos</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{ativos.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
              <p className="text-xs text-gray-400">Pendentes</p>
              <p className={`mt-1 text-2xl font-bold ${pendentes.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
                {pendentes.length}
              </p>
            </div>
          </div>

          {/* ── Botões de ação ── */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/arena/financeiro?handle=${arena.handle}`}
              className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 py-4 text-center ring-1 ring-black/5 transition-colors hover:bg-blue-50 hover:ring-blue-200"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600">
                <DollarSign className="size-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Financeiro</span>
            </Link>
            <Link
              href={`/arena/planos?handle=${arena.handle}`}
              className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 py-4 text-center ring-1 ring-black/5 transition-colors hover:bg-purple-50 hover:ring-purple-200"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-600">
                <Tag className="size-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Planos</span>
            </Link>
            <Link
              href={`/arena/aulas?handle=${arena.handle}`}
              className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 py-4 text-center ring-1 ring-black/5 transition-colors hover:bg-blue-50 hover:ring-blue-200"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600">
                <Settings className="size-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Horários</span>
            </Link>
            <Link
              href={`/arena/configuracoes?handle=${arena.handle}`}
              className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 py-4 text-center ring-1 ring-black/5 transition-colors hover:bg-orange-50 hover:ring-orange-200"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500">
                <Settings2 className="size-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Editar</span>
            </Link>
          </div>

          {/* ── Código de convite ── */}
          <div className="rounded-2xl bg-blue-50 px-5 py-4 ring-1 ring-blue-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Código de convite
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-blue-900">
                {arena.invite_code}
              </span>
              <CopyCodeButton code={arena.invite_code} />
            </div>
            <p className="mt-1 text-xs text-blue-600">
              Alunos acessam <strong>/arenas/{arena.handle}</strong> e usam o código para entrar.
            </p>
          </div>

          {/* ── Pedidos pendentes ── */}
          {pendentes.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Pedidos de entrada ({pendentes.length})
                </h2>
              </div>
              <ul className="space-y-2">
                {pendentes.map((a) => {
                  const p = perfil(a.profiles);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p?.nome ?? "—"}</p>
                        <p className="text-xs text-gray-400">@{p?.username}</p>
                      </div>
                      <AceitarAlunoButton alunoId={a.id} arenaId={arena.id} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ── Alunos ativos ── */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Alunos ativos ({ativos.length})
                </h2>
              </div>
              <Link
                href="/arena/alunos"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {ativos.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
                Nenhum aluno ainda. Compartilhe o código de convite.
              </p>
            ) : (
              <ul className="space-y-2">
                {ativos.slice(0, 5).map((a) => {
                  const p = perfil(a.profiles);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p?.nome ?? "—"}</p>
                          <p className="text-xs text-gray-400">
                            @{p?.username}
                            {a.data_entrada &&
                              ` · desde ${new Date(a.data_entrada + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`}
                          </p>
                        </div>
                      </div>
                      {a.valor_mensalidade && (
                        <span className="text-xs font-medium text-gray-500">
                          R$ {Number(a.valor_mensalidade).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </li>
                  );
                })}
                {ativos.length > 5 && (
                  <Link
                    href="/arena/alunos"
                    className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500 ring-1 ring-black/5 hover:bg-gray-100"
                  >
                    Ver mais {ativos.length - 5} alunos
                    <ChevronRight className="size-4 text-gray-300" />
                  </Link>
                )}
              </ul>
            )}
          </section>

          {/* ── Agenda ── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-700">Agenda</h2>
              </div>
              <Link
                href={`/arena/aulas?handle=${arena.handle}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Settings className="size-3.5" /> Editar
              </Link>
            </div>

            <div className="space-y-2">
              {agenda.map((dia) => (
                <div
                  key={dia.key}
                  className={`flex gap-3 rounded-2xl p-3 ring-1 ${
                    dia.isToday
                      ? "bg-blue-50 ring-blue-200"
                      : dia.isPast
                        ? "bg-gray-50/60 ring-black/5"
                        : "bg-white ring-black/5"
                  }`}
                >
                  {/* Dia à esquerda */}
                  <div className="w-20 shrink-0 pt-0.5">
                    <p
                      className={`text-sm font-semibold ${
                        dia.isToday ? "text-blue-700" : dia.isPast ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      {dia.label}
                    </p>
                    {dia.relLabel && (
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wide ${
                          dia.isToday ? "text-blue-500" : "text-gray-400"
                        }`}
                      >
                        {dia.relLabel}
                      </p>
                    )}
                  </div>

                  {/* Aulas do dia — ou aviso de dia vazio */}
                  <div className="flex flex-1 flex-wrap items-start gap-2">
                    {dia.aulas.length === 0 ? (
                      <span className={`pt-1 text-xs ${dia.isPast ? "text-gray-300" : "text-gray-400"}`}>
                        Sem aula ou reserva neste dia
                      </span>
                    ) : (
                      dia.aulas.map((aula) => {
                        const confirmados = presencasMap.get(`${aula.id}|${dia.date}`) ?? 0;
                        const nivelLabel  = aula.nivel ? NIVEL_LABEL[aula.nivel] ?? aula.nivel : null;
                        const temLimite   = aula.max_alunos != null;
                        const lotada      = temLimite && confirmados >= (aula.max_alunos as number);
                        return (
                          <Link
                            key={aula.id}
                            href={`/arena/aula/${aula.id}?data=${dia.date}`}
                            className={`rounded-xl px-3 py-1.5 ring-1 transition-colors hover:ring-blue-300 ${
                              dia.isToday ? "bg-white ring-blue-100" : "bg-gray-50 ring-black/5"
                            } ${dia.isPast ? "opacity-60" : ""}`}
                          >
                            {/* Linha 1: horário + título */}
                            <div className="flex items-center gap-1.5">
                              {aula.horario && (
                                <span className="flex items-center gap-1 text-xs font-bold text-blue-600">
                                  <Clock className="size-3.5" />
                                  {aula.horario}
                                </span>
                              )}
                              <span className="text-sm font-medium text-gray-700">{aula.titulo}</span>
                            </div>

                            {/* Linha 2: nível + vagas */}
                            {(nivelLabel || temLimite || confirmados > 0) && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                                {nivelLabel && (
                                  <span className="font-semibold text-gray-500">{nivelLabel}</span>
                                )}
                                {nivelLabel && (temLimite || confirmados > 0) && (
                                  <span className="text-gray-300">·</span>
                                )}
                                {temLimite ? (
                                  <span className={`font-semibold ${lotada ? "text-red-500" : "text-gray-500"}`}>
                                    {confirmados}/{aula.max_alunos}
                                    {lotada && " · lotada"}
                                  </span>
                                ) : confirmados > 0 ? (
                                  <span className="text-gray-400">
                                    {confirmados} confirmado{confirmados > 1 ? "s" : ""}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Link vitrine ── */}
          <Link
            href={`/arenas/${arena.handle}`}
            className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 ring-1 ring-black/5 transition-colors hover:bg-gray-100"
          >
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="size-4 text-gray-400" />
              Ver página pública da arena
            </div>
            <ChevronRight className="size-4 text-gray-300" />
          </Link>

        </div>
      </div>
    </div>
  );
}
