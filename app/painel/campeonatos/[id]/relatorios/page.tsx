import { notFound } from "next/navigation";
import { BadgeDollarSign, Download, ListChecks, Tags, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";

const REPORTS = [
  { type: "vendas", label: "Vendas", description: "Status, valores, formas de pagamento e datas.", icon: Ticket },
  { type: "presenca", label: "Presença", description: "Totais agregados de presentes e pendentes.", icon: ListChecks },
  { type: "categorias", label: "Categorias", description: "Inscrições e receita por categoria, sem dados pessoais.", icon: Tags },
  { type: "repasses", label: "Repasses", description: "Valores e estados operacionais dos repasses.", icon: BadgeDollarSign },
];

export default async function ChampionshipReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: { user } }, championship] = await Promise.all([supabase.auth.getUser(), getDbChampionshipById(id)]);
  if (!user || !championship || championship.organizadorId !== user.id) notFound();
  return <PageContainer width="form" className="space-y-6 py-8"><div><h2 className="text-xl font-semibold text-gray-900">Relatórios exportáveis</h2><p className="text-sm text-gray-500">Arquivos CSV agregados, prontos para planilha e sem nome, CPF, e-mail ou telefone dos atletas.</p></div><div className="grid gap-3 sm:grid-cols-2">{REPORTS.map(({ type, label, description, icon: Icon }) => <a key={type} href={`/api/campeonatos/${id}/relatorios/${type}`} className="rounded-2xl bg-white p-5 ring-1 ring-black/5 hover:ring-blue-200"><Icon className="size-5 text-blue-600" /><h3 className="mt-3 font-semibold text-gray-900">{label}</h3><p className="mt-1 text-xs text-gray-500">{description}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600"><Download className="size-4" />Baixar CSV</span></a>)}</div></PageContainer>;
}
