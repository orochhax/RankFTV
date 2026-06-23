"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, Rocket } from "lucide-react";
import {
  publicarCampeonato,
  type PublicarState,
} from "@/app/painel/campeonatos/[id]/publicar/actions";

const initial: PublicarState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export function PublicarCampeonatoForm({
  championshipId,
  precisaPix,
}: {
  championshipId: string;
  precisaPix: boolean;
}) {
  const [state, action, pending] = useActionState(publicarCampeonato, initial);
  const [aceito, setAceito] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="championship_id" value={championshipId} />

      {precisaPix && (
        <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Seus dados de recebimento</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Precisamos disso pra repassar o dinheiro das inscrições pra você e
              confirmar sua identidade.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CPF ou CNPJ</label>
            <input
              name="cpf_cnpj"
              type="text"
              inputMode="numeric"
              placeholder="Só números"
              required
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Precisa ser o mesmo titular da chave Pix abaixo.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Data de nascimento</label>
            <input
              name="data_nascimento"
              type="date"
              required
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              No CNPJ, use a data de nascimento do responsável.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Celular (com DDD)</label>
            <input
              name="telefone"
              type="tel"
              placeholder="(11) 99999-8888"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Chave Pix para receber os repasses
            </label>
            <input
              name="chave_pix"
              type="text"
              placeholder="CPF, celular, e-mail ou chave aleatória"
              required
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              É para cá que transferimos sua parte de cada inscrição paga.
            </p>
          </div>
        </div>
      )}

      {/* Aceite dos termos — obrigatório pra publicar */}
      <label className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <input
          type="checkbox"
          name="aceito_termos"
          checked={aceito}
          onChange={(e) => setAceito(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-600">
          Li e aceito os{" "}
          <Link
            href="/termos"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Termos de uso ↗
          </Link>{" "}
          da plataforma.
        </span>
      </label>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !aceito}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
        {pending ? "Publicando…" : "Publicar campeonato"}
      </button>
      {!aceito && (
        <p className="text-center text-xs text-gray-400">
          Aceite os Termos de uso para liberar a publicação.
        </p>
      )}
    </form>
  );
}
