"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ativarArena, type AtivarArenaState } from "@/app/perfil/ativar-arena/actions";

const input =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
const select =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export function AtivarArenaForm({ estados }: { estados: string[] }) {
  const [termoAceito, setTermoAceito] = useState(false);
  const [state, formAction, pending] = useActionState<AtivarArenaState, FormData>(
    ativarArena,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* Dados da arena */}
      <section className="space-y-4">
        <p className="text-sm font-semibold text-gray-700">Dados da arena</p>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome da arena</label>
          <input name="nome" className={`mt-1 ${input}`} placeholder="Ex.: Arena Futevôlei SP" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cidade</label>
            <input name="cidade" className={`mt-1 ${input}`} placeholder="São Paulo" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select name="estado" className={`mt-1 ${select}`} required defaultValue="">
              <option value="" disabled>UF</option>
              {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descrição (opcional)</label>
          <textarea
            name="descricao"
            rows={3}
            className={`mt-1 ${input} resize-none`}
            placeholder="Horários, modalidades, estrutura da arena..."
          />
        </div>
      </section>

      {/* Dados para recebimento */}
      <section className="space-y-4">
        <p className="text-sm font-semibold text-gray-700">Dados para recebimento</p>
        <div>
          <label className="block text-sm font-medium text-gray-700">CPF ou CNPJ</label>
          <input name="cpf_cnpj" inputMode="numeric" className={`mt-1 ${input}`} placeholder="Somente números" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
          <input name="telefone" inputMode="numeric" className={`mt-1 ${input}`} placeholder="DDD + número" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Chave Pix (opcional por ora)</label>
          <input name="chave_pix" className={`mt-1 ${input}`} placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" />
          <p className="mt-1 text-xs text-gray-400">Você pode adicionar depois. Necessária para receber as mensalidades.</p>
        </div>
      </section>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
          {state.error}
        </p>
      )}

      {/* Aceite dos termos */}
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={termoAceito}
          onChange={(e) => setTermoAceito(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-gray-300 accent-blue-600"
        />
        <span className="text-sm text-gray-600">
          Li e aceito os{" "}
          <Link href="/termos" target="_blank" className="text-blue-600 underline hover:text-blue-800">
            Termos de uso
          </Link>{" "}
          da RankFTV
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || !termoAceito}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Criar arena
      </button>
    </form>
  );
}
