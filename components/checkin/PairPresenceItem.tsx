import { CheckCircle2, Clock3, Users } from "lucide-react";

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
  const confirmed = members.filter((member) => member.checkedIn).length;
  const complete = confirmed === members.length;

  return (
    <li className={complete ? "bg-blue-50/50" : "bg-surface"}>
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
            <Users className="size-4 text-ink-muted" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Dupla</p>
            <p className="truncate text-xs text-ink-muted">
              {members.map((member) => member.name).join(" + ")}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            complete
              ? "bg-blue-100 text-blue-700"
              : confirmed > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-surface-2 text-ink-muted"
          }`}
        >
          {confirmed} de {members.length}
        </span>
      </div>

      <ul className="divide-y divide-border/70">
        {members.map((member, index) => {
          const time = formatTime(member.checkinAt);
          return (
            <li key={`${index}:${member.name}`} className="flex items-center gap-3 px-4 py-3">
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
