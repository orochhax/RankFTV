import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Database,
  Eye,
  FlaskConical,
  Lightbulb,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  formatEditorialDuration,
  formatEditorialMultiple,
  formatEditorialViews,
  getEditorialIntelligence,
} from "@/lib/evolution/intelligence";

const dateLabel = (value: string | null) => value
  ? new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value))
  : "sem data";

export async function EditorialIntelligence() {
  const data = await getEditorialIntelligence();
  const topTopic = data.topics[0];

  return (
    <main className="evo-page evo-intel-page">
      <header className="evo-page-header">
        <div>
          <p className="evo-eyebrow">INTELIGÊNCIA EDITORIAL</p>
          <h1>O que o mercado está ensinando.</h1>
          <p>Uma camada de análise para comparar canais, encontrar padrões e transformar evidência em pauta para Carlos Rocha.</p>
        </div>
        <BrainCircuit size={32} />
      </header>

      <section className="evo-intel-hero">
        <div className="evo-intel-icon"><BrainCircuit size={21} /></div>
        <div>
          <p className="evo-eyebrow">BASE DE CONCORRENTES</p>
          <h2>{data.stats.videos ? `${data.stats.videos} vídeos observados em ${data.stats.channels} canais` : "Aguardando a base de concorrentes"}</h2>
          <p>Os números são sinais públicos observados no cofre, não promessa de desempenho futuro. A nota compara cada vídeo com o contexto do próprio canal.</p>
        </div>
        <span className="evo-intel-status"><CheckCircle2 size={15} /> Snapshot local</span>
      </section>

      <section className="evo-intel-metrics">
        <article><Users size={17} /><span>Canais</span><strong>{data.stats.channels}</strong><small>concorrentes acompanhados</small></article>
        <article><Database size={17} /><span>Vídeos</span><strong>{data.stats.videos}</strong><small>na janela coletada</small></article>
        <article><Eye size={17} /><span>Média de views</span><strong>{formatEditorialViews(Math.round(data.stats.averageViews))}</strong><small>{data.stats.withViews} com view pública</small></article>
        <article><Lightbulb size={17} /><span>Sinal principal</span><strong>{topTopic?.label ?? "—"}</strong><small>{topTopic ? `${topTopic.count} vídeos associados` : "sem dados suficientes"}</small></article>
      </section>

      <section className="evo-intel-grid">
        <article className="evo-panel">
          <div className="evo-panel-heading">
            <div>
              <p className="evo-eyebrow">SINAIS DE PAUTA</p>
              <h2>Temas que aparecem na base</h2>
              <p>Frequência e média de views são pistas editoriais, não causalidade.</p>
            </div>
            <BarChart3 size={19} />
          </div>
          <div className="evo-signal-list">
            {data.topics.map((topic) => (
              <div key={topic.label}>
                <span><strong>{topic.label}</strong><small>{topic.count} vídeos encontrados</small></span>
                <b>{formatEditorialViews(Math.round(topic.averageViews))}<small> média</small></b>
              </div>
            ))}
          </div>
        </article>

        <article className="evo-panel">
          <div className="evo-panel-heading">
            <div>
              <p className="evo-eyebrow">PRÓXIMA CAMADA</p>
              <h2>O que falta para prever melhor</h2>
              <p>A análise fica mais confiável quando seus próprios resultados entram na mesma linha do tempo.</p>
            </div>
            <FlaskConical size={19} />
          </div>
          <ul className="evo-intel-checklist">
            <li><CheckCircle2 size={16} />Registrar impressões, CTR, retenção e inscritos por vídeo.</li>
            <li><CheckCircle2 size={16} />Comparar vídeos pela mesma idade: 24h, 72h, 7d e 28d.</li>
            <li><ShieldCheck size={16} />Separar fato, hipótese e recomendação antes da publicação.</li>
          </ul>
          <Link href="/admin/evolucao/rocha-tech/ideias">Abrir biblioteca de ideias <ArrowRight size={15} /></Link>
        </article>
      </section>

      <section className="evo-section evo-intel-videos">
        <div className="evo-section-heading">
          <div>
            <p className="evo-eyebrow">RANKING DE OPORTUNIDADE</p>
            <h2>15 vídeos que mais vale a pena estudar</h2>
          </div>
          <p>Calculado em {dateLabel(data.observedAt)} · máximo de 3 vídeos por canal.</p>
        </div>

        <div className="evo-intel-rank-guide">
          <strong>Como a nota funciona</strong>
          <span>
            30% desempenho contra a mediana do próprio canal · 25% promessa e benefício · 15% facilidade de adaptação · 10% título e thumbnail · 10% validação em outros canais · 5% atualidade · 5% longevidade. A seleção busca 10 vídeos de IA aplicada a resultados, 4 de produtividade, carreira e sistemas e 1 notícia relevante. Podcasts e entrevistas não entram no ranking principal.
          </span>
        </div>

        <div className="evo-intel-video-grid">
          {data.topVideos.map((video, index) => (
            <article key={`${video.channel}-${video.id ?? index}`}>
              <div className="evo-intel-thumb">
                {video.thumbnailUrl || video.thumbnail ? (
                  <Image
                    src={video.thumbnailUrl ?? video.thumbnail ?? ""}
                    alt={`Thumbnail de ${video.title}`}
                    width={640}
                    height={360}
                    unoptimized
                  />
                ) : <span className="evo-intel-thumb-empty">Thumbnail indisponível</span>}
                <span className="evo-intel-position">#{index + 1}</span>
                <span className="evo-intel-score" aria-label={`Nota de oportunidade ${video.opportunityScore} de 100`}>
                  <strong>{video.opportunityScore}</strong><small>/100</small>
                </span>
              </div>
              <div className="evo-intel-video-copy">
                <div className="evo-intel-video-meta"><small>{video.channel}</small><span>{video.editorialPillarLabel}</span></div>
                <h3 title={video.originalTitle !== video.title ? `Título original: ${video.originalTitle}` : undefined}>{video.title}</h3>
                <div className="evo-intel-signal-row">
                  <span>{video.formatLabel}</span>
                  <span>{formatEditorialMultiple(video.relativePerformanceMultiple)} da mediana</span>
                </div>
                <p className="evo-intel-rationale">{video.rationale}</p>
                <details className="evo-intel-breakdown">
                  <summary>Ver composição da nota</summary>
                  <div>
                    <span>Desempenho <b>{Math.round(video.breakdown.relativePerformance)}</b></span>
                    <span>Promessa e benefício <b>{Math.round(video.breakdown.promiseBenefit)}</b></span>
                    <span>Adaptação <b>{Math.round(video.breakdown.adaptability)}</b></span>
                    <span>Embalagem <b>{Math.round(video.breakdown.packaging)}</b></span>
                    <span>Validação <b>{Math.round(video.breakdown.crossChannelValidation)}</b></span>
                    <span>Atualidade <b>{Math.round(video.breakdown.freshness)}</b></span>
                    <span>Longevidade <b>{Math.round(video.breakdown.longevity)}</b></span>
                  </div>
                </details>
                <p>{formatEditorialViews(video.views)} de visualizações · {formatEditorialDuration(video.durationSeconds)}</p>
                <footer>
                  <span>{video.publishedText ?? "data não informada"}</span>
                  {video.url ? <Link href={video.url} target="_blank" rel="noreferrer">Ver vídeo <ArrowRight size={12} /></Link> : null}
                </footer>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="evo-intel-note">
        <ShieldCheck size={18} />
        <div>
          <strong>Limite importante</strong>
          <p>A nota prioriza oportunidades editoriais, não prevê sucesso. Views públicas não revelam impressões, CTR, retenção ou inscritos ganhos.</p>
        </div>
      </section>
    </main>
  );
}
