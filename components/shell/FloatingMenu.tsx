"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Placement = "right-start" | "bottom-end";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Elemento (geralmente o botão) a partir do qual a posição é calculada. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** "right-start": à direita do anchor, topo alinhado (padrão — menu "+").
   *  "bottom-end": abaixo do anchor, alinhado pela borda direita, crescendo pra cima se faltar espaço. */
  placement?: Placement;
  gap?: number;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">;

// Popover renderizado num portal em document.body — escapa de qualquer
// stacking context criado por ancestrais (sidebar sticky+z-index, headers
// sticky de página, transforms/filters/opacity). A posição é calculada a
// partir do retângulo real do elemento-âncora e recalculada em resize/scroll
// porque o portal usa `position: fixed` (coordenadas de viewport).
export function FloatingMenu({
  open,
  onClose,
  anchorRef,
  placement = "right-start",
  gap = 12,
  className = "",
  children,
  ...rest
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const panelHeight = panel?.offsetHeight ?? 0;
      const panelWidth = panel?.offsetWidth ?? 0;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      let top: number;
      let left: number;
      if (placement === "bottom-end") {
        left = rect.right - panelWidth;
        top = rect.bottom + gap;
        // Sem espaço embaixo — abre pra cima do anchor.
        if (top + panelHeight > vh - 8) top = rect.top - panelHeight - gap;
      } else {
        left = rect.right + gap;
        top = rect.top;
      }

      top = Math.max(8, Math.min(top, vh - panelHeight - 8));
      left = Math.max(8, Math.min(left, vw - panelWidth - 8));
      setPos({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef, placement, gap]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, onClose, anchorRef]);

  // `open` só fica true a partir de uma interação no client (nunca no SSR
  // inicial), então checar `document` direto aqui não causa mismatch de
  // hidratação — evita precisar de um estado "mounted" só pra isso.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      className={`z-[100] ${className}`}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
}
