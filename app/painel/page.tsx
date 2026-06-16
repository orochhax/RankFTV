import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { championshipFinance, getChampionshipsOrganizedBy } from "@/lib/mock/championships";
import { getCurrentAthlete } from "@/lib/mock/current-user";
import { formatBRL, formatDateRangeBR } from "@/lib/format";

const AREAS_DE_GESTAO = ["Credenciamento/check-in", "Camisas/kit", "Comunicação", "Destaque pago"];

// Painel do organizador — ver ftv.md seção 8.7. Visão geral de quanto cada
// campeonato organizado já arrecadou, quantas duplas estão inscritas, e
// atalhos pras outras áreas de gestão (ainda visuais — ficam funcionais
// conforme o Supabase/Asaas forem ligados, na Fase 1).
export default function PainelOrganizadorPage() {
  const me = getCurrentAthlete();
  const campeonatos = getChampionshipsOrganizedBy(me.id);
  const totalArrecadado = campeonatos.reduce((s, c) => s + championshipFinance(c).totalArrecadado, 0);
  const totalDuplas = campeonatos.reduce((s, c) => s + c.duplas.length, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Painel do organizador</h1>
        <Link
          href="/painel/novo-campeonato"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="size-4" /> Criar campeonato
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Campeonatos organizados</p>
          <p className="text-2xl font-bold text-gray-900">{campeonatos.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Duplas inscritas (total)</p>
          <p className="text-2xl font-bold text-gray-900">{totalDuplas}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <p className="text-xs text-gray-500">Arrecadado (total)</p>
          <p className="text-2xl font-bold text-gray-900">{formatBRL(totalArrecadado)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {campeonatos.map((c) => {
          const finance = championshipFinance(c);
          return (
            <div key={c.id} className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/campeonatos/${c.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                    {c.nome}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {formatDateRangeBR(c.dataInicio, c.dataFim)} · {c.cidade}-{c.estado}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Arrecadado</p>
                  <p className="font-semibold text-gray-900">{formatBRL(finance.totalArrecadado)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Taxa da plataforma ({c.taxaPlataforma}%)</p>
                  <p className="font-semibold text-gray-900">{formatBRL(finance.taxa)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Seu repasse</p>
                  <p className="font-semibold text-emerald-700">{formatBRL(finance.repasse)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="size-4" /> {c.duplas.length} duplas inscritas
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                {AREAS_DE_GESTAO.map((label) => (
                  <span key={label} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        🚧 Credenciamento, camisas, comunicação e destaque pago ainda são só visuais — ficam
        funcionais conforme o Supabase/Asaas forem ligados (Fase 1 do ftv.md).
      </p>
    </div>
  );
}
