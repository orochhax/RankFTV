import Image from "next/image";
import Link from "next/link";

/** Banner 3D da Home convidando organizadores de campeonatos e donos de arena. */
export function PromoOrganizadoresBanner({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/para-voce"
      aria-label="Organizadores e Arenas: conheça os benefícios do RankFTV para gerenciar campeonatos ou sua arena"
      className={`group block overflow-hidden rounded-2xl border border-blue-500/35 bg-[#0e1322] shadow-lg shadow-black/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/70 hover:shadow-xl hover:shadow-blue-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 active:scale-[0.99] md:rounded-3xl ${className}`}
    >
      <Image
        src="/banners/para-organizadores-arenas.webp"
        alt="Organizadores & Arenas — Leve seu Campeonato e sua Arena pro Próximo Nível. Conhecer benefícios."
        width={1256}
        height={652}
        priority
        sizes="(max-width: 768px) 100vw, 480px"
        className="block h-auto w-full transition-transform duration-300 group-hover:scale-[1.015]"
      />
    </Link>
  );
}
