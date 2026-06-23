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
  isVitrine: boolean;
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

type Filtro = "todos" | "inscricoes_abertas" | "em_andamento" | "encerrado" | "informativos";

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "todos",              label: "Todos" },
  { valor: "inscricoes_abertas", label: "Inscrições abertas" },
  { valor: "em_andamento",       label: "Em andamento" },
  { valor: "encerrado",          label: "Encerrado" },
  { valor: "informativos",       label: "Informativos" },
];

// Conta quantos itens batem com cada filtro (mostra o número no chip).
function contar(itens: AdminCampItem[], f: Filtro): number {
  if (f === "todos") return itens.length;
  if (f === "informativos") return itens.filter((c) => c.isVitrine).length;
  return itens.filter((c) => c.status === f).length;
}

export function AdminCampeonatosLista({ itens }: { itens: AdminCampItem[] }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const termo = normalizar(q);

  const filtrados = itens.filter((c) => {
    const passaBusca = termo ? normalizar(c.nome).includes(termo) : true;
    const passaFiltro =
      filtro === "todos"
        ? true
        : filtro === "informativos"
        ? c.isVitrine
        : c.status === filtro;
    return passaBusca && passaFiltro;
  });

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

      {/* Filtros por situação */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(({ valor, label }) => {
          const n = contar(itens, valor);
          const ativo = filtro === valor;
          return (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                ativo
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-black/5 hover:bg-gray-50"
              }`}
            >
              {label}
              <span className={ativo ? "text-blue-100" : "text-gray-400"}>{n}</span>
            </button>
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-400 ring-1 ring-black/5">
          {termo
            ? `Nenhum campeonato encontrado para “${q.trim()}”.`
            : filtro !== "todos"
            ? "Nenhum campeonato nesta situação."
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
                    {c.isVitrine && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        Informativo
                      </span>
                    )}
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
