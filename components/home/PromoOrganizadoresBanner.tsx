import Image from "next/image";
import Link from "next/link";

const BANNER_ALT =
  "Para organizadores e arenas — Organize. Cobre. Vença. Chaves, quadras, alunos e Pix em um só lugar. Conhecer benefícios.";

/** Banner 3D da Home convidando organizadores de campeonatos e donos de arena. */
export function PromoOrganizadoresBanner({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/para-voce"
      aria-label="Organizadores e Arenas: conheça os benefícios do RankFTV para gerenciar campeonatos ou sua arena"
      className={`group block w-full overflow-hidden rounded-2xl border border-accent/35 bg-[#092b20] shadow-lg shadow-black/35 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/70 hover:shadow-xl hover:shadow-black/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.99] md:rounded-3xl ${className}`}
    >
      <Image
        src="/banners/para-organizadores-arenas-mobile.webp"
        alt={BANNER_ALT}
        width={1200}
        height={800}
        sizes="(max-width: 767px) 96vw, 1px"
        className="block h-auto w-full transition-transform duration-300 group-hover:scale-[1.015] md:hidden"
      />
      <Image
        src="/banners/para-organizadores-arenas-desktop.webp"
        alt={BANNER_ALT}
        width={1600}
        height={460}
        sizes="(min-width: 1280px) 840px, (min-width: 768px) 62vw, 1px"
        className="hidden h-auto w-full transition-transform duration-300 group-hover:scale-[1.015] md:block"
      />
    </Link>
  );
}
