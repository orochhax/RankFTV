"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { avaliarCapacidadeArena, type ArenaPlatformTierId } from "@/lib/arena-platform-plans";

export function ArenaPlanLimitBanner({
  totalAlunosAtivos,
  tierId = "start",
  arenaHandle,
}: {
  totalAlunosAtivos: number;
  tierId?: ArenaPlatformTierId;
  arenaHandle: string;
}) {
  const status = avaliarCapacidadeArena(totalAlunosAtivos, tierId);

  // Não exibe nada se não houver alerta nem bloqueio
  if (!status.isBloqueado && !status.isAviso) {
    return null;
  }

  // Tarja grande de Bloqueio (30 alunos atingidos)
  if (status.isBloqueado) {
    return (
      <aside
        aria-label="Limite do plano atingido"
        className="relative z-20 mx-4 mt-4 overflow-hidden rounded-2xl border-2 border-orange-500 bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-lg md:mx-6 md:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white md:text-lg">
                  Limite de 30 alunos atingido no Plano Start
                </h2>
                <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
                  Inscrições travadas
                </span>
              </div>
              <p className="mt-1 text-sm text-white/90">
                Sua arena atingiu a capacidade máxima. Novas inscrições de alunos estão bloqueadas até você migrar para o Plano Pro.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Link
              href={`/arena/${arenaHandle}/assinatura`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50 active:scale-95 sm:w-auto"
            >
              <Sparkles className="size-4" />
              Upgrade para o Pro (R$ 139/mês)
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </aside>
    );
  }

  // Tarja preventiva de Aviso (entre 25 e 29 alunos)
  return (
    <aside
      aria-label="Aviso de aproximação do limite do plano"
      className="relative z-20 mx-4 mt-4 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm md:mx-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-800">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">
              Atenção: sua arena está com {status.totalAlunosAtivos} de 30 alunos ativos
            </p>
            <p className="text-xs text-amber-800">
              Restam apenas {status.vagasRestantes} vagas no Plano Start. Garanta inscrições ilimitadas e libere automações migrando para o Pro.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <Link
            href={`/arena/${arenaHandle}/assinatura`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-amber-700 active:scale-95 sm:w-auto"
          >
            Conhecer Plano Pro
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
