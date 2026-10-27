import { BriefcaseBusiness } from "lucide-react";
import { ServiceUnlocksBoard } from "@/components/evolution/ServiceUnlocksBoard";
import { getEvolutionData } from "@/lib/evolution/queries";
import { setRoadmapTask } from "../../actions";

export const dynamic = "force-dynamic";

export default async function DataScienceServicesPage() {
  const data = await getEvolutionData();
  return <main className="evo-page">
    <header className="evo-page-header">
      <div><p className="evo-eyebrow">ROTA PARA PRESTAR SERVIÇOS</p><h1>Serviços desbloqueados</h1><p>Veja quando o estudo já virou uma entrega que você consegue demonstrar, delimitar e oferecer com segurança.</p></div>
      <BriefcaseBusiness size={28} />
    </header>
    <ServiceUnlocksBoard roadmap={data.roadmap} initialCompleted={[...data.roadmapProgress]} onToggle={setRoadmapTask} />
  </main>;
}
