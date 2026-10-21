import { Camera, Dumbbell, PackageCheck, Scale, Target } from "lucide-react";
import { addEquipment, saveFollowers, saveShapeSettings, saveTraining, saveWeight, toggleEquipment } from "../actions";
import { getEvolutionData } from "@/lib/evolution/queries";

export const dynamic = "force-dynamic";

const bodyParts = ["Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Pernas", "Glúteos", "Abdômen"];

// eslint-disable-next-line complexity
export default async function InstaShapePage() {
  const data = await getEvolutionData();
  const followers = Number(data.followers[0]?.followers ?? 26);
  const target = Number(data.settings.follower_target ?? 500);
  const progress = Math.min(100, Math.round((followers / Math.max(1, target)) * 100));
  const currentWeight = data.weights[0]?.weight_kg ?? data.settings.current_weight_kg ?? "";

  return <main className="evo-page">
    <header className="evo-page-header"><div><p className="evo-eyebrow">PRESENÇA E SAÚDE</p><h1>Insta / Shape</h1><p>O Hevy continua cuidando do treino. Aqui entram somente a confirmação, a parte do corpo, peso e evolução de seguidores.</p></div><Dumbbell size={28} /></header>
    <section className="evo-stat-row">
      <article><Camera /><div><span>Seguidores</span><strong>{followers} <small>/ {target}</small></strong></div></article>
      <article><Dumbbell /><div><span>Treinos nesta semana</span><strong>{data.training.length} <small>/ 6 esperados</small></strong></div></article>
      <article><Scale /><div><span>Peso atual</span><strong>{currentWeight || "—"} <small>{currentWeight ? "kg" : "sem registro"}</small></strong></div></article>
    </section>
    <section className="evo-dashboard-grid">
      <article className="evo-panel">
        <div className="evo-panel-heading"><div><p className="evo-eyebrow">TREINO DE HOJE</p><h2>Confirmar no Hevy</h2></div><Dumbbell /></div>
        <form action={saveTraining} className="evo-stack-form"><input type="hidden" name="date" value={data.today} /><fieldset><legend>Partes treinadas</legend><div className="evo-chip-options">{bodyParts.map((part) => <label key={part}><input type="checkbox" name="bodyParts" value={part} /><span>{part}</span></label>)}</div></fieldset><button type="submit">Registrar treino de hoje</button></form>
      </article>
      <article className="evo-panel">
        <div className="evo-panel-heading"><div><p className="evo-eyebrow">PESO SEMANAL</p><h2>Registrar pesagem</h2></div><Scale /></div>
        <form action={saveWeight} className="evo-stack-form"><label>Data<input type="date" name="date" defaultValue={data.today} required /></label><label>Peso atual (kg)<input type="number" name="weight" min="20" max="500" step="0.1" defaultValue={currentWeight} required /></label><button type="submit">Salvar pesagem</button></form>
      </article>
      <article className="evo-panel evo-social-detail">
        <div className="evo-panel-heading"><div><p className="evo-eyebrow">META DE SEGUIDORES</p><h2>@rochhaexp</h2></div><Target /></div>
        <strong>{followers}</strong><div className="evo-progress is-large"><span style={{ width: `${progress}%` }} /></div><p>{target - followers > 0 ? `${target - followers} seguidores faltando` : "Meta alcançada"} · prazo 30/06/2027</p>
        <form action={saveFollowers} className="evo-inline-form"><input type="hidden" name="date" value={data.today} /><label>Valor atual<input type="number" name="followers" min="0" defaultValue={followers} /></label><button type="submit">Atualizar</button></form>
      </article>
      <article className="evo-panel">
        <div className="evo-panel-heading"><div><p className="evo-eyebrow">CONFIGURAÇÃO</p><h2>Metas pessoais</h2></div><Target /></div>
        <form action={saveShapeSettings} className="evo-stack-form"><label>Meta de seguidores<input type="number" name="followerTarget" min="0" defaultValue={target} /></label><div className="evo-two-fields"><label>Peso atual<input type="number" name="currentWeight" step="0.1" defaultValue={data.settings.current_weight_kg ?? ""} /></label><label>Peso meta<input type="number" name="goalWeight" step="0.1" defaultValue={data.settings.goal_weight_kg ?? ""} /></label></div><button type="submit">Salvar metas</button></form>
      </article>
    </section>
    <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">ACADEMIA</p><h2>Equipamentos para comprar</h2></div><p>Somente nome, prioridade e compra concluída.</p></div><div className="evo-panel"><form action={addEquipment} className="evo-equipment-form"><input name="name" placeholder="Nome do equipamento" maxLength={120} required /><select name="priority" defaultValue="medium"><option value="high">Alta prioridade</option><option value="medium">Média prioridade</option><option value="low">Baixa prioridade</option></select><button type="submit">Adicionar</button></form><div className="evo-equipment-list">{data.equipment.length ? data.equipment.map((item) => <form action={toggleEquipment} key={item.id} className={item.purchased_at ? "is-bought" : ""}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="purchased" value={item.purchased_at ? "false" : "true"} /><button type="submit" aria-label={item.purchased_at ? "Desmarcar compra" : "Marcar como comprado"}><PackageCheck size={18} /></button><strong>{item.name}</strong><span className={`evo-priority is-${item.priority}`}>{item.priority === "high" ? "Alta" : item.priority === "low" ? "Baixa" : "Média"}</span></form>) : <p className="evo-empty-copy">Nenhum equipamento cadastrado.</p>}</div></div></section>
  </main>;
}
