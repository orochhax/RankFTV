import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, Flame, TrendingDown, TrendingUp, Minus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetasDoDia } from "@/components/performance/MetasDoDia";
import { PerfilEditor } from "@/components/performance/PerfilEditor";
import { RelatorioSemanal, type WeeklyReport } from "@/components/performance/RelatorioSemanal";
import { PesoCorpo } from "@/components/performance/PesoCorpo";
import {
  type Habit, type HabitLog,
  hojeISO, indexLogs, heatmap, streak, veredito, habitStats, insights,
  pct, imc, imcFaixa, idadeDe, addDays, segundaDaSemana,
} from "@/lib/performance";

export const metadata = { title: "Performance — Admin" };

function corHeat(score: number, temReg: boolean): string {
  if (!temReg) return "bg-gray-100";
  if (score >= 0.85) return "bg-emerald-500";
  if (score >= 0.5)  return "bg-amber-400";
  return "bg-red-400";
}

function corDot(media: number): string {
  if (media >= 0.85) return "bg-emerald-500";
  if (media >= 0.65) return "bg-amber-400";
  return "bg-red-500";
}

export default async function PerformancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  const hoje = hojeISO();
  const desde = addDays(hoje, -34);

  const segunda = segundaDaSemana(hoje);

  const [perfRes, profRes, habitsRes, logsRes, pesoRes, reportAtualRes, historicoRes] = await Promise.all([
    supabase.from("perf_profile").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("nome, username, foto_url").eq("id", user.id).maybeSingle(),
    supabase.from("perf_habit").select("*").eq("user_id", user.id).eq("ativo", true).order("ordem"),
    supabase.from("perf_habit_log").select("habit_id, data, valor").eq("user_id", user.id).gte("data", desde),
    supabase.from("perf_weight").select("peso_kg, data").eq("user_id", user.id).order("data", { ascending: true }).limit(365),
    supabase.from("perf_weekly_report").select("*").eq("user_id", user.id).eq("semana_inicio", segunda).maybeSingle(),
    supabase.from("perf_weekly_report").select("*").eq("user_id", user.id).eq("fechado", true).order("semana_inicio", { ascending: false }).limit(8),
  ]);

  // Fecha relatórios de semanas passadas que ainda estão abertos (idempotente).
  await supabase
    .from("perf_weekly_report")
    .update({ fechado: true })
    .eq("user_id", user.id)
    .eq("fechado", false)
    .lt("semana_inicio", segunda);

  const perfil = perfRes.data;
  const prof   = profRes.data;
  const habits: Habit[] = (habitsRes.data ?? []).map((h) => ({
    id: h.id, label: h.label, tipo: h.tipo, alvo: h.alvo == null ? null : Number(h.alvo),
    unidade: h.unidade, ordem: h.ordem, ativo: h.ativo,
  }));
  const logs: HabitLog[] = (logsRes.data ?? []).map((l) => ({
    habit_id: l.habit_id, data: l.data, valor: Number(l.valor),
  }));

  const idx = indexLogs(logs);
  const valoresHoje = idx[hoje] ?? {};
  const heat = heatmap(habits, idx, hoje, 30);
  const str  = streak(habits, idx, hoje);
  const ver  = veredito(habits, idx, hoje);
  const stats = habitStats(habits, idx, hoje);
  const ins  = insights(habits, idx, hoje);

  const relatorioAtual = reportAtualRes.data as WeeklyReport | null;
  const historico = (historicoRes.data ?? []) as WeeklyReport[];
  const pesoHistorico = (pesoRes.data ?? []).map((p) => ({
    data: p.data as string,
    peso_kg: Number(p.peso_kg),
  }));

  // Stats da semana atual (segunda → hoje) para o relatório.
  let diasRegistrados = 0;
  let cur = segunda;
  while (cur <= hoje) {
    if (idx[cur] && Object.keys(idx[cur]).length > 0) diasRegistrados++;
    cur = addDays(cur, 1);
  }
  const statsSorted = [...stats].sort((a, b) => b.semanaAtual - a.semanaAtual);
  const melhorHabito = statsSorted.length && statsSorted[0].semanaAtual > 0 ? statsSorted[0].habit.label : null;
  const habitoFraco =
    statsSorted.length > 1 && statsSorted[statsSorted.length - 1].semanaAtual < statsSorted[0].semanaAtual
      ? statsSorted[statsSorted.length - 1].habit.label
      : null;

  const alturaCm = perfil?.altura_cm ?? null;
  const pesoAtual = pesoHistorico.length ? pesoHistorico[pesoHistorico.length - 1].peso_kg : null;
  const temImc = alturaCm && pesoAtual;
  const imcVal = temImc ? imc(pesoAtual!, alturaCm!) : null;
  const imcF = imcVal != null ? imcFaixa(imcVal) : null;
  const idade = perfil?.data_nascimento ? idadeDe(perfil.data_nascimento, hoje) : null;

  const nome = prof?.nome ?? "Você";
  const iniciais = nome.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  // Veredito → rótulo/cor/ícone
  const verMap = {
    evoluindo:  { label: "Evoluindo", cls: "text-emerald-300", Icon: TrendingUp },
    regredindo: { label: "Regredindo", cls: "text-red-300", Icon: TrendingDown },
    estavel:    { label: "Estável", cls: "text-white/70", Icon: Minus },
    comecando:  { label: "Começando", cls: "text-blue-300", Icon: Sparkles },
  }[ver.status];

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="size-4" /> Admin
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-white">Performance</h1>

          {/* Você */}
          <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {prof?.foto_url ? (
                  <Image src={prof.foto_url} alt={nome} width={48} height={48} className="size-12 rounded-full object-cover" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">{iniciais}</div>
                )}
                <div>
                  <p className="font-semibold text-white">{nome}</p>
                  {prof?.username && <p className="text-sm text-white/40">@{prof.username}</p>}
                </div>
              </div>
              <PerfilEditor
                alturaCm={alturaCm}
                dataNascimento={perfil?.data_nascimento ?? null}
                lado={perfil?.lado ?? null}
                peDominante={perfil?.pe_dominante ?? null}
                pesoAtual={pesoAtual}
                pesoMeta={perfil?.peso_meta ?? null}
                ratingMeta={perfil?.rating_meta ?? null}
                treinosSemanaMeta={perfil?.treinos_semana_meta ?? null}
              />
            </div>

            {/* Chips de dados */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
              <Chip label="Altura" value={alturaCm ? `${alturaCm} cm` : "—"} />
              <Chip label="Peso" value={pesoAtual ? `${pesoAtual} kg` : "—"} />
              <Chip label="IMC" value={imcVal != null ? imcVal.toFixed(1) : "—"} sub={imcF?.label} />
              <Chip label="Idade" value={idade != null ? `${idade}` : "—"} />
              <Chip label="Lado" value={perfil?.lado ? cap(perfil.lado) : "—"} />
              <Chip label="Pé" value={perfil?.pe_dominante ? cap(perfil.pe_dominante) : "—"} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">

          <MetasDoDia habits={habits} valoresIniciais={valoresHoje} hoje={hoje} />

          {/* Constância */}
          {habits.length > 0 && (
            <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Constância</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  ver.status === "regredindo" ? "bg-red-50 text-red-600"
                  : ver.status === "evoluindo" ? "bg-emerald-50 text-emerald-600"
                  : "bg-gray-100 text-gray-500"
                }`}>
                  {ver.status === "regredindo" ? <TrendingDown className="size-3.5" />
                    : ver.status === "evoluindo" ? <TrendingUp className="size-3.5" />
                    : <Minus className="size-3.5" />}
                  {ver.status === "regredindo" ? "Caindo" : ver.status === "evoluindo" ? "No foco" : "Estável"}
                </span>
              </div>

              {/* Mapa de calor (30 dias) */}
              <div className="mt-4 flex flex-wrap gap-1">
                {heat.map((d) => (
                  <div
                    key={d.data}
                    title={`${d.data} · ${d.temRegistro ? pct(d.score) + "%" : "sem registro"}`}
                    className={`size-5 rounded ${corHeat(d.score, d.temRegistro)}`}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
                  <Flame className="size-4 text-orange-500" /> {str} {str === 1 ? "dia" : "dias"} de sequência
                </span>
                <span className="text-gray-400">
                  Semana: {pct(ver.semanaAtual)}%
                  {ver.status !== "comecando" && <> (antes {pct(ver.semanaAnterior)}%)</>}
                </span>
              </div>
            </section>
          )}

          <RelatorioSemanal
            relatorioAtual={relatorioAtual}
            historico={historico}
            semanaAtual={segunda}
            stats={{
              aderenciaSemana: ver.semanaAtual,
              diasRegistrados,
              melhorHabito,
              habitoFraco,
            }}
          />

          {/* Evolução inteligente */}
          {habits.length > 0 && (
            <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <h2 className="font-semibold text-gray-900">Evolução</h2>

              {ver.status === "comecando" ? (
                <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
                  Registre alguns dias que eu começo a te mostrar se está evoluindo ou caindo.
                </p>
              ) : (
                <>
                  {/* Veredito */}
                  <div className={`mt-3 flex items-center gap-2 rounded-xl bg-[#0f0f13] p-4 ${verMap.cls}`}>
                    <verMap.Icon className="size-5" />
                    <p className="text-sm">
                      <span className="font-bold">{verMap.label}</span>{" "}
                      <span className="text-white/50">
                        — aderência {pct(ver.semanaAtual)}% essa semana vs {pct(ver.semanaAnterior)}% na passada
                      </span>
                    </p>
                  </div>

                  {/* Hábito por hábito */}
                  <ul className="mt-4 space-y-2.5">
                    {[...stats].sort((a, b) => b.mediaMes - a.mediaMes).map((s) => (
                      <li key={s.habit.id} className="flex items-center gap-3">
                        <span className={`size-2.5 shrink-0 rounded-full ${corDot(s.mediaMes)}`} />
                        <span className="flex-1 text-sm text-gray-700">{s.habit.label}</span>
                        <span className="text-sm font-semibold text-gray-900">{pct(s.mediaMes)}%</span>
                        <span className="w-4 text-center">
                          {s.tendencia === "subindo" ? <TrendingUp className="size-4 text-emerald-500" />
                            : s.tendencia === "caindo" ? <TrendingDown className="size-4 text-red-500" />
                            : <Minus className="size-4 text-gray-300" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Avisos espertos */}
              {ins.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                  {ins.map((frase, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      {frase}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <PesoCorpo
            pesos={pesoHistorico}
            pesoMeta={perfil?.peso_meta != null ? Number(perfil.peso_meta) : null}
            hoje={hoje}
          />

        </div>
      </div>
    </div>
  );
}

function Chip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-2 py-2 ring-1 ring-white/10">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
      {sub && <p className="text-[10px] text-white/40">{sub}</p>}
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
