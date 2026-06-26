import Link from "next/link";
import { ChevronRight, Radio, MapPin } from "lucide-react";
import { PersonaSwitcher } from "@/components/home/PersonaSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import { DestaquesCarousel } from "@/components/home/DestaquesCarousel";
import { CampeonatosSection } from "@/components/home/CampeonatosSection";
import { HamburgerMenu } from "@/components/home/HamburgerMenu";
import { getLivChampionships, getPublishedChampionships } from "@/lib/supabase/championships";
import { createClient } from "@/lib/supabase/server";
import { formatDateRangeBR } from "@/lib/format";

const STATUS_PRIORIDADE: Record<string, number> = {
  inscricoes_abertas: 0, em_andamento: 1, rascunho: 2, encerrado: 3,
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { nome: string; username: string; foto_url: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nome, username, foto_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  let unreadCount = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("lida", false);
    unreadCount = count ?? 0;
  }

  const [publicados, configRow, aoVivo] = await Promise.all([
    getPublishedChampionships(),
    supabase
      .from("platform_config")
      .select("destaques_ids")
      .eq("id", 1)
      .single(),
    getLivChampionships(),
  ]);

  const destaquesIds: string[] = (configRow.data?.destaques_ids as string[] | null) ?? [];
  const destaques = destaquesIds.length > 0
    ? destaquesIds.map((id) => publicados.find((c) => c.id === id)).filter(Boolean) as typeof publicados
    : publicados.filter((c) => c.status === "inscricoes_abertas" || c.status === "em_andamento").slice(0, 3);

  // Campeonatos ordenados para a seção de listagem
  const todosOrdenados = [...publicados]
    .filter((c) => c.status !== "encerrado")
    .sort((a, b) => {
      const p = (STATUS_PRIORIDADE[a.status] ?? 9) - (STATUS_PRIORIDADE[b.status] ?? 9);
      return p !== 0 ? p : a.dataInicio.localeCompare(b.dataInicio);
    });

  const estados = Array.from(new Set(todosOrdenados.map((c) => c.estado))).sort();
  const categorias = Array.from(
    new Set(todosOrdenados.flatMap((c) => c.categorias.map((cat) => cat.nome)))
  ).sort();

  return (
    <div className="min-h-screen">
      {/* ── Seção escura ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-8">
        <div className="mx-auto max-w-5xl">
          {profile ? (
            <div className="flex items-center gap-4">
              <Avatar
                nome={profile.nome}
                color="bg-blue-500"
                size="lg"
                fotoUrl={profile.foto_url}
              />
              <div className="flex-1">
                <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                  Bem-vindo
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {profile.nome.split(" ")[0]}
                </h1>
                <p className="text-sm text-gray-400">@{profile.username}</p>
              </div>
              <div className="md:hidden">
                <HamburgerMenu unreadCount={unreadCount} />
              </div>
            </div>
          ) : (
            <PersonaSwitcher />
          )}
        </div>
      </div>

      {/* ── Seção branca ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Carrossel de destaques */}
          <DestaquesCarousel camps={destaques} />

          {/* Campeonatos ao vivo */}
          {aoVivo.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Radio className="size-4 text-red-500 animate-pulse" />
                <h2 className="text-base font-semibold text-gray-900">Ao vivo agora</h2>
              </div>
              <div className="space-y-3">
                {aoVivo.map((c) => (
                  <Link
                    key={c.id}
                    href={`/campeonatos/${c.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-red-100 hover:bg-red-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <p className="truncate font-semibold text-gray-900">{c.nome}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDateRangeBR(c.dataInicio, c.dataFim)}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="size-3" />
                        {c.local}, {c.cidade} - {c.estado}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-gray-300" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Lista de campeonatos com filtros */}
          <CampeonatosSection
            allCamps={todosOrdenados}
            estados={estados}
            categorias={categorias}
          />

        </div>
      </div>
    </div>
  );
}
