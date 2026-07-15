"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Eye, EyeOff, Tag } from "lucide-react";
import {
  criarCupom,
  alternarCupom,
  excluirCupom,
  type CriarCupomInput,
} from "@/app/painel/campeonatos/[id]/cupons/actions";
import { formatBRL } from "@/lib/format";

type Cupom = {
  id: string;
  codigo: string;
  tipo_desconto: "percentual" | "valor_fixo";
  valor_desconto: number;
  aplica_em: "atleta" | "plateia" | "ambos";
  quantidade_maxima: number | null;
  usos_atuais: number;
  data_fim: string | null;
  ativo: boolean;
};

const APLICA_EM_LABEL: Record<string, string> = {
  atleta:   "Atleta",
  plateia:  "Plateia",
  ambos:    "Atleta + Plateia",
};

function fmtDesconto(c: Pick<Cupom, "tipo_desconto" | "valor_desconto">) {
  return c.tipo_desconto === "percentual"
    ? `${Number(c.valor_desconto)}%`
    : formatBRL(Number(c.valor_desconto));
}

export function CuponsManager({ champId, cupons }: { champId: string; cupons: Cupom[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  // Campos do formulário de novo cupom
  const [codigo, setCodigo] = useState("");
  const [tipoDesconto, setTipoDesconto] = useState<"percentual" | "valor_fixo">("percentual");
  const [valorDesconto, setValorDesconto] = useState("");
  const [aplicaEm, setAplicaEm] = useState<"atleta" | "plateia" | "ambos">("ambos");
  const [quantidadeMaxima, setQuantidadeMaxima] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function limparForm() {
    setCodigo(""); setValorDesconto(""); setQuantidadeMaxima(""); setDataFim("");
    setTipoDesconto("percentual"); setAplicaEm("ambos");
  }

  function adicionar() {
    setErro(null);
    const input: CriarCupomInput = {
      codigo,
      tipoDesconto,
      valorDesconto: Number(valorDesconto) || 0,
      aplicaEm,
      quantidadeMaxima: quantidadeMaxima.trim() ? Math.max(1, Math.floor(Number(quantidadeMaxima))) : null,
      dataFim: dataFim || null,
    };
    startTransition(async () => {
      const res = await criarCupom(champId, input);
      if (res.ok) { limparForm(); setAdding(false); router.refresh(); }
      else setErro(res.error ?? "Erro ao criar.");
    });
  }

  function alternar(cupomId: string, ativo: boolean) {
    startTransition(async () => {
      await alternarCupom(champId, cupomId, ativo);
      router.refresh();
    });
  }

  function excluir(cupomId: string) {
    if (!confirm("Excluir este cupom? Inscrições já feitas com ele não são afetadas.")) return;
    startTransition(async () => {
      await excluirCupom(champId, cupomId);
      router.refresh();
    });
  }

  const input =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const select = `${input} bg-white`;

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6 lg:space-y-0">
      {/* Lista */}
      {cupons.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 lg:order-1">
          {cupons.map((c) => {
            const esgotado = c.quantidade_maxima != null && c.usos_atuais >= c.quantidade_maxima;
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-mono font-semibold ${c.ativo ? "text-gray-900" : "text-gray-400 line-through"}`}>
                      {c.codigo}
                    </p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                      -{fmtDesconto(c)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {APLICA_EM_LABEL[c.aplica_em]}
                    {" · "}
                    {c.quantidade_maxima != null
                      ? `${c.usos_atuais}/${c.quantidade_maxima} usados${esgotado ? " · esgotado" : ""}`
                      : `${c.usos_atuais} usados · ilimitado`}
                    {c.data_fim && ` · vale até ${new Date(c.data_fim).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alternar(c.id, !c.ativo)}
                  disabled={pending}
                  title={c.ativo ? "Desativar" : "Ativar"}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  {c.ativo ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => excluir(c.id)}
                  disabled={pending}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Adicionar */}
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 lg:order-2 lg:sticky lg:top-20"
        >
          <Plus className="size-4" /> Novo cupom
        </button>
      ) : (
        <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 lg:order-2 lg:sticky lg:top-20">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-blue-500" />
            <p className="text-sm font-semibold text-gray-700">Novo cupom</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500">Código</label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="PROMO10"
                className={`${input} font-mono uppercase tracking-wide`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500">Tipo de desconto</label>
              <select value={tipoDesconto} onChange={(e) => setTipoDesconto(e.target.value as "percentual" | "valor_fixo")} className={select}>
                <option value="percentual">Percentual (%)</option>
                <option value="valor_fixo">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                {tipoDesconto === "percentual" ? "Desconto (%)" : "Desconto (R$)"}
              </label>
              <input
                value={valorDesconto}
                onChange={(e) => setValorDesconto(e.target.value)}
                inputMode="numeric"
                placeholder={tipoDesconto === "percentual" ? "10" : "20"}
                className={input}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500">Vale para</label>
              <select value={aplicaEm} onChange={(e) => setAplicaEm(e.target.value as "atleta" | "plateia" | "ambos")} className={select}>
                <option value="ambos">Atleta + Plateia</option>
                <option value="atleta">Só atleta</option>
                <option value="plateia">Só plateia</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Limite de usos</label>
              <input
                value={quantidadeMaxima}
                onChange={(e) => setQuantidadeMaxima(e.target.value)}
                inputMode="numeric"
                placeholder="Ilimitado"
                className={input}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500">Válido até (opcional)</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className={input}
              />
            </div>
          </div>

          {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={adicionar}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Criar cupom
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); limparForm(); setErro(null); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
