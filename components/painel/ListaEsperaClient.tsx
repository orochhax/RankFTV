"use client";

import { useMemo, useState } from "react";
import { Clock3, MailCheck, Search, Send, Timer, Users } from "lucide-react";
import { convidarProximoDaLista } from "@/app/painel/campeonatos/[id]/lista-espera/actions";

export type WaitlistEntryItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  email: string;
  status: "waiting" | "invited" | "converted" | "cancelled" | "expired";
  createdAt: string;
  invitedAt: string | null;
  inviteExpiresAt: string | null;
};

type CategoryOption = {
  id: string;
  nome: string;
};

function formatDateTimeBR(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function getInviteCountdown(inviteExpiresAt: string | null) {
  if (!inviteExpiresAt) return null;
  const diffMs = Date.parse(inviteExpiresAt) - Date.now();
  if (!Number.isFinite(diffMs)) return null;
  if (diffMs <= 0) return { label: "Convite expirado", expired: true };
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    label: hours > 0 ? `Expira em ${hours}h ${minutes}min` : `Expira em ${minutes}min`,
    expired: false,
  };
}

const STATUS_BADGE: Record<WaitlistEntryItem["status"], { label: string; cls: string }> = {
  waiting: {
    label: "Aguardando vaga",
    cls: "border-amber-200 bg-amber-50 text-amber-800",
  },
  invited: {
    label: "Convidado",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  converted: {
    label: "Convertido",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    label: "Cancelado",
    cls: "border-border bg-surface-2 text-ink-muted",
  },
  expired: {
    label: "Expirado",
    cls: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

export function ListaEsperaClient({
  champId,
  categories,
  entries,
}: {
  champId: string;
  categories: CategoryOption[];
  entries: WaitlistEntryItem[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | WaitlistEntryItem["status"]>("todos");
  const [search, setSearch] = useState("");

  const countsByCategory = useMemo(() => {
    const map = new Map<
      string,
      { waiting: number; invited: number; converted: number }
    >();
    for (const c of categories) {
      map.set(c.id, { waiting: 0, invited: 0, converted: 0 });
    }
    for (const entry of entries) {
      const stats = map.get(entry.categoryId) ?? { waiting: 0, invited: 0, converted: 0 };
      if (entry.status === "waiting") stats.waiting += 1;
      if (entry.status === "invited") stats.invited += 1;
      if (entry.status === "converted") stats.converted += 1;
      map.set(entry.categoryId, stats);
    }
    return map;
  }, [categories, entries]);

  // Calcula posição FIFO apenas entre os "waiting" dentro de cada categoria
  const fifoPositionMap = useMemo(() => {
    const pos = new Map<string, number>();
    const counters = new Map<string, number>();
    for (const entry of entries) {
      if (entry.status === "waiting") {
        const next = (counters.get(entry.categoryId) ?? 0) + 1;
        counters.set(entry.categoryId, next);
        pos.set(entry.id, next);
      }
    }
    return pos;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (selectedCategory !== "todas" && entry.categoryId !== selectedCategory) return false;
      if (statusFilter !== "todos" && entry.status !== statusFilter) return false;
      if (!q) return true;
      return (
        entry.email.toLowerCase().includes(q) ||
        entry.categoryName.toLowerCase().includes(q)
      );
    });
  }, [entries, selectedCategory, statusFilter, search]);

  const totalWaiting = entries.filter((e) => e.status === "waiting").length;
  const totalInvited = entries.filter((e) => e.status === "invited").length;
  const totalConverted = entries.filter((e) => e.status === "converted").length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Aguardando na fila
            </span>
            <Users className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{totalWaiting}</p>
          <p className="mt-0.5 text-xs text-ink-muted">Ordem FIFO garantida por entrada</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Convites ativos (24h)
            </span>
            <Clock3 className="size-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{totalInvited}</p>
          <p className="mt-0.5 text-xs text-ink-muted">Aguardando conclusão da inscrição</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Vagas convertidas
            </span>
            <MailCheck className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{totalConverted}</p>
          <p className="mt-0.5 text-xs text-ink-muted">Inscrições efetivadas via lista</p>
        </div>
      </div>

      {/* Resumo por categoria com botão Convidar próximo */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => {
          const stats = countsByCategory.get(cat.id) ?? { waiting: 0, invited: 0, converted: 0 };
          const active = selectedCategory === cat.id;
          return (
            <div
              key={cat.id}
              className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                active ? "border-blue-400 bg-blue-50/30" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory((prev) => (prev === cat.id ? "todas" : cat.id))
                  }
                  className="text-left"
                >
                  <p className="font-bold text-ink hover:text-blue-700">{cat.nome}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-muted">
                    <span>{stats.waiting} aguardando</span>
                    <span>·</span>
                    <span>{stats.invited} convidados</span>
                    <span>·</span>
                    <span>{stats.converted} convertidos</span>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory((prev) => (prev === cat.id ? "todas" : cat.id))
                  }
                  className="text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  {active ? "Mostrar todas" : "Filtrar fila"}
                </button>

                {stats.waiting > 0 && (
                  <form action={convidarProximoDaLista}>
                    <input type="hidden" name="championship_id" value={champId} />
                    <input type="hidden" name="category_id" value={cat.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <Send className="size-3.5" />
                      Convidar #1 próximo
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela Ordenada */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar e-mail ou categoria..."
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-blue-500"
            >
              <option value="todas">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "todos" | WaitlistEntryItem["status"])
              }
              className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-blue-500"
            >
              <option value="todos">Todos os status</option>
              <option value="waiting">Aguardando</option>
              <option value="invited">Convidados</option>
              <option value="converted">Convertidos</option>
              <option value="expired">Expirados</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Nenhum registro encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Posição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Entrada / Validade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((entry) => {
                  const pos = fifoPositionMap.get(entry.id);
                  const badge = STATUS_BADGE[entry.status];
                  const countdown =
                    entry.status === "invited"
                      ? getInviteCountdown(entry.inviteExpiresAt)
                      : null;

                  return (
                    <tr key={entry.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-3 font-bold text-ink">
                        {pos ? (
                          <span className="inline-flex size-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                            #{pos}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{entry.categoryName}</td>
                      <td className="px-4 py-3 text-ink-muted">{entry.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        <div>Entrou em {formatDateTimeBR(entry.createdAt)}</div>
                        {countdown && (
                          <div
                            className={`mt-0.5 inline-flex items-center gap-1 font-semibold ${
                              countdown.expired ? "text-rose-600" : "text-blue-600"
                            }`}
                          >
                            <Timer className="size-3" />
                            {countdown.label}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
