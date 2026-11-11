"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Trash2, QrCode, Users, CheckSquare, Loader2, UserCheck } from "lucide-react";
import {
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

type SearchUser = { id: string; nome: string; username: string };

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
    <label className={`flex shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl p-2 transition-colors ${
      checked ? "bg-brand-soft" : "bg-surface-2"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-surface-2/80"}`}>
      <Icon className={`size-4 ${checked ? "text-brand" : "text-gray-400"}`} />
      <span className={`text-[10px] font-medium ${checked ? "text-brand-ink" : "text-gray-500"}`}>
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
    <li className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-3">
        {/* avatar inicial */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-ink">
          {member.nome.charAt(0).toUpperCase()}
        </div>

        {/* nome + @ */}
        <div className="min-w-0 flex-1 basis-32">
          <p className="truncate font-medium text-gray-900">{member.nome}</p>
          <p className="truncate text-xs text-gray-400">@{member.username}</p>
        </div>

        {/* badge status */}
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          member.status === "aceito"   ? "bg-success-bg text-success" :
          member.status === "recusado" ? "bg-red-100 text-red-600" :
                                         "bg-amber-100 text-amber-700"
        }`}>
          {member.status === "aceito" ? "Ativo" : member.status === "recusado" ? "Recusado" : "Pendente"}
        </span>

        {/* remover */}
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          title="Remover da equipe"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </button>
      </div>

      {/* permissões + perfis rápidos */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
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

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-gray-400">Perfis:</span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleToggle(true, true, false)}
            className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
              qr && ins && !chav
                ? "border-brand-border bg-brand-soft text-brand-ink"
                : "border-border bg-surface text-ink-muted hover:bg-surface-2"
            }`}
          >
            Portaria
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleToggle(true, false, true)}
            className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
              qr && !ins && chav
                ? "border-brand-border bg-brand-soft text-brand-ink"
                : "border-border bg-surface text-ink-muted hover:bg-surface-2"
            }`}
          >
            Mesário
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleToggle(true, true, true)}
            className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
              qr && ins && chav
                ? "border-brand-border bg-brand-soft text-brand-ink"
                : "border-border bg-surface text-ink-muted hover:bg-surface-2"
            }`}
          >
            Gestor Total
          </button>
        </div>
      </div>
    </li>
  );
}

/* ─── busca em tempo real ─── */

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

function BuscaConvite({
  champId,
  members,
}: {
  champId: string;
  members: StaffMember[];
}) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [status, setStatus]   = useState<"idle" | "loading" | "done" | "error">("idle");
  const [selected, setSelected] = useState<SearchUser | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, startInvite] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const search = useCallback(async (q: string) => {
    const myId = ++requestId.current;
    setStatus("loading");
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("falha na busca");
      const data: SearchUser[] = await res.json();
      if (myId !== requestId.current) return; // resposta desatualizada, ignora
      setResults(data);
      setStatus("done");
    } catch {
      if (myId !== requestId.current) return;
      setResults([]);
      setStatus("error");
    }
  }, []);

  function handleChange(value: string) {
    const clean = value.replace(/^@/, "");
    setQuery(clean);
    setSelected(null);
    setInviteError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (clean.trim().length < MIN_CHARS) {
      requestId.current++; // invalida qualquer busca em voo
      setResults([]);
      setStatus("idle");
      return;
    }

    debounceRef.current = setTimeout(() => search(clean.trim()), DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  function handleInvite(user: SearchUser) {
    setInviteError(null);
    startInvite(async () => {
      const res = await convidarStaff(champId, user.id);
      if (!res.ok) {
        setInviteError(res.error ?? "Erro ao convidar.");
      } else {
        setSelected(null);
        setQuery("");
        setResults([]);
        setStatus("idle");
      }
    });
  }

  const alreadyInvited = (userId: string) => members.some((m) => m.userId === userId);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Convidar membro
      </h2>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="usuário"
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-7 pr-9 text-sm text-ink placeholder-ink-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
        />
        {status === "loading" && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {query.trim().length > 0 && query.trim().length < MIN_CHARS && (
        <p className="mt-2 text-xs text-gray-400">Digite pelo menos {MIN_CHARS} caracteres.</p>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-red-500">Erro ao buscar. Tente de novo.</p>
      )}

      {status === "done" && results.length === 0 && !selected && (
        <p className="mt-3 text-sm text-gray-400">Nenhum usuário encontrado.</p>
      )}

      {/* lista de resultados */}
      {status === "done" && results.length > 0 && !selected && (
        <ul className="mt-2 space-y-1.5">
          {results.map((u) => {
            const jaNaEquipe = alreadyInvited(u.id);
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-gray-50 p-3 ring-1 ring-black/5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-ink">
                  {u.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 basis-32">
                  <p className="truncate font-medium text-gray-900">{u.nome}</p>
                  <p className="truncate text-xs text-gray-400">@{u.username}</p>
                </div>
                {jaNaEquipe ? (
                  <span className="shrink-0 text-xs text-gray-400">Já na equipe</span>
                ) : (
                  <button
                    onClick={() => handleInvite(u)}
                    disabled={isInviting}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                  >
                    {isInviting ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
                    Convidar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {inviteError && (
        <p className="mt-2 text-sm text-red-500">{inviteError}</p>
      )}
    </section>
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
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Coluna esquerda: convidar membro + guia de papéis */}
      <div className="space-y-4 lg:col-span-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <BuscaConvite champId={champId} members={members} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2.5 text-xs text-gray-500">
          <p className="font-semibold uppercase tracking-wider text-gray-700">
            Perfis recomendados
          </p>
          <p>
            <strong className="text-gray-800">Portaria:</strong> valida QR Code na entrada e confere status das inscrições.
          </p>
          <p>
            <strong className="text-gray-800">Mesário:</strong> faz chamadas de quadra, leitura QR e lança placares no chaveamento.
          </p>
          <p>
            <strong className="text-gray-800">Gestor Total:</strong> acesso completo a QR, inscrições e chaveamento.
          </p>
        </div>
      </div>

      {/* ── lista de membros ── */}
      <section className="lg:col-span-7">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Equipe {members.length > 0 && `(${members.length})`}
        </h2>

        {members.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
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
            Use os botões de perfil rápido ou ajuste permissões individuais; alterações são salvas na hora.
          </p>
        )}
      </section>
    </div>
  );
}
