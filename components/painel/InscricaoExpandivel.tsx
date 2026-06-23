"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Phone, Mail, User } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Atleta = {
  nome:     string;
  username: string;
  telefone: string | null;
  email:    string | null;
};

type InscricaoDetalhe = {
  regId:     string;
  valor:     number;
  categoria: string;
  criadoEm:  string;
  atleta1:   Atleta;
  atleta2:   Atleta | null;
};

export function InscricaoExpandivel({ inscricao }: { inscricao: InscricaoDetalhe }) {
  const [aberto, setAberto] = useState(false);

  const dataInscricao = new Date(inscricao.criadoEm).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div className="bg-white">
      {/* Linha clicável */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900 text-sm">
            {inscricao.atleta1.nome}
            {inscricao.atleta2 && <span className="text-gray-400"> + {inscricao.atleta2.nome}</span>}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {inscricao.categoria} · {dataInscricao} · {formatBRL(inscricao.valor)}
          </p>
        </div>
        <span className="ml-3 shrink-0 text-gray-400">
          {aberto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {/* Detalhes expandidos */}
      {aberto && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
          <AtletaCard label="Atleta 1" atleta={inscricao.atleta1} />
          {inscricao.atleta2 && <AtletaCard label="Atleta 2" atleta={inscricao.atleta2} />}
        </div>
      )}
    </div>
  );
}

function AtletaCard({ label, atleta }: { label: string; atleta: Atleta }) {
  return (
    <div className="rounded-xl bg-white p-3.5 ring-1 ring-black/5 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-gray-100">
          <User className="size-3.5 text-gray-500" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="text-sm font-semibold text-gray-900">{atleta.nome}</p>
          <p className="text-xs text-gray-400">@{atleta.username}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {atleta.telefone ? (
          <a
            href={`https://wa.me/55${atleta.telefone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100 transition-colors ring-1 ring-emerald-200"
          >
            <Phone className="size-3.5 shrink-0" />
            <span className="font-medium">{atleta.telefone}</span>
            <span className="ml-auto text-xs text-emerald-500">WhatsApp</span>
          </a>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 ring-1 ring-black/5">
            <Phone className="size-3.5 shrink-0" />
            Telefone não cadastrado
          </p>
        )}

        {atleta.email ? (
          <a
            href={`mailto:${atleta.email}`}
            className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 transition-colors ring-1 ring-blue-200"
          >
            <Mail className="size-3.5 shrink-0" />
            <span className="font-medium truncate">{atleta.email}</span>
          </a>
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 ring-1 ring-black/5">
            <Mail className="size-3.5 shrink-0" />
            E-mail não disponível
          </p>
        )}
      </div>
    </div>
  );
}
