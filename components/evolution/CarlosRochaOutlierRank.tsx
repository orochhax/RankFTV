import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck } from "lucide-react";
import { getCarlosRochaOutlierRank } from "@/lib/evolution/carlos-rocha-rank";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const views = (value: number) => value >= 1_000_000 ? `${number.format(value / 1_000_000)} mi` : value >= 1_000 ? `${number.format(value / 1_000)} mil` : number.format(value);

export async function CarlosRochaOutlierRank() {
  const data = await getCarlosRochaOutlierRank();
  return <section className="evo-section evo-intel-videos">
    <div className="evo-section-heading"><div><p className="evo-eyebrow">VÍDEOS FORA DA CURVA</p><h2>15 referências que superaram o próprio canal</h2><p>{data.videos} vídeos públicos observados em {data.channels} canais. Cada item é comparado à mediana do respectivo criador.</p></div><BarChart3 size={20} /></div>
    <div className="evo-intel-rank-guide"><strong>Como ler</strong><span>O multiplicador mostra desempenho público relativo, não prova causalidade. Título e thumbnail ficam disponíveis para estudo; o rank não favorece tecnologia, tutorial ou qualquer tema.</span></div>
    <div className="evo-intel-video-grid">{data.topVideos.map((video, index) => <article key={video.id}>
      <div className="evo-intel-thumb"><Image src={`/api/admin/carlos-rocha/thumbnail?video=${encodeURIComponent(video.id)}`} alt={`Thumbnail de ${video.title}`} width={640} height={360} unoptimized /><span className="evo-intel-position">#{index + 1}</span><span className="evo-intel-score"><strong>{number.format(video.relativePerformanceMultiple)}×</strong><small>mediana</small></span></div>
      <div className="evo-intel-video-copy"><div className="evo-intel-video-meta"><small>{video.channel}</small><span>Fora da curva</span></div><h3>{video.title}</h3><div className="evo-intel-signal-row"><span>{views(video.views)} views</span>{video.likes != null ? <span>{views(video.likes)} likes</span> : null}<span>mediana: {views(video.channelMedianViews)}</span></div><p className="evo-intel-rationale">Fato observado: teve {number.format(video.relativePerformanceMultiple)}× as visualizações da mediana pública do canal.</p><footer><span>{video.publishedAt || "data não informada"}</span><Link href={video.url} target="_blank" rel="noreferrer">Ver vídeo <ArrowRight size={12} /></Link></footer></div>
    </article>)}</div>
    <section className="evo-intel-note"><ShieldCheck size={18} /><div><strong>Limite da leitura</strong><p>Views públicas não revelam impressões, CTR, retenção, origem de tráfego ou receita. O ranking mostra o que vale investigar, não uma fórmula de sucesso.</p></div></section>
  </section>;
}
