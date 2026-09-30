"use client";

import { useState, type ReactNode } from "react";
import { Ticket, Users } from "lucide-react";
import type { ComprasTab } from "@/lib/minhas-compras";

export function MinhasComprasTabs({
  initialTab,
  atletaCount,
  plateiaCount,
  atletaContent,
  plateiaContent,
}: {
  initialTab: ComprasTab;
  atletaCount: number;
  plateiaCount: number;
  atletaContent: ReactNode;
  plateiaContent: ReactNode;
}) {
  const [tab, setTab] = useState<ComprasTab>(initialTab);

  const tabs = [
    { key: "atleta" as const, label: "Atleta", count: atletaCount, icon: Users },
    { key: "plateia" as const, label: "Plateia", count: plateiaCount, icon: Ticket },
  ];

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Tipos de compra"
        className="grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1"
      >
        {tabs.map(({ key, label, count, icon: Icon }) => {
          const selected = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`compras-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                selected
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="size-4" />
              {label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  selected ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`compras-${tab}`}
        role="tabpanel"
        aria-label={tab === "atleta" ? "Compras de atleta" : "Compras de plateia"}
      >
        {tab === "atleta" ? atletaContent : plateiaContent}
      </div>
    </div>
  );
}
