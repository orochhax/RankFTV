"use client";

import { useId, useState } from "react";
import { CheckCircle2, ChevronDown, Clock3 } from "lucide-react";

export type PairPresenceMember = {
  name: string;
  checkedIn: boolean;
  checkinAt: string | null;
  scannerName: string | null;
};

function formatTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PairPresenceItem({ members }: { members: PairPresenceMember[] }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const confirmed = members.filter((member) => member.checkedIn).length;
  const complete = confirmed === members.length;

  return (
    <li className={complete ? "bg-blue-50/40" : "bg-surface"}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/70"
      >
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm font-semibold leading-5">
            {members.map((member, index) => (
              <span key={`${index}:${member.name}`} className="contents">
                {index > 0 && <span aria-hidden="true" className="text-ink-muted">+</span>}
                <span className={member.checkedIn ? "text-blue-700" : "text-ink-muted"}>
                  {member.name}
                </span>
              </span>
            ))}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted">
            {complete ? <CheckCircle2 className="size-3 text-blue-600" /> : <Clock3 className="size-3" />}
            {complete ? "Dupla confirmada" : confirmed > 0 ? "Chegada parcial" : "Aguardando chegada"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            complete
              ? "bg-blue-100 text-blue-700"
              : confirmed > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-surface-2 text-ink-muted"
          }`}
        >
          {confirmed}/{members.length}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-ink-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <ul id={detailsId} hidden={!expanded} className="divide-y divide-border/70 border-t border-border/70 bg-surface-2/35">
        {members.map((member, index) => {
          const time = formatTime(member.checkinAt);
          return (
            <li key={`${index}:${member.name}`} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  member.checkedIn ? "bg-blue-100" : "bg-surface-2"
                }`}
              >
                {member.checkedIn ? (
                  <CheckCircle2 className="size-4 text-blue-600" />
                ) : (
                  <Clock3 className="size-4 text-ink-muted" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{member.name}</p>
                {member.checkedIn && time ? (
                  <p className="text-xs text-ink-muted">
                    Chegou às {time}
                    {member.scannerName ? ` · por ${member.scannerName}` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted">Aguardando chegada</p>
                )}
              </div>
              <span
                className={`shrink-0 text-xs font-medium ${
                  member.checkedIn ? "text-blue-700" : "text-ink-muted"
                }`}
              >
                {member.checkedIn ? "Presente" : "Pendente"}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
