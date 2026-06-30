"use client";

import { useActionState, useState } from "react";
import { Loader2, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { comprarIngressoAtleta, type ComprarAtletaState } from "@/app/campeonatos/[id]/comprar/actions";
import { formatBRL } from "@/lib/format";
import { calcularTaxaComprador, calcularTotalComprador } from "@/lib/taxas";

export type CategoriaOpcao = {
  id: string;
  nome: string;
  genero: string;
  valorInscricao: number;
  corteRatingMin: number;
  corteRatingMax: number;
};

const CAMISAS = ["PP", "P", "M", "G", "GG", "XG", "XGG"];

export function IngressoAtletaForm({
  championshipId,
  categorias,
  isElite,
}: {
  championshipId: string;
  categorias: CategoriaOpcao[];
  isElite: boolean;
}) {
  const [catSelecionada, setCat] = useState<CategoriaOpcao | null>(null);
  const [state, formAction, pending] = useActionState<ComprarAtletaState, FormData>(
    comprarIngressoAtleta,
    {},
  );

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const select =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const valor   = catSelecionada?.valorInscricao ?? 0;
  const isGratis = valor <= 0;
  const taxa    = calcularTaxaComprador(valor, "pix", isElite);
  const total   = calcularTotalComprador(valor, "pix", isElite);

  return (
    <div className="space-y-6">
      {/* Seleção de categoria */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Escolha a categoria da dupla</p>
        {categorias.map((cat) => {
          const sel = catSelecionada?.id === cat.id;
          const v   = cat.valorInscricao;
          const t   = calcularTotalComprador(v, "pix", isElite);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCat(sel ? null : cat)}
              className={`w-full flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors ${
                sel ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${sel ? "bg-blue-600" : "bg-gray-100"}`}>
                  <Trophy className={`size-5 ${sel ? "text-white" : "text-gray-400"}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    Categoria {cat.nome}
                    {cat.genero !== "mista" && (
                      <span className="ml-1.5 text-xs font-normal text-gray-400">
                        · {cat.genero === "masculino" ? "Masculino" : "Feminino"}
                      </span>
                    )}
                    {cat.genero === "mista" && (
                      <span className="ml-1.5 text-xs font-normal text-gray-400">· Mista</span>
                    )}
                  </p>
                  {cat.corteRatingMin > 0 && (
                    <p className="text-xs text-gray-400">Pontuação mín. {cat.corteRatingMin}</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {v <= 0 ? (
                  <span className="font-semibold text-blue-600">Grátis</span>
                ) : (
                  <div>
                    <p className="font-semibold text-gray-900">{formatBRL(t)}</p>
                    <p className="text-[11px] text-gray-400">com taxa · Pix</p>
                  </div>
                )}
                {sel ? <ChevronUp className="ml-auto mt-1 size-4 text-blue-500" /> : <ChevronDown className="ml-auto mt-1 size-4 text-gray-300" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Formulário — só aparece após selecionar categoria */}
      {catSelecionada && (
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="championship_id" value={championshipId} />
          <input type="hidden" name="category_id"     value={catSelecionada.id} />
          <input type="hidden" name="categoria_nome"  value={catSelecionada.nome} />
          <input type="hidden" name="valor"           value={catSelecionada.valorInscricao} />

          {/* Seus dados */}
          <section className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Seus dados (atleta 1)</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome completo</label>
              <input name="comprador_nome" className={`mt-1 ${input}`} placeholder="Como vai aparecer no ingresso" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">CPF</label>
                <input name="comprador_cpf" inputMode="numeric" className={`mt-1 ${input}`} placeholder="Somente números" required maxLength={11} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input name="comprador_zap" inputMode="numeric" className={`mt-1 ${input}`} placeholder="DDD + número" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input name="comprador_email" type="email" className={`mt-1 ${input}`} placeholder="voce@email.com" required />
              <p className="mt-1 text-xs text-gray-400">O ingresso e QR de entrada chegam nesse e-mail.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Gênero</label>
                <select name="comprador_genero" className={`mt-1 ${select}`}>
                  <option value="">Não informar</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Camisa (kit)</label>
                <select name="comprador_camisa" className={`mt-1 ${select}`}>
                  <option value="">Não informar</option>
                  {CAMISAS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Dados do parceiro */}
          <section className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Dados do parceiro (atleta 2)</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome completo</label>
              <input name="parceiro_nome" className={`mt-1 ${input}`} placeholder="Nome completo do parceiro" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">CPF</label>
                <input name="parceiro_cpf" inputMode="numeric" className={`mt-1 ${input}`} placeholder="Somente números" required maxLength={11} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input name="parceiro_zap" inputMode="numeric" className={`mt-1 ${input}`} placeholder="DDD + número" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                <input name="parceiro_email" type="email" className={`mt-1 ${input}`} placeholder="parceiro@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gênero</label>
                <select name="parceiro_genero" className={`mt-1 ${select}`}>
                  <option value="">Não informar</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
            </div>
          </section>

          {/* Resumo do valor */}
          {!isGratis && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between text-gray-500">
                <span>Inscrição da dupla</span>
                <span>{formatBRL(valor)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-gray-500">
                <span>Taxa de serviço</span>
                <span>+ {formatBRL(taxa)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>Total no Pix</span>
                <span>{formatBRL(total)}</span>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                Um dos atletas paga o valor cheio da dupla.
              </p>
            </div>
          )}

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isGratis
              ? "Confirmar inscrição grátis"
              : `Continuar pro pagamento — ${formatBRL(total)}`}
          </button>
        </form>
      )}
    </div>
  );
}
