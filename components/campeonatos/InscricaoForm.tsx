"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { inscreverDupla, type InscreverState } from "@/app/campeonatos/[id]/inscrever/actions";
import { formatBRL } from "@/lib/format";

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG"] as const;

type Props = {
  championshipId: string;
  categoryId: string;
  categoriaNome: string;
  valorInscricao: number;
  cpfSalvo: string | null;
  tamanhoSalvo: string | null;
  ratingDupla: number;
  isSandbagging: boolean;
};

// Taxas cobradas ao atleta por método de pagamento.
const TAXAS = {
  pix:    { label: "Pix",              percentual: 3  },
  debito: { label: "Cartão de débito", percentual: 5  },
  credito:{ label: "Cartão crédito 6x sem juros", percentual: 9  },
} as const;

type Metodo = keyof typeof TAXAS;

const initialState: InscreverState = {};

export function InscricaoForm({
  championshipId,
  categoryId,
  categoriaNome,
  valorInscricao,
  cpfSalvo,
  tamanhoSalvo,
  ratingDupla,
  isSandbagging,
}: Props) {
  const [state, action, pending] = useActionState(inscreverDupla, initialState);

  // Cálculo do total por método (exibido em tempo real).
  // Usa estado local leve via onChange no select.
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="championship_id" value={championshipId} />
      <input type="hidden" name="category_id"     value={categoryId}     />
      <input type="hidden" name="rating_dupla"    value={ratingDupla}    />
      <input type="hidden" name="sandbagging"     value={isSandbagging ? "1" : "0"} />

      {/* Resumo da inscrição */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-500">Categoria</p>
        <p className="mt-0.5 text-base font-semibold text-gray-900">{categoriaNome}</p>
        <p className="mt-3 text-sm font-semibold text-gray-500">Valor base da inscrição</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900">{formatBRL(valorInscricao)}</p>
      </div>

      {/* Método de pagamento */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Forma de pagamento</p>
        {(Object.entries(TAXAS) as [Metodo, typeof TAXAS[Metodo]][]).map(
          ([key, t]) => {
            const total = valorInscricao * (1 + t.percentual / 100);
            return (
              <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="metodo_pagamento"
                    value={key}
                    defaultChecked={key === "pix"}
                    className="accent-blue-600"
                  />
                  {t.label}
                  <span className="text-xs text-gray-400">+{t.percentual}%</span>
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatBRL(total)}
                </span>
              </label>
            );
          }
        )}
      </div>

      {/* CPF */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <label className="block text-sm font-semibold text-gray-700">Seu CPF</label>
        <input
          name="cpf"
          type="text"
          defaultValue={cpfSalvo ?? ""}
          placeholder="000.000.000-00"
          required
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          Necessário para emitir a cobrança. Salvo no seu perfil para próximas inscrições.
        </p>
      </div>

      {/* Tamanho de camisa */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-gray-700">
          Tamanho da camisa
          {!tamanhoSalvo && <span className="ml-1 text-red-500">*</span>}
        </p>
        <p className="mb-3 mt-0.5 text-xs text-gray-400">
          {tamanhoSalvo
            ? "Salvo no seu perfil — altere se quiser."
            : "Necessário para produção do kit. Salvo no seu perfil para os próximos campeonatos."}
        </p>
        <div className="flex flex-wrap gap-2">
          {TAMANHOS.map((sz) => (
            <label key={sz} className="cursor-pointer">
              <input
                type="radio"
                name="tamanho_camisa"
                value={sz}
                defaultChecked={tamanhoSalvo === sz}
                required
                className="peer sr-only"
              />
              <span className="flex h-10 w-12 items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-600 transition-colors peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white hover:border-blue-300">
                {sz}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Parceiro */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <label className="block text-sm font-semibold text-gray-700">
          @usuário do parceiro <span className="font-normal text-gray-400">(opcional agora)</span>
        </label>
        <input
          name="parceiro_username"
          type="text"
          placeholder="@username"
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          O parceiro receberá um convite para confirmar a dupla. Você pode pagar agora e
          informar o parceiro depois.
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Gerando cobrança…" : "Confirmar inscrição e pagar"}
      </button>
    </form>
  );
}
