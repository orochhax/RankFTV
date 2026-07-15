"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Classe do botão "original", no fluxo normal da página. */
  className: string;
};

// CTA que fica no fluxo normal da página. Quando sua posição original sai da
// viewport (scroll pra baixo), um clone fixo assume o lugar — nunca os dois
// ao mesmo tempo. Usa IntersectionObserver em vez de listener de scroll
// contínuo. No mobile fica acima da BottomNav + safe-area; no desktop fica
// compacto no canto inferior direito, sem cobrir título/conteúdo.
export function StickyCTA({ href, label, icon: Icon, className }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [showFixed, setShowFixed] = useState(false);

  useEffect(() => {
    const node = anchorRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setShowFixed(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={anchorRef}>
        <Link href={href} className={className}>
          {Icon && <Icon className="size-4" />}
          {label}
        </Link>
      </div>

      {showFixed && (
        <Link
          href={href}
          // Overrides `!` sobre a className original:
          //  - largura: o botão em fluxo é `w-full`; no mobile o clone imita
          //    isso (~100% menos a margem), no desktop vira `w-auto` (pílula).
          //  - `md:!px-6`: a className original só tem padding vertical (ela
          //    conta com `w-full` pra centralizar o texto). Sem isso, o clone
          //    `w-auto` do desktop encosta o texto/ícone nas bordas
          //    arredondadas — foi o que deixou o botão "cortado" na direita.
          className={`fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 z-40 !w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:!w-auto md:!px-6 md:translate-x-0 ${className}`}
        >
          {Icon && <Icon className="size-4" />}
          {label}
        </Link>
      )}
    </>
  );
}
