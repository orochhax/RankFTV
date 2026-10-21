import { AlertCircle, CheckCircle2, ChevronDown, Trophy } from "lucide-react";
import { getEvolutionData } from "@/lib/evolution/queries";

export const dynamic = "force-dynamic";

export default async function RankFtvPage() {
  const { rank } = await getEvolutionData();
  const groups = { P0: rank.items.filter((item) => item.priority === "P0"), P1: rank.items.filter((item) => item.priority === "P1"), P2: rank.items.filter((item) => item.priority === "P2") };
  return <main className="evo-page">
    <header className="evo-page-header"><div><p className="evo-eyebrow">VISÃO NÃO TÉCNICA</p><h1>RankFTV</h1><p>Um retrato claro do que falta para a V1. Esta página não entra no score da sua evolução pessoal.</p></div><Trophy size={28} /></header>
    <section className="evo-rank-hero"><div className="evo-rank-percent"><strong>{rank.progress.percent}%</strong><span>concluído</span></div><div><h2>{rank.progress.completed} de {rank.progress.total} marcos P0 concluídos</h2><p>Restam {rank.progress.remaining} marcos atômicos. A lista abaixo resume as entradas acionáveis que ainda estão abertas.</p><div className="evo-progress is-large"><span style={{ width: `${rank.progress.percent}%` }} /></div></div></section>
    <section className="evo-rank-list"><div className="evo-rank-priority"><header><span className="is-p0"><AlertCircle size={18} /></span><div><h2>P0 · Antes de pagamentos reais</h2><p>O que bloqueia a abertura segura da plataforma.</p></div><strong>{groups.P0.length}</strong></header>{groups.P0.map((item) => <article key={item.id}><CheckCircle2 size={18} /><div><h3>{item.title}</h3><p>{item.summary}</p></div></article>)}</div>{(["P1", "P2"] as const).map((priority) => <details key={priority} className="evo-rank-collapsed"><summary><span>{priority}</span><div><strong>{priority === "P1" ? "Depois do lançamento" : "Evolução futura"}</strong><small>{groups[priority].length} itens</small></div><ChevronDown /></summary><div>{groups[priority].map((item) => <article key={item.id}><h3>{item.title}</h3><p>{item.summary}</p></article>)}</div></details>)}</section>
    <p className="evo-source-note">Fonte sincronizada manualmente de <code>{rank.sourcePath}</code>. Atualizada em {rank.updatedAt ?? "data não identificada"}.</p>
  </main>;
}
