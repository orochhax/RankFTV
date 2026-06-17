import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHistorico } from "@/lib/supabase/desempenho";
import { EvolucaoSparkline } from "@/components/perfil/EvolucaoSparkline";
import { nivelLabel, nivelMaisAlto, nivelOrdem } from "@/lib/niveis";

const COLOCACAO_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function dataBR(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Histórico completo de campeonatos (acessado pelo card "Evolução" da Home):
// data, dupla, categoria/nível e colocação final de cada um.
export default async function EvolucaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .single();

  const primeiroNome = profile?.nome?.split(" ")[0] ?? "Você";

  // Mais antigo -> mais novo (o gráfico lê nessa ordem).
  const historico = await getHistorico(user.id);

  const evolucao = historico
    .map((h) => nivelOrdem(h.categoria))
    .filter((o): o is number => o != null);

  const nivelAtual =
    nivelMaisAlto(
      historico.filter((h) => h.colocacao <= 3).map((h) => h.categoria)
    )?.label ?? null;

  // Lista exibida do mais novo pro mais antigo.
  const lista = [...historico].reverse();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Evolução</h1>
        <p className="mt-1 text-sm text-gray-500">
          {historico.length > 0
            ? `${historico.length} campeonatos · nível atual: ${nivelAtual ?? "—"}`
            : "Seu histórico aparece aqui conforme você joga campeonatos."}
        </p>
      </div>

      {/* Gráfico */}
      {evolucao.length > 0 && (
        <div className="rounded-2xl bg-[#0f0f13] p-5 text-white">
          <p className="mb-2 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
            Nível ao longo do tempo
          </p>
          <EvolucaoSparkline valores={evolucao} className="h-28 w-full" />
        </div>
      )}

      {/* Lista de campeonatos */}
      {lista.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhum campeonato no histórico ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {lista.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"
            >
              <span className="text-2xl leading-none">
                {COLOCACAO_EMOJI[h.colocacao] ?? `${h.colocacao}º`}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">
                  {h.nome_circuito}
                </p>
                <p className="text-xs text-gray-500">
                  {dataBR(h.data)} · Dupla: {primeiroNome}
                  {h.parceiro_nome ? ` & ${h.parceiro_nome}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {nivelLabel(h.categoria) ?? "—"}
                </span>
                <p className="mt-1 text-xs text-gray-400">{h.pontos} pts</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
