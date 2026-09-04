import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Menu,
  Navigation,
  Radio,
  Search,
  Tag,
  Trophy,
  UsersRound,
} from "lucide-react";
import styles from "./teste-home-mobile.module.css";

export const metadata: Metadata = {
  title: "Teste da home mobile",
  robots: { index: false, follow: false },
};

const quickFilters = [
  { label: "Perto de mim", icon: Navigation },
  { label: "Este fim de semana", icon: CalendarDays },
  { label: "Inscrições abertas", success: true },
  { label: "Até R$ 200", icon: Tag },
];

const featured = [
  {
    name: "CBFUT | Circuito Brasileiro — 19ª etapa",
    date: "11–13 set",
    location: "Palmas · TO",
    categories: "Open · Intermediário",
    price: "R$ 250",
    image: "/images/evento-painel.jpg",
    status: "Inscrições abertas",
  },
  {
    name: "BIGWOLF CUP 6",
    date: "13–16 ago",
    location: "Porto Alegre · RS",
    categories: "Iniciante · Open",
    price: "R$ 180",
    image: "/banners/copa-litoral.jpg",
    status: "Últimas vagas",
  },
];

const nearby = [
  { name: "Arena Maresia Open", date: "15–17 ago", distance: "8 km", price: "R$ 160", image: "/images/evento-painel.jpg" },
  { name: "Circuito Verão FTV", date: "16–18 ago", distance: "24 km", price: "R$ 200", image: "/banners/floripa-beach-cup.jpg" },
];

function SearchField({ icon: Icon, title, value, wide = false }: { icon: typeof Navigation; title: string; value: string; wide?: boolean }) {
  return (
    <button type="button" className={`${styles.searchField} ${wide ? styles.searchFieldWide : ""}`}>
      <Icon aria-hidden="true" />
      <span><strong>{title}</strong><small>{value}</small></span>
      <ChevronDown aria-hidden="true" className={styles.fieldChevron} />
    </button>
  );
}

function FeaturedCard({ event }: { event: (typeof featured)[number] }) {
  return (
    <article className={styles.featuredCard}>
      <div className={styles.featuredImage}>
        <Image src={event.image} alt="" fill sizes="300px" className={styles.coverImage} />
        <span className={styles.dateBadge}>{event.date}</span>
        <span className={`${styles.statusBadge} ${event.status === "Últimas vagas" ? styles.statusWarning : ""}`}>{event.status}</span>
      </div>
      <div className={styles.featuredBody}>
        <div className={styles.featuredIdentity}>
          <span className={styles.eventMark}><Trophy aria-hidden="true" /></span>
          <div className={styles.eventDetails}>
            <h3>{event.name}</h3>
            <p><Navigation aria-hidden="true" />{event.location}</p>
            <p><UsersRound aria-hidden="true" />{event.categories}</p>
          </div>
          <p className={styles.price}><small>A partir de</small><strong>{event.price}</strong></p>
        </div>
        <Link href="/" className={styles.categoryLink}>Ver categorias <ChevronRight aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

export default function TesteHomeMobilePage() {
  return (
    <div className={styles.previewViewport}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Link href="/" className={styles.logo} aria-label="RankFTV — página inicial">
            <span className={styles.logoIcon}><Trophy aria-hidden="true" /></span>
            <span>Rank<b>FTV</b></span>
          </Link>
          <div className={styles.headerActions}>
            <div className={styles.headerIcons}>
              <button type="button" aria-label="Pesquisar"><Search /></button>
              <button type="button" aria-label="Abrir menu"><Menu /></button>
            </div>
            <div className={styles.authActions}>
              <Link href="/login">Entrar</Link>
              <Link href="/cadastro">Criar conta</Link>
            </div>
          </div>
        </header>

        <section className={styles.hero}>
          <Image src="/banners/rankftv-atletas-futevolei-v1.png" alt="Atletas disputando uma partida de futevôlei" fill priority sizes="430px" className={styles.heroImage} />
          <div className={styles.heroShade} />
          <div className={styles.heroCopy}>
            <h1>Seu próximo desafio<br />começa na areia</h1>
            <p>Encontre campeonatos e<br />garanta sua vaga.</p>
          </div>
        </section>

        <section className={styles.searchCard} aria-label="Pesquisar campeonatos">
          <div className={styles.searchGrid}>
            <SearchField icon={Navigation} title="Local" value="Cidade ou estado" />
            <SearchField icon={CalendarDays} title="Datas" value="Quando jogar?" />
            <SearchField icon={Tag} title="Preço" value="Todos os preços" wide />
          </div>
          <button type="button" className={styles.searchButton}><Search aria-hidden="true" />Buscar campeonatos</button>
        </section>

        <div className={styles.quickFilters} aria-label="Filtros rápidos">
          {quickFilters.map(({ label, icon: Icon, success }) => (
            <button type="button" key={label}>{Icon ? <Icon aria-hidden="true" /> : <span className={success ? styles.successDot : ""} />}{label}</button>
          ))}
        </div>

        <section className={styles.featuredSection}>
          <div className={styles.sectionHeading}><h2>Campeonatos em destaque</h2><Link href="/">Ver todos <ChevronRight aria-hidden="true" /></Link></div>
          <div className={styles.featuredScroller}>{featured.map((event) => <FeaturedCard key={event.name} event={event} />)}</div>
          <div className={styles.dots} aria-hidden="true"><b /><i /><i /><i /><i /></div>
          <p className={styles.reassurance}>Explore categorias e valores antes de criar sua conta.</p>
        </section>

        <section className={styles.nearbySection}>
          <h2><Navigation aria-hidden="true" />Perto de você</h2>
          <div className={styles.nearbyList}>
            {nearby.map((event) => (
              <Link href="/" key={event.name} className={styles.nearbyItem}>
                <span className={styles.nearbyImage}><Image src={event.image} alt="" fill sizes="64px" className={styles.coverImage} /></span>
                <span className={styles.nearbyText}><strong>{event.name}</strong><small><CalendarDays aria-hidden="true" />{event.date}<span>·</span><Navigation aria-hidden="true" />{event.distance}</small></span>
                <span className={styles.nearbyPrice}><em>Inscrições abertas</em><small>A partir de <b>{event.price}</b></small></span>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.liveSection}>
          <h2><Radio aria-hidden="true" />Ao vivo agora</h2>
          <div className={styles.liveContent}>
            <div className={styles.liveMatch}>
              <small>TAFC 55 · Quartas de final</small>
              <strong><span>João ET / Vinícius</span><b>21</b></strong>
              <strong><span>Gui / Kito</span><b>18</b></strong>
            </div>
            <div className={styles.liveAction}><span>AO VIVO</span><Link href="/">Acompanhar <ChevronRight aria-hidden="true" /></Link></div>
          </div>
        </section>

        <nav className={styles.bottomNav} aria-label="Navegação da prévia">
          <Link href="/teste-home-mobile" aria-current="page"><Navigation /><span>Início</span></Link>
          <Link href="/"><Trophy /><span>Campeonatos</span></Link>
          <Link href="/"><Radio /><span>Ao vivo</span></Link>
          <Link href="/login"><CircleUserRound /><span>Perfil</span></Link>
        </nav>
      </main>
    </div>
  );
}
