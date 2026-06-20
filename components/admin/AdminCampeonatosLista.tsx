"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Mail, Phone, MapPin, User as UserIcon } from "lucide-react";
import { AdminStatusSelect } from "@/components/admin/AdminStatusSelect";
import { AdminDeleteCampeonato } from "@/components/admin/AdminDeleteCampeonato";

export type AdminCampItem = {
  id: string;
  nome: string;
  status: string;
  cidade: string;
  estado: string;
  datas: string;
  org: { nome: string; username: string | null; email: string; fone: string | null };
};

// Remove acentos e deixa minúsculo, pra busca ignorar "São" vs "Sao"
function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function AdminCampeonatosLista({ itens }: { itens: AdminCampItem[] }) {
  const [q, setQ] = useState("");
  const termo = normalizar(q);

  const filtrados = termo
    ? itens.filter((c) => normalizar(c.nome).includes(termo))
    : itens;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar campeonato pelo nome..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          {termo
            ? `Nenhum campeonato encontrado para “${q.trim()}”.`
            : "Nenhum campeonato criado ainda."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((c) => (
            <li key={c.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/campeonatos/${c.id}`}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {c.nome}
                    </Link>
                    <AdminStatusSelect champId={c.id} currentStatus={c.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="size-3.5" />
                    {c.cidade} - {c.estado}
                    <span className="text-gray-300">·</span>
                    {c.datas}
                  </p>
                </div>
                <AdminDeleteCampeonato champId={c.id} champNome={c.nome} />
              </div>

              {/* Contato do organizador */}
              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Organizador
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="size-3.5 text-gray-400" />
                    {c.org.username ? (
                      <Link
                        href={`/atletas/${c.org.username}`}
                        className="font-medium text-gray-700 hover:text-blue-600 hover:underline"
                      >
                        @{c.org.username}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-700">{c.org.nome}</span>
                    )}
                    {c.org.username && c.org.nome !== "—" && (
                      <span className="text-gray-400">({c.org.nome})</span>
                    )}
                  </span>
                  <a
                    href={`mailto:${c.org.email}`}
                    className="flex items-center gap-1.5 hover:text-blue-600"
                  >
                    <Mail className="size-3.5 text-gray-400" />
                    {c.org.email}
                  </a>
                  {c.org.fone ? (
                    <a
                      href={`tel:${c.org.fone.replace(/\D/g, "")}`}
                      className="flex items-center gap-1.5 hover:text-blue-600"
                    >
                      <Phone className="size-3.5 text-gray-400" />
                      {c.org.fone}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Phone className="size-3.5" />
                      Sem telefone cadastrado
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
