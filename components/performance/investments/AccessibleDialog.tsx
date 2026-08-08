"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/performance/investments/ui";

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function AccessibleDialog({ title, description, open, onClose, children, wide = false }: { title: string; description?: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const initial = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>("input, select, textarea, button");
    window.requestAnimationFrame(() => initial?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      const openDialogs = [...document.querySelectorAll<HTMLElement>("[role='dialog'][aria-modal='true'], [role='alertdialog'][aria-modal='true']")];
      if (openDialogs.at(-1) !== panel) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={`max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#15191f] text-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
      <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-white/10 bg-[#15191f]/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm leading-5 text-white/60">{description}</p>}
        </div>
        <IconButton label="Fechar" onClick={onClose} className="-mr-2 -mt-2"><X className="size-5" aria-hidden="true" /></IconButton>
      </header>
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">{children}</div>
    </div>
  </div>;
}
