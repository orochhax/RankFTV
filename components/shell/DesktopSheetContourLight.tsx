"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Contorno animado em luz azul neon para a folha de conteúdo branca no desktop.
 * O trajeto vem da borda direita da tela, percorre o topo horizontal da folha,
 * contorna a curva de 24px no canto superior esquerdo e desce beirando a barra lateral.
 */
export function DesktopSheetContourLight() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    document.body.classList.add("has-dark-header");

    const el = containerRef.current?.parentElement;
    if (!el) {
      return () => {
        document.body.classList.remove("has-dark-header");
      };
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const parentWidth = entry.contentRect.width;
        const parentHeight = Math.max(el.clientHeight, window.innerHeight);
        if (parentWidth > 0) {
          setDims({ width: parentWidth, height: parentHeight });
        }
      }
    });

    ro.observe(el);

    return () => {
      document.body.classList.remove("has-dark-header");
      ro.disconnect();
    };
  }, []);

  if (dims.width <= 48) {
    return (
      <div
        ref={containerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden overflow-visible md:block"
      />
    );
  }

  const pathD = `M ${dims.width} 24 A 24 24 0 0 0 ${dims.width - 24} 0 L 24 0 A 24 24 0 0 0 0 24 L 0 ${dims.height}`;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden overflow-visible md:block"
      style={{ height: dims.height }}
    >
      <svg
        aria-hidden="true"
        className="desktop-sheet-contour pointer-events-none absolute inset-0 overflow-visible"
        style={{ width: dims.width, height: dims.height }}
      >
        <path
          d={pathD}
          pathLength="100"
          className="desktop-sheet-contour-aura"
        />
      </svg>
    </div>
  );
}
