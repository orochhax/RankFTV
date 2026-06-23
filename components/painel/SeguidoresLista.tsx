"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { PageFollower } from "@/lib/supabase/pages";

// Remove acentos e deixa minúsculo, pra busca ignorar "São" vs "Sao".
function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function SeguidoresLista({ seguidores }: { seguidores: PageFollower[] }) {
  const [q, setQ] = useState("");
  const termo = normalizar(q);

  const filtrados = termo
    ? seguidores.filter(
        (s) =>
          normalizar(s.nome).includes(termo) ||
          (s.username ? normalizar(s.username).includes(termo) : false),
      )
    : seguidores;

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar seguidor pelo nome ou @usuário..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {seguidores.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-5 py-10 text-center ring-1 ring-black/5">
          <Users className="size-6 text-gray-300" />
          <p className="text-sm text-gray-500">Nenhum seguidor ainda.</p>
        </div>
      ) : filtrados.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          Nenhum seguidor encontrado para “{q.trim()}”.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
          {filtrados.map((s) => {
            const conteudo = (
              <div className="flex items-center gap-3 p-3">
                <Avatar nome={s.nome} color={s.avatarColor} fotoUrl={s.fotoUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{s.nome}</p>
                  {s.username && (
                    <p className="truncate text-sm text-gray-400">@{s.username}</p>
                  )}
                </div>
              </div>
            );
            // Só vira link se o seguidor tiver @usuário (perfil público).
            return (
              <li key={s.id}>
                {s.username ? (
                  <Link href={`/atletas/${s.username}`} className="block transition-colors hover:bg-gray-50">
                    {conteudo}
                  </Link>
                ) : (
                  conteudo
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
