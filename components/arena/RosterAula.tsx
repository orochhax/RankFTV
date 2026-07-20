"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Users, RotateCw, AlertTriangle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { finalizarPresenca, tentarCobrancaNovamente } from "@/app/arena/actions";
import { formatBRL } from "@/lib/format";

export type RosterAluno = {
  attendanceId: string;
  userId: string;
  nome: string;
  username: string | null;
  fotoUrl: string | null;
  horaReserva: string;
  status: "reservado" | "presente" | "ausente" | "cancelada";
  tipoCobranca: "credito" | "avulsa";
  valorAvulso: number | null;
  pagamentoStatus: "nao_aplicavel" | "pendente" | "processando" | "pago" | "falhou";
  pagamentoErro: string | null;
  finalizada: boolean;
};

function PagamentoBadge({ aluno }: { aluno: RosterAluno }) {
  if (aluno.tipoCobranca !== "avulsa") return null;
  if (aluno.pagamentoStatus === "pago") {
    return <span className="text-[11px] font-semibold text-emerald-600">Pago {aluno.valorAvulso != null && `· ${formatBRL(aluno.valorAvulso)}`}</span>;
  }
  if (aluno.pagamentoStatus === "processando") {
    return <span className="text-[11px] font-semibold text-amber-600">Cobrando…</span>;
  }
  if (aluno.pagamentoStatus === "falhou") {
    return <span className="text-[11px] font-semibold text-red-600">Pagamento falhou</span>;
  }
  if (aluno.pagamentoStatus === "pendente") {
    return <span className="text-[11px] font-semibold text-orange-600">Pagamento pendente</span>;
  }
  return null;
}

export function RosterAula({ alunos }: { alunos: RosterAluno[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [agindo, setAgindo] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});

  function finalizar(attendanceId: string, status: "presente" | "ausente") {
    setAgindo(attendanceId);
    setErros((e) => ({ ...e, [attendanceId]: "" }));
    startTransition(async () => {
      const r = await finalizarPresenca(attendanceId, status);
      if (r.error) setErros((e) => ({ ...e, [attendanceId]: r.error! }));
      else router.refresh();
      setAgindo(null);
    });
  }

  function retentarCobranca(attendanceId: string) {
    setAgindo(attendanceId);
    setErros((e) => ({ ...e, [attendanceId]: "" }));
    startTransition(async () => {
      const r = await tentarCobrancaNovamente(attendanceId);
      if (r.error) setErros((e) => ({ ...e, [attendanceId]: r.error! }));
      else router.refresh();
      setAgindo(null);
    });
  }

  if (alunos.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
        <Users className="mx-auto mb-2 size-8 text-gray-200" />
        <p className="text-sm text-gray-400">Nenhum aluno confirmou presença nesse horário ainda.</p>
      </div>
    );
  }

  const pendentesPagamento = alunos.filter((a) => a.tipoCobranca === "avulsa" && a.pagamentoStatus === "falhou").length;

  return (
    <div className="space-y-3">
      {pendentesPagamento > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-100">
          <AlertTriangle className="size-3.5 shrink-0" />
          {pendentesPagamento} {pendentesPagamento === 1 ? "aluno está" : "alunos estão"} com pagamento pendente.
        </div>
      )}
      <ul className="space-y-2">
        {alunos.map((aluno) => (
          <li key={aluno.attendanceId} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
            <div className="flex items-center gap-3">
              <Avatar nome={aluno.nome} color="bg-blue-500" size="md" fotoUrl={aluno.fotoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{aluno.nome}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {aluno.username && <p className="truncate text-xs text-gray-400">@{aluno.username}</p>}
                  <PagamentoBadge aluno={aluno} />
                </div>
              </div>
              <span className="shrink-0 text-xs text-gray-400">confirmou {aluno.horaReserva}</span>
            </div>

            {/* Ações de finalização — só enquanto ainda está "reservado" */}
            {aluno.status === "reservado" && (
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => finalizar(aluno.attendanceId, "presente")}
                  disabled={pending && agindo === aluno.attendanceId}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {pending && agindo === aluno.attendanceId ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  Presente
                </button>
                <button
                  type="button"
                  onClick={() => finalizar(aluno.attendanceId, "ausente")}
                  disabled={pending && agindo === aluno.attendanceId}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                >
                  <XCircle className="size-3.5" /> Ausente
                </button>
              </div>
            )}

            {aluno.status === "presente" && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Presença confirmada
              </p>
            )}
            {aluno.status === "ausente" && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-400">
                <XCircle className="size-3.5" /> Ausente
              </p>
            )}

            {/* Retry de cobrança — visível pro professor/dono/gerente quando falhou */}
            {aluno.pagamentoStatus === "falhou" && (
              <button
                type="button"
                onClick={() => retentarCobranca(aluno.attendanceId)}
                disabled={pending && agindo === aluno.attendanceId}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {pending && agindo === aluno.attendanceId ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                Tentar cobrança novamente
              </button>
            )}

            {erros[aluno.attendanceId] && (
              <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-600 ring-1 ring-red-100">
                {erros[aluno.attendanceId]}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
