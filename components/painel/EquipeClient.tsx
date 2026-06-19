"use client";

import { useState, useTransition } from "react";
import { Search, Trash2, QrCode, Users, CheckSquare, Loader2, UserCheck } from "lucide-react";
import {
  searchUserByUsername,
  convidarStaff,
  updatePermissions,
  removerStaff,
} from "@/app/painel/campeonatos/[id]/equipe/actions";

export type StaffMember = {
  id: string;
  userId: string;
  nome: string;
  username: string;
  status: "pendente" | "aceito" | "recusado";
  canQrcode: boolean;
  canInscricoes: boolean;
  canChaveamento: boolean;
};

type SearchResult = { id: string; nome: string; username: string } | "not_found" | null;

/* ─── toggle de permissão individual ─── */

function PermissionToggle({
  label,
  icon: Icon,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-2 transition-colors ${
      checked ? "bg-blue-50" : "bg-gray-50"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}`}>
      <Icon className={`size-4 ${checked ? "text-blue-600" : "text-gray-400"}`} />
      <span className={`text-[10px] font-medium ${checked ? "text-blue-700" : "text-gray-500"}`}>
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}

/* ─── linha de membro ─── */

function MemberRow({ member, champId }: { member: StaffMember; champId: string }) {
  const [qr, setQr]     = useState(member.canQrcode);
  const [ins, setIns]   = useState(member.canInscricoes);
  const [chav, setChav] = useState(member.canChaveamento);
  const [isPending, startTransition] = useTransition();

  function handleToggle(newQr: boolean, newIns: boolean, newChav: boolean) {
    setQr(newQr); setIns(newIns); setChav(newChav);
    startTransition(async () => {
      await updatePermissions(member.id, newQr, newIns, newChav, champId);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removerStaff(member.id, champId);
    });
  }

  return (
    <li className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
      {/* avatar inicial */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
        {member.nome.charAt(0).toUpperCase()}
      </div>

      {/* nome + status */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{member.nome}</p>
        <p className="text-xs text-gray-400">@{member.username}</p>
      </div>

      {/* badge status */}
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        member.status === "aceito"   ? "bg-emerald-100 text-emerald-700" :
        member.status === "recusado" ? "bg-red-100 text-red-600" :
                                       "bg-amber-100 text-amber-700"
      }`}>
        {member.status === "aceito" ? "Ativo" : member.status === "recusado" ? "Recusado" : "Pendente"}
      </span>

      {/* permissões */}
      <div className="flex shrink-0 gap-1">
        <PermissionToggle
          label="QR"
          icon={QrCode}
          checked={qr}
          onChange={(v) => handleToggle(v, ins, chav)}
          disabled={isPending}
        />
        <PermissionToggle
          label="Inscrições"
          icon={Users}
          checked={ins}
          onChange={(v) => handleToggle(qr, v, chav)}
          disabled={isPending}
        />
        <PermissionToggle
          label="Chaveamento"
          icon={CheckSquare}
          checked={chav}
          onChange={(v) => handleToggle(qr, ins, v)}
          disabled={isPending}
        />
      </div>

      {/* remover */}
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        title="Remover da equipe"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
    </li>
  );
}

/* ─── componente principal ─── */

export function EquipeClient({
  champId,
  members,
}: {
  champId: string;
  members: StaffMember[];
}) {
  const [query, setQuery]           = useState("");
  const [result, setResult]         = useState<SearchResult>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSearching, startSearch]  = useTransition();
  const [isInviting, startInvite]   = useTransition();

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setResult(null);
    setInviteError(null);
    startSearch(async () => {
      const found = await searchUserByUsername(q);
      setResult(found ?? "not_found");
    });
  }

  function handleInvite(userId: string) {
    setInviteError(null);
    startInvite(async () => {
      const res = await convidarStaff(champId, userId);
      if (!res.ok) {
        setInviteError(res.error ?? "Erro ao convidar.");
      } else {
        setResult(null);
        setQuery("");
      }
    });
  }

  const foundUser = result !== null && result !== "not_found" ? result : null;
  const alreadyInvited = foundUser
    ? members.some((m) => m.userId === foundUser.id)
    : false;

  return (
    <div className="space-y-8">

      {/* ── busca + convite ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Convidar membro
        </h2>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="usuário"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-7 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
          >
            {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </button>
        </div>

        {/* resultado da busca */}
        {result === "not_found" && (
          <p className="mt-3 text-sm text-gray-400">Usuário não encontrado.</p>
        )}

        {foundUser && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {foundUser.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{foundUser.nome}</p>
              <p className="text-xs text-gray-400">@{foundUser.username}</p>
            </div>
            {alreadyInvited ? (
              <span className="text-xs text-gray-400">Já na equipe</span>
            ) : (
              <button
                onClick={() => handleInvite(foundUser.id)}
                disabled={isInviting}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isInviting ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
                Convidar
              </button>
            )}
          </div>
        )}

        {inviteError && (
          <p className="mt-2 text-sm text-red-500">{inviteError}</p>
        )}
      </section>

      {/* ── lista de membros ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Equipe {members.length > 0 && `(${members.length})`}
        </h2>

        {members.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
            <p className="text-sm text-gray-400">
              Nenhum membro ainda. Busque pelo @ de um atleta para convidar.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {members.map((m) => (
              <MemberRow key={m.id} member={m} champId={champId} />
            ))}
          </ul>
        )}

        {members.length > 0 && (
          <p className="mt-3 text-xs text-gray-400">
            Marque as permissões de cada membro. Alterações salvas automaticamente.
          </p>
        )}
      </section>
    </div>
  );
}
