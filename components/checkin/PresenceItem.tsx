"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, User } from "lucide-react";

interface Props {
  nome: string;
  username: string;
  checkinAt: string;
  scannerNome: string | null;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PresenceItem({ nome, username, checkinAt, scannerNome }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <li className="bg-emerald-50/50">
      {/* Linha principal — clicável */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-50"
        aria-expanded={open}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-4 text-emerald-600" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{nome}</p>
          {username && <p className="text-xs text-gray-400">@{username}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end gap-0.5">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Presente
            </span>
            <span className="text-xs text-gray-400">{formatDateTime(checkinAt)}</span>
          </div>
          <ChevronDown
            className={`size-4 text-gray-300 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Painel de detalhes */}
      {open && (
        <div className="border-t border-emerald-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User className="size-4 shrink-0 text-gray-300" />
            <span>
              Check-in realizado às{" "}
              <span className="font-medium text-gray-700">{formatDateTime(checkinAt)}</span>
              {scannerNome && (
                <>
                  {" "}por{" "}
                  <span className="font-medium text-gray-700">{scannerNome}</span>
                </>
              )}
            </span>
          </div>
        </div>
      )}
    </li>
  );
}
