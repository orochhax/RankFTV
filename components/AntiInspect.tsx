"use client";

import { useEffect } from "react";

// Dificulta copiar conteúdo e abrir as ferramentas de inspeção:
// bloqueia clique direito, F12 e os atalhos Ctrl+Shift+I/J/C e Ctrl+U/S.
// Não é proteção absoluta (o navegador é do usuário), mas barra o uso casual.
// A seleção de texto é bloqueada via CSS no globals.css.
export function AntiInspect() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      // Permite clique direito dentro de campos de digitação (colar, corrigir)
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, [contenteditable='true']")) return;
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key?.toUpperCase();
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (k === "I" || k === "J" || k === "C")) ||
        (e.metaKey && e.altKey && (k === "I" || k === "J" || k === "C")) || // macOS
        (e.ctrlKey && (k === "U" || k === "S"))
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
