import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Users, Trophy, Tag, CalendarCheck, CalendarDays, CreditCard } from "lucide-react";
import { ArenaPhotoGallery } from "@/components/arena/ArenaPhotoGallery";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EntrarNaArenaButtons } from "@/components/arena/EntrarNaArenaButtons";
import { MeuPlanoCard } from "@/components/arena/MeuPlanoCard";
import { AgendaPresenca, type DiaAgenda } from "@/components/arena/AgendaPresenca";

const DIAS_PT  = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Semana seg–dom que contém a data (mesma regra das actions de presença).
function semanaDe(dataISO: string): { ini: string; fim: string } {
  const d = new Date(dataISO + "T12:00:00");
  const diffSegunda = (d.getDay() + 6) % 7;
  const seg = new Date(d);
  seg.setDate(d.getDate() - diffSegunda);
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  return { ini: isoDate(seg), fim: isoDate(dom) };
}

const AVATAR_COLORS = ["bg-blue-500","bg-blue-500","bg-violet-500","bg-orange-500","bg-rose-500"];
function avatarColor(str: string) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function categoriaLabel(rating: number) {
  if (rating >= 1850) return "A";
  if (rating >= 1550) return "B";
  if (rating >= 1200) return "C";
  return "D";
}

export default async function ArenaPublicaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle, cidade, estado, descricao, avatar_url")
    .eq("handle", handle)
    .maybeSingle();

  if (!arena) notFound();

  // Alunos ativos com perfil para o ranking
  const { data: alunos } = await supabase
    .from("arena_students")
    .select("user_id, profiles(id, nome, username, foto_url, rating)")
    .eq("arena_id", arena.id)
    .eq("status", "ativo");

  type ProfileRow = { id: string; nome: string; username: string; foto_url: string | null; rating: number };
  function getProfile(raw: unknown): ProfileRow | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] as ProfileRow ?? null;
    return raw as ProfileRow;
  }

  const ranking = (alunos ?? [])
    .map((a) => ({ ...getProfile(a.profiles), userId: a.user_id }))
    .filter((a): a is ProfileRow & { userId: string } => !!a.id)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  // Fotos do espaço
  const { data: photos } = await supabase
    .from("arena_photos")
    .select("id, url")
    .eq("arena_id", arena.id)
    .order("ordem", { ascending: true });

  // Planos da arena (públicos)
  const { data: plans } = await supabase
    .from("arena_plans")
    .select("id, tipo, nome, descricao, valor, ativo, aceita_credito, aceita_debito")
    .eq("arena_id", arena.id)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  // Mensalidades sempre ordenadas por preço, do menor pro maior
  const mensalidadePlans = (plans ?? [])
    .filter((p) => p.tipo === "mensalidade")
    .sort((a, b) => Number(a.valor) - Number(b.valor));
  const aluguelPlan      = (plans ?? []).find((p) => p.tipo === "aluguel") ?? null;
  const diariaPlan       = (plans ?? []).find((p) => p.tipo === "diaria") ?? null;

  // Frequência semanal dos planos — query separada e tolerante: se a migração
  // add-arena-presenca-planos.sql ainda não rodou, tudo fica "ilimitado".
  const freqMap = new Map<string, number | null>();
  {
    const { data: freqRows } = await supabase
      .from("arena_plans")
      .select("id, aulas_por_semana")
      .eq("arena_id", arena.id);
    for (const r of freqRows ?? []) freqMap.set(r.id, r.aulas_por_semana);
  }

  // Verifica vínculo do usuário logado (com o plano atual)
  let vinculo: { status: string; plan_id?: string | null } | null = null;
  if (user) {
    const { data: v } = await supabase
      .from("arena_students")
      .select("status, plan_id")
      .eq("arena_id", arena.id)
      .eq("user_id", user.id)
      .maybeSingle();
    vinculo = v;
  }

  const isAluno = vinculo?.status === "ativo";
  const planoAtual = isAluno && vinculo?.plan_id
    ? mensalidadePlans.find((p) => p.id === vinculo!.plan_id) ?? null
    : null;

  // ── Agenda de aulas: hoje + 6 dias, com presenças confirmadas ──────────────
  const { data: classesRaw } = await supabase
    .from("arena_classes")
    .select("id, titulo, horario, dias_semana, nivel, max_alunos")
    .eq("arena_id", arena.id)
    .eq("ativo", true)
    .order("horario", { ascending: true });
  const classes = classesRaw ?? [];

  const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hojeISO = isoDate(agora);

  const datasJanela: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date(agora);
    d.setDate(agora.getDate() + i);
    datasJanela.push(isoDate(d));
  }

  // Presenças da janela via admin: o RLS esconde as linhas dos outros alunos,
  // mas a contagem é pública e os nomes só vão pra quem é aluno da arena.
  const countMap = new Map<string, number>();          // `${classId}|${data}` → confirmados
  const minhasChaves = new Set<string>();              // aulas que EU confirmei
  const nomesMap = new Map<string, { nome: string; fotoUrl: string | null }[]>();
  if (classes.length > 0) {
    const admin = createAdminClient();
    const { data: presencas } = await admin
      .from("arena_attendance")
      .select("class_id, data, user_id")
      .eq("arena_id", arena.id)
      .gte("data", datasJanela[0])
      .lte("data", datasJanela[datasJanela.length - 1]);

    const userIds = [...new Set((presencas ?? []).map((p) => p.user_id))];
    const perfilMap = new Map<string, { nome: string; foto_url: string | null }>();
    if (isAluno && userIds.length > 0) {
      const { data: perfis } = await admin
        .from("profiles")
        .select("id, nome, foto_url")
        .in("id", userIds);
      for (const p of perfis ?? []) perfilMap.set(p.id, { nome: p.nome, foto_url: p.foto_url });
    }

    for (const p of presencas ?? []) {
      const chave = `${p.class_id}|${p.data}`;
      countMap.set(chave, (countMap.get(chave) ?? 0) + 1);
      if (user && p.user_id === user.id) minhasChaves.add(chave);
      if (isAluno) {
        const perfil = perfilMap.get(p.user_id);
        if (perfil) {
          const lista = nomesMap.get(chave) ?? [];
          lista.push({ nome: perfil.nome, fotoUrl: perfil.foto_url });
          nomesMap.set(chave, lista);
        }
      }
    }
  }

  // Uso da semana atual (seg–dom) pro chip "2/3 aulas"
  const { ini: semanaIni, fim: semanaFim } = semanaDe(hojeISO);
  let usadasSemana = 0;
  if (isAluno && user) {
    const { count } = await supabase
      .from("arena_attendance")
      .select("id", { count: "exact", head: true })
      .eq("arena_id", arena.id)
      .eq("user_id", user.id)
      .gte("data", semanaIni)
      .lte("data", semanaFim);
    usadasSemana = count ?? 0;
  }
  const fmtDiaMes = (iso: string) => {
    const [, mm, dd] = iso.split("-");
    return `${dd}/${mm}`;
  };
  const semanaLabel = `${fmtDiaMes(semanaIni)} a ${fmtDiaMes(semanaFim)}`;

  // Antecedência de cancelamento (tolerante à migração pendente)
  let cancelHoras = 2;
  {
    const { data: cfg } = await supabase
      .from("arenas")
      .select("cancel_horas_antes")
      .eq("id", arena.id)
      .maybeSingle();
    if (typeof cfg?.cancel_horas_antes === "number") cancelHoras = cfg.cancel_horas_antes;
  }

  const diasAgenda: DiaAgenda[] = datasJanela.map((date, i) => {
    const d = new Date(date + "T12:00:00");
    const dow = d.getDay();
    const aulasDia = classes
      .filter((c) => (c.dias_semana ?? []).includes(dow))
      .filter(
        (c, idx, arr) =>
          arr.findIndex((x) => x.titulo === c.titulo && x.horario === c.horario) === idx,
      )
      .map((c) => {
        const chave = `${c.id}|${date}`;
        const minha = minhasChaves.has(chave);
        const passou = i === 0 && !!c.horario
          ? agora >= new Date(`${date}T${c.horario}:00`)
          : false;
        const podeDesmarcar = minha && (!c.horario
          ? date >= hojeISO
          : agora <= new Date(new Date(`${date}T${c.horario}:00`).getTime() - cancelHoras * 3600_000));
        return {
          id: c.id,
          titulo: c.titulo,
          horario: c.horario,
          nivel: c.nivel,
          maxAlunos: c.max_alunos,
          confirmados: countMap.get(chave) ?? 0,
          minha,
          passou,
          podeDesmarcar,
          nomes: nomesMap.get(chave) ?? [],
        };
      });
    return {
      date,
      label: `${DIAS_PT[dow]}, ${d.getDate()} ${MESES_PT[d.getMonth()]}`,
      relLabel: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : "",
      isToday: i === 0,
      aulas: aulasDia,
    };
  });

  const planoResumo = (p: { id: string; nome: string; valor: number }) => ({
    id: p.id,
    nome: p.nome,
    valor: Number(p.valor),
    aulasPorSemana: freqMap.get(p.id) ?? null,
  });

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-xl space-y-4">
          <Link
            href="/arenas"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Arenas
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 overflow-hidden">
              {arena.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={arena.avatar_url} alt={arena.nome} className="size-16 object-cover" />
                : <Building2 className="size-8 text-white/60" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white leading-tight">{arena.nome}</h1>
              <p className="flex items-center gap-1 text-sm text-white/50 mt-1">
                <MapPin className="size-3.5 shrink-0" /> {arena.cidade}/{arena.estado}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
                <Users className="size-3" /> {ranking.length} alunos ativos
              </p>
            </div>
          </div>

          {/* Galeria com lightbox */}
          <ArenaPhotoGallery photos={photos ?? []} />
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <span aria-hidden="true" className="mobile-sheet-accent md:hidden" />
        <div className="mx-auto max-w-xl space-y-6">

          {arena.descricao && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {arena.descricao}
            </p>
          )}

          {/* ── Aluguel / Diária / Seu plano — lado a lado quando couber ── */}
          {(aluguelPlan || diariaPlan || planoAtual) && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          {aluguelPlan && (
            <section className="flex flex-col gap-3 self-start rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
              <div className="flex items-center gap-2">
                <CalendarCheck className="size-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-blue-800">Aluguel da quadra</h2>
              </div>
              {aluguelPlan.descricao && (
                <p className="text-xs text-blue-700">{aluguelPlan.descricao}</p>
              )}
              <p className="whitespace-nowrap text-xl font-black text-blue-600">
                {`R$ ${Number(aluguelPlan.valor).toFixed(2).replace(".", ",")}`}
                <span className="ml-1 text-xs font-normal text-blue-500">/hora</span>
              </p>
              <Link
                href={user
                  ? `/arenas/${arena.handle}/alugar?planId=${aluguelPlan.id}`
                  : `/login?next=/arenas/${arena.handle}/alugar`}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <CalendarCheck className="size-4" /> Reservar
              </Link>
            </section>
          )}

          {/* ── Diária de treino ── */}
          {diariaPlan && (
            <section className="flex flex-col gap-3 self-start rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-blue-800">Diária de treino</h2>
              </div>
              {diariaPlan.descricao && (
                <p className="text-xs text-blue-700">{diariaPlan.descricao}</p>
              )}
              <p className="whitespace-nowrap text-xl font-black text-blue-600">
                {`R$ ${Number(diariaPlan.valor).toFixed(2).replace(".", ",")}`}
                <span className="ml-1 text-xs font-normal text-blue-500">/sessão</span>
              </p>
              <Link
                href={user
                  ? `/arenas/${arena.handle}/diaria?planId=${diariaPlan.id}`
                  : `/login?next=/arenas/${arena.handle}/diaria`}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <CalendarDays className="size-4" /> Pagar diária
              </Link>
            </section>
          )}

          {/* ── Seu plano (aluno já assinante) ── */}
          {planoAtual && (
            <MeuPlanoCard
              handle={arena.handle}
              planoAtual={planoResumo(planoAtual)}
              outrosPlanos={mensalidadePlans
                .filter((p) => p.id !== planoAtual.id)
                .map(planoResumo)}
              usadasSemana={usadasSemana}
              semanaLabel={semanaLabel}
            />
          )}

          </div>
          )}

          {/* ── Planos de mensalidade (aluno ainda sem plano) ── */}
          {!planoAtual && mensalidadePlans.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-700">Planos de mensalidade</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {mensalidadePlans.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl bg-gradient-to-br from-blue-50 to-white p-4 ring-1 ring-blue-100"
                  >
                    <p className="font-bold text-gray-900">{p.nome}</p>
                    <p className="text-xs text-gray-500">
                      {freqMap.get(p.id) ? `${freqMap.get(p.id)}x por semana` : "Aulas ilimitadas"}
                    </p>
                    {p.descricao && (
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed">{p.descricao}</p>
                    )}
                    <p className="mt-3 text-2xl font-black text-blue-600">
                      {`R$ ${Number(p.valor).toFixed(2).replace(".", ",")}`}
                      <span className="ml-1 text-xs font-normal text-gray-400">/mês</span>
                    </p>
                    <Link
                      href={user ? `/arenas/${arena.handle}/assinar/${p.id}` : `/login?next=/arenas/${arena.handle}/assinar/${p.id}`}
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      <CreditCard className="size-4" /> Assinar
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Agenda de aulas + presença ── */}
          {classes.length > 0 && (
            <AgendaPresenca
              arenaId={arena.id}
              isAluno={isAluno}
              planoLimite={planoAtual ? (freqMap.get(planoAtual.id) ?? null) : null}
              usadasSemana={usadasSemana}
              dias={diasAgenda}
            />
          )}

          <EntrarNaArenaButtons
            arenaId={arena.id}
            vinculo={vinculo}
            userId={user?.id ?? null}
          />

          {/* Ranking dos alunos — visível para todos, destaca o aluno logado */}
          {ranking.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="size-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-gray-700">Ranking da arena</h2>
              </div>
              <ul className="space-y-2">
                {ranking.map((a, i) => {
                  const isMe = user?.id === a.userId;
                  return (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
                        isMe ? "bg-blue-50 ring-blue-100" : "bg-white ring-black/5"
                      }`}
                    >
                      <span className="w-6 shrink-0 text-center text-sm font-bold text-gray-400">
                        {i + 1 === 1 ? "🥇" : i + 1 === 2 ? "🥈" : i + 1 === 3 ? "🥉" : `${i + 1}º`}
                      </span>
                      <Avatar
                        nome={a.nome}
                        color={avatarColor(a.id)}
                        size="sm"
                        fotoUrl={a.foto_url}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? "text-blue-800" : "text-gray-900"}`}>
                          {a.nome}
                          {isMe && <span className="ml-1.5 text-xs font-normal text-blue-500">(você)</span>}
                        </p>
                        <Link
                          href={`/atletas/${a.username}`}
                          className="text-xs text-gray-400 hover:underline"
                        >
                          @{a.username}
                        </Link>
                      </div>
                      {a.rating > 0 && (
                        <div className="shrink-0 text-right">
                          <span className="text-xs font-bold text-gray-700">
                            {categoriaLabel(a.rating)}
                          </span>
                          <p className="text-[10px] text-gray-400">{a.rating} pts</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
