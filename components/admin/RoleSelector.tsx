"use client";

import { useState, useTransition } from "react";
import { updateUserRole } from "@/app/admin/usuarios/actions";

const ROLE_LABELS: Record<string, string> = {
  user: "Usuário",
  admin: "Admin",
  ceo: "CEO",
};

const ROLE_COLORS: Record<string, string> = {
  user: "bg-gray-100 text-gray-700",
  admin: "bg-blue-100 text-blue-800",
  ceo: "bg-yellow-100 text-yellow-800",
};

export function RoleSelector({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const [role, setRole] = useState(currentRole);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(newRole: string) {
    if (newRole === role) { setOpen(false); return; }
    if (!confirm(`Alterar role para "${ROLE_LABELS[newRole]}"?`)) return;
    setOpen(false);
    startTransition(async () => {
      await updateUserRole(userId, newRole);
      setRole(newRole);
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-opacity disabled:opacity-50 ${ROLE_COLORS[role] ?? ROLE_COLORS.user}`}
      >
        {isPending ? "..." : ROLE_LABELS[role] ?? role}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/10">
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSelect(value)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${value === role ? "font-semibold text-gray-900" : "text-gray-600"}`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  value === "ceo" ? "bg-yellow-400" : value === "admin" ? "bg-blue-400" : "bg-gray-300"
                }`}
              />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
