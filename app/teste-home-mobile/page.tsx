import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Building2, CalendarDays, ChevronRight, MapPin, Radio, ShoppingBag, Ticket } from "lucide-react";
import { PersonaSwitcher } from "@/components/home/PersonaSwitcher";
import { Avatar } from "@/components/ui/Avatar";
import { DestaquesCarousel } from "@/components/home/DestaquesCarousel";
import { CampeonatosSection } from "@/components/home/CampeonatosSection";
import { HamburgerMenu } from "@/components/home/HamburgerMenu";
import { HomeBannerCarousel } from "@/components/home/HomeBannerCarousel";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { Surface } from "@/components/shell/Surface";
import { parseDiscoveryFilters } from "@/lib/championship-discovery";
import { formatDateRangeBR } from "@/lib/format";
import { normalizeHomeBanners } from "@/lib/home-banners";
import { getLivChampionships, getPublishedChampionships } from "@/lib/supabase/championships";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Teste da home original com cabeçalho",
  robots: { index: false, follow: false },
};

const STATUS_PRIORITY: Record<string, number> = {
  inscricoes_abertas: 0,
  em_andamento: 1,
  rascunho: 2,
  encerrado: 3,
};

export default async function TesteHomeMobilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialFilters = parseDiscoveryFilters(await searchParams);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { nome: string; username: string; foto_url: string | null } | null = null;
  let unreadCount = 0;
  let organizerEnabled = false;

  if (user) {
    const [profileResult, notificationResult, organizerResult] = await Promise.all([
      supabase.from("profiles").select("nome, username, foto_url").eq("id", user.id).maybeSingle(),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("lida", false),
      supabase.from("organizer_accounts").select("habilitado").eq("user_id", user.id).maybeSingle(),
    ]);
    profile = profileResult.data;
    unreadCount = notificationResult.count ?? 0;
    organizerEnabled = !!organizerResult.data?.habilitado;
  }

  const [published, configResult, live] = await Promise.all([
    getPublishedChampionships(),
    supabase.from("platform_config").select("destaques_ids, home_banners").eq("id", 1).single(),
    getLivChampionships(),
  ]);

  const featuredIds = (configResult.data?.destaques_ids as string[] | null) ?? [];
  const homeBanners = normalizeHomeBanners(configResult.data?.home_banners);
  const featured = (featuredIds.length > 0
    ? featuredIds.map((id) => published.find((championship) => championship.id === id)).filter(Boolean) as typeof published
    : published.filter((championship) => championship.status === "inscricoes_abertas" || championship.status === "em_andamento").slice(0, 3)
  ).filter((championship) => championship.status !== "encerrado");

  const ordered = [...published]
    .filter((championship) => championship.status !== "encerrado")
    .sort((left, right) => {
      const priority = (STATUS_PRIORITY[left.status] ?? 9) - (STATUS_PRIORITY[right.status] ?? 9);
      return priority !== 0 ? priority : left.dataInicio.localeCompare(right.dataInicio);
    });
  const states = Array.from(new Set(ordered.map((championship) => championship.estado))).sort();
  const quickLinks = [
    { href: "/agenda", label: "Agenda de eventos", icon: CalendarDays },
    { href: "/arenas", label: "Arenas", icon: Building2 },
    ...(profile
      ? [{ href: "/minhas-compras", label: "Minhas compras", icon: ShoppingBag }]
      : [{ href: "/meus-ingressos", label: "Consultar ingresso", icon: Ticket }]),
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-12 pt-5 md:hidden">
        <div className="mb-3 flex h-11 items-center gap-2">
          <div className="home-header-menu">
            <HamburgerMenu unreadCount={0} organizerHabilitado={organizerEnabled} />
          </div>
          <Link href="/" className="text-2xl font-extrabold tracking-[-0.04em] text-white" aria-label="RankFTV — início">
            Rank<span className="text-blue-600">FTV</span>
          </Link>
          <Link
            href="/notificacoes"
            className="relative ml-auto grid size-11 place-items-center text-white"
            aria-label={unreadCount > 0 ? `${unreadCount} notificações pendentes` : "Notificações"}
          >
            <Bell className="size-6" />
            {unreadCount > 0 ? (
              <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-4 text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </div>

        {profile ? (
          <div className="flex items-center gap-4">
            <Avatar nome={profile.nome} color="bg-blue-500" size="lg" fotoUrl={profile.foto_url} />
            <div className="flex-1">
              <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">Bem-vindo</p>
              <h1 className="text-2xl font-bold tracking-tight text-white">{profile.nome.split(" ")[0]}</h1>
              <p className="text-sm text-gray-400">@{profile.username}</p>
            </div>
          </div>
        ) : (
          <PersonaSwitcher />
        )}
      </div>

      <div className="hidden border-b border-border bg-surface md:block">
        <PageContainer width="wide" className="py-6">
          <PageHeader
            eyebrow={profile ? "Bem-vindo de volta" : undefined}
            title={profile ? profile.nome.split(" ")[0] : "Campeonatos de futevôlei"}
            description={profile ? `@${profile.username}` : "Encontre e participe dos melhores campeonatos do Brasil."}
          />
        </PageContainer>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:pb-16 md:shadow-none">
        <svg
          aria-hidden="true"
          className="home-mobile-sheet-accent md:hidden"
          viewBox="0 0 430 28"
          preserveAspectRatio="none"
        >
          <path d="M0 28 A28 28 0 0 1 28 0 H402 A28 28 0 0 1 430 28" pathLength="100" />
        </svg>
        <PageContainer width="wide">
          <CampeonatosSection
            allCamps={ordered}
            estados={states}
            initialFilters={initialFilters}
            collapsibleSearch
            banner={homeBanners.length > 0 ? <HomeBannerCarousel banners={homeBanners} /> : null}
            featured={<DestaquesCarousel camps={featured} />}
            live={live.length > 0 ? (
              <section>
                <SectionHeader icon={Radio} iconClassName="size-4 animate-pulse text-red-500" title="Ao vivo agora" className="mb-3" />
                <div className="grid gap-3 md:grid-cols-2">
                  {live.map((championship) => (
                    <Link key={championship.id} href={`/campeonatos/${championship.id}`} className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 ring-1 ring-red-100 transition-colors hover:bg-red-50">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span className="size-2 shrink-0 animate-pulse rounded-full bg-red-500" /><p className="truncate font-semibold text-gray-900">{championship.nome}</p></div>
                        <p className="mt-0.5 text-xs text-gray-400">{formatDateRangeBR(championship.dataInicio, championship.dataFim)}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="size-3" />{championship.local}, {championship.cidade} - {championship.estado}</p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-gray-300" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
            sidebar={(
              <Surface padding="md" className="home-quick-access relative sticky top-6 overflow-hidden text-white shadow-soft shadow-black/20">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-transparent" />
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <span aria-hidden="true" className="size-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(77,77,255,0.9)]" />
                  Acesso rápido
                </p>
                <ul className="space-y-1">
                  {quickLinks.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link href={href} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-blue-950/70 hover:text-white">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/20 transition-colors group-hover:bg-blue-600 group-hover:text-white"><Icon className="size-4" /></span>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Surface>
            )}
          />
        </PageContainer>
      </div>
    </div>
  );
}
