"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, User, Loader2, RotateCw, Inbox } from "lucide-react";
import { tentarCobrancaNovamente } from "@/app/arena/actions";
import { horarioLabel, PUBLICO_LABEL, type PublicoAula } from "@/lib/arena-dates";
import { formatBRL } from "@/lib/format";

export type MinhaAula = {
  id: string;
  data: string;
  titulo: string;
  horaInicio: string | null;
  horaFim: string | null;
  publico: PublicoAula;
  professorNome: string | null;
  status: "reservado" | "presente" | "ausente" | "cancelada";
  tipoCobranca: "credito" | "avulsa";
  valorAvulso: number | null;
  pagamentoStatus: "nao_aplicavel" | "pendente" | "processando" | "pago" | "falhou";
  pagamentoErro: string | null;
};

const STATUS_BADGE: Record<MinhaAula["status"], { label: string; cls: string }> = {
  reservado: { label: "Pendente",             cls: "bg-orange-50 text-orange-600" },
  presente:  { label: "Presença confirmada",  cls: "bg-emerald-50 text-emerald-600" },
  ausente:   { label: "Ausente",              cls: "bg-gray-100 text-gray-500" },
  cancelada: { label: "Cancelada",            cls: "bg-gray-100 text-gray-400" },
};

function dataLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function PagamentoBadge({ aula, onRetry, retrying }: { aula: MinhaAula; onRetry: () => void; retrying: boolean }) {
  if (aula.tipoCobranca !== "avulsa" || aula.pagamentoStatus === "nao_aplicavel") return null;
  if (aula.pagamentoStatus === "pago") {
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
      Pago {aula.valorAvulso != null && `· ${formatBRL(aula.valorAvulso)}`}
    </span>;
  }
  if (aula.pagamentoStatus === "processando") {
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">Cobrando…</span>;
  }
  if (aula.pagamentoStatus === "pendente") {
    return <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">Pagamento pendente</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
      Pagamento falhou
      <button type="button" onClick={onRetry} disabled={retrying} className="underline decoration-dotted hover:text-red-700 disabled:opacity-50">
        {retrying ? <Loader2 className="inline size-3 animate-spin" /> : <RotateCw className="inline size-3" />} tentar de novo
      </button>
    </span>
  );
}

export function MinhasAulasClient({ aulas }: { aulas: MinhaAula[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [retryId, setRetryId] = useState<string | null>(null);
  const [erro, setErro] = useState<Record<string, string>>({});

  function retry(id: string) {
    setRetryId(id);
    startTransition(async () => {
      const r = await tentarCobrancaNovamente(id);
      if (r.error) setErro((e) => ({ ...e, [id]: r.error! }));
      else router.refresh();
      setRetryId(null);
    });
  }

  if (aulas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 text-center ring-1 ring-black/5">
        <Inbox className="size-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">Nenhuma aula confirmada ainda.</p>
        <p className="text-xs text-gray-400">Suas presenças aparecem aqui assim que você confirmar alguma aula.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {aulas.map((aula) => {
        const badge = STATUS_BADGE[aula.status];
        const horario = horarioLabel(aula.horaInicio, aula.horaFim);
        return (
          <li key={aula.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{aula.titulo}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {dataLabel(aula.data)}</span>
                  {horario && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {horario}</span>}
                  {aula.professorNome && <span className="inline-flex items-center gap-1"><User className="size-3.5" /> {aula.professorNome}</span>}
                  {aula.publico !== "misto" && <span>{PUBLICO_LABEL[aula.publico]}</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
                <PagamentoBadge aula={aula} onRetry={() => retry(aula.id)} retrying={pending && retryId === aula.id} />
              </div>
            </div>
            {erro[aula.id] && <p className="mt-2 text-xs text-red-600">{erro[aula.id]}</p>}
          </li>
        );
      })}
    </ul>
  );
}
