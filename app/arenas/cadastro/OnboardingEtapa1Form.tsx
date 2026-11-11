"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, Building2, Clock } from "lucide-react";
import { cadastrarArenaEtapa1, type OnboardingState } from "./actions";

const inputCls =
  "w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand bg-white shadow-xs";
const selectCls =
  "w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand bg-white shadow-xs";

export function OnboardingEtapa1Form({ estados }: { estados: string[] }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    cadastrarArenaEtapa1,
    {},
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Bloco 1: Identidade da Arena */}
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Identificação da Arena</h2>
            <p className="text-xs text-gray-500">Como seus alunos conhecem seu centro de treinamento.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Nome da Arena ou Centro de Treinamento *
            </label>
            <input
              name="nome"
              required
              placeholder="Ex.: CT Futevôlei Maracaibo"
              className={`mt-1.5 ${inputCls}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Cidade *
              </label>
              <input
                name="cidade"
                required
                placeholder="Ex.: São Paulo"
                className={`mt-1.5 ${inputCls}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Estado (UF) *
              </label>
              <select name="estado" required defaultValue="" className={`mt-1.5 ${selectCls}`}>
                <option value="" disabled>UF</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                WhatsApp de Contato da Arena *
              </label>
              <input
                name="telefone"
                required
                type="tel"
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                className={`mt-1.5 ${inputCls}`}
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Usado para alunos tirarem dúvidas e receberem notificações.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Quantidade de Quadras de Areia
              </label>
              <select name="num_quadras" defaultValue="2" className={`mt-1.5 ${selectCls}`}>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? "quadra" : "quadras"}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 2: Sua Primeira Turma (Opcional para já deixar configurado) */}
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Clock className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Sua Primeira Turma (Opcional)</h2>
            <p className="text-xs text-gray-500">Configure um horário para já começar com a grade pronta.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Nome da Turma
            </label>
            <input
              name="turma_titulo"
              placeholder="Ex.: Futevôlei Noturno (Seg/Qua)"
              className={`mt-1.5 ${inputCls}`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Horário de Início
            </label>
            <input
              name="turma_horario"
              type="time"
              defaultValue="19:00"
              className={`mt-1.5 ${inputCls}`}
            />
          </div>
        </div>
      </div>

      {state.error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600 ring-1 ring-red-100">
          ⚠️ {state.error}
        </div>
      )}

      {/* Botão de Envio */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <Link
          href="/arenas/para-donos"
          className="order-2 text-center text-xs font-bold text-gray-500 hover:text-gray-800 sm:order-1"
        >
          ← Voltar para benefícios
        </Link>

        <button
          type="submit"
          disabled={pending}
          className="order-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-4 text-sm font-black text-white shadow-lg shadow-brand/20 transition hover:bg-brand-hover active:scale-95 disabled:opacity-60 sm:order-2 sm:w-auto"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Continuar para Escolha do Plano
          <ArrowRight className="size-4" />
        </button>
      </div>
    </form>
  );
}
