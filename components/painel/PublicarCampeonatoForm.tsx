"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Rocket } from "lucide-react";
import {
  publicarCampeonato,
  type PublicarState,
} from "@/app/painel/campeonatos/[id]/publicar/actions";

const initial: PublicarState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const selectClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const PARCELAS = [
  { value: "1",  label: "Só à vista (1x)" },
  { value: "2",  label: "Até 2x" },
  { value: "3",  label: "Até 3x" },
  { value: "6",  label: "Até 6x" },
  { value: "12", label: "Até 12x" },
];

export function PublicarCampeonatoForm({
  championshipId,
  precisaPix,
  temCategoriaPaga,
  temIngresso,
  maxParcelasInscricao,
  maxParcelasIngresso,
}: {
  championshipId: string;
  precisaPix: boolean;
  temCategoriaPaga: boolean;
  temIngresso: boolean;
  maxParcelasInscricao: number;
  maxParcelasIngresso: number;
}) {
  const [state, action, pending] = useActionState(publicarCampeonato, initial);
  const [aceito, setAceito] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="championship_id" value={championshipId} />

      {/* Chave Pix (só quando ainda não tem uma configurada) */}
      {precisaPix && (
        <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Chave Pix para receber os repasses</p>
            <p className="mt-0.5 text-xs text-gray-400">
              É para cá que transferimos sua parte de cada inscrição paga.
            </p>
          </div>

          <div>
            <input
              name="chave_pix"
              type="text"
              placeholder="CPF, celular, e-mail ou chave aleatória"
              required
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Parcelamento no cartão */}
      {temCategoriaPaga && (
        <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Parcelamento no cartão</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Defina o máximo de parcelas que o comprador pode usar no cartão de crédito.
              Pix é sempre à vista.
            </p>
          </div>

          {/* Aviso de repasse parcelado */}
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-xs leading-relaxed text-amber-800">
              <strong>Atenção:</strong> você também recebe de forma parcelada. Se o comprador
              parcelar em 3x, o repasse chega em 3 vezes conforme as parcelas vencem — não tudo
              de uma vez.
            </p>
          </div>

          {/* Inscrições */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Inscrições de atletas
            </label>
            <select
              name="max_parcelas_inscricao"
              defaultValue={String(maxParcelasInscricao)}
              className={selectClass}
            >
              {PARCELAS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Ingressos de plateia (só se tiver tipos criados) */}
          {temIngresso && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ingressos de plateia
              </label>
              <select
                name="max_parcelas_ingresso"
                defaultValue={String(maxParcelasIngresso)}
                className={selectClass}
              >
                {PARCELAS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          )}
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
