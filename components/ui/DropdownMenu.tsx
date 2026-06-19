"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Item = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  danger?: boolean;
};

export function DropdownMenu({
  trigger,
  items,
}: {
  trigger: React.ReactNode;
  items: Item[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/10">
          {items.map((item) => {
            const Icon = item.icon;
            const cls = `flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
              item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-gray-700 hover:bg-gray-50"
            }`;
            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className={cls} onClick={() => setOpen(false)}>
                  {Icon && <Icon className="size-4 shrink-0" />}
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                className={cls}
                onClick={() => { setOpen(false); item.onClick?.(); }}
              >
                {Icon && <Icon className="size-4 shrink-0" />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
