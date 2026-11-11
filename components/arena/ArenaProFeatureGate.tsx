"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Lock, Sparkles, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import type { ArenaPlatformTierId } from "@/lib/arena-platform-plans";

export function ArenaProFeatureGate({
  tierId = "start",
  arenaHandle,
  featureTitle,
  featureDescription,
  icon: Icon,
  benefits = [],
  children,
}: {
  tierId?: ArenaPlatformTierId;
  arenaHandle: string;
  featureTitle: string;
  featureDescription: string;
  icon: LucideIcon;
  benefits?: string[];
  children: React.ReactNode;
}) {
  // Se já for assinante Pro, libera o acesso irrestrito ao recurso
  if (tierId === "pro") {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-sm md:p-10">
        {/* Fundo decorativo sutil */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-brand-soft/80 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full bg-amber-50/60 blur-3xl" />

        <div className="relative z-10">
          {/* Header do Gatekeeper */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20">
                <Icon className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-amber-900">
                    <Sparkles className="size-3 text-amber-600" />
                    Plano Pro
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    <Lock className="size-3 text-gray-400" />
                    Bloqueado no Plano Start
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
                  {featureTitle}
                </h1>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3.5 py-2 text-xs font-bold text-amber-900">
              ⚡ Alunos ilimitados + Automações
            </div>
          </div>

          {/* Descrição e Proposta de Valor */}
          <div className="mt-6 space-y-4">
            <p className="text-base text-gray-600 md:text-lg">
              {featureDescription}
            </p>

            {benefits.length > 0 && (
              <div className="mt-6 rounded-2xl bg-gray-50/80 p-5 ring-1 ring-black/5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  O que está incluso no Plano Pro para sua arena:
                </p>
                <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm font-medium text-gray-800">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Preview Visual Borrado (Simulação da Interface) */}
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-6 text-center select-none">
            <div className="pointer-events-none blur-sm opacity-40">
              <div className="h-6 w-1/3 rounded bg-gray-300 mx-auto mb-4" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-20 rounded-xl bg-gray-200" />
                <div className="h-20 rounded-xl bg-gray-200" />
                <div className="h-20 rounded-xl bg-gray-200" />
              </div>
              <div className="mt-4 h-32 rounded-xl bg-gray-200" />
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] p-4">
              <ShieldCheck className="size-8 text-amber-500" />
              <p className="mt-2 text-sm font-bold text-gray-900">
                Ative o Plano Pro para desbloquear este módulo
              </p>
              <p className="text-xs text-gray-500">
                Acesso imediato sem fidelidade por R$ 139,00 / mês
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/arena/${arenaHandle}`}
              className="order-2 rounded-xl border border-gray-200 px-5 py-3 text-center text-sm font-semibold text-gray-600 transition hover:bg-gray-50 sm:order-1"
            >
              Voltar ao Início
            </Link>

            <Link
              href={`/arena/${arenaHandle}/assinatura`}
              className="order-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-center text-sm font-bold text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover active:scale-95 sm:order-2"
            >
              <Sparkles className="size-4" />
              Fazer Upgrade para o Plano Pro
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
