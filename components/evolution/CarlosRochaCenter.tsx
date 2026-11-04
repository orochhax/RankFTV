import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Clapperboard, Compass, Library, MapPin, Sparkles, UsersRound } from "lucide-react";
import { CarlosRochaOutlierRank } from "./CarlosRochaOutlierRank";

const principles = [
  ["Jornada com missão", "Documentar a busca pela primeira vaga em Dados, projetos e decisões reais — sem fingir que o resultado já chegou."],
  ["Prática acima da teoria", "Mostrar o que foi construído, onde travou, o que mudou e o que vale repetir."],
  ["Experiências que têm história", "Viagens, eventos e mudanças entram quando existe um caminho, uma escolha ou uma descoberta para compartilhar."],
];

const ideas = [
  ["Investigar antes de decidir", "Analisar várias vagas de Dados para criar um roadmap que faça sentido para o mercado e para o seu momento."],
  ["Mostrar o resultado depois da tentativa", "Mudanças no YouTube, projetos e decisões só viram vídeo depois que houver algo verdadeiro para contar."],
  ["Viver primeiro, registrar depois", "Viagens e experiências entram pela história, pelos lugares e pelo que ficou — nunca como vlog sem propósito."],
  ["Construir sem personagem", "Opinião nasce da experiência própria. Sem autoridade inventada, rotina perfeita ou promessa que você não pode cumprir."],
];

const opportunities = [
  {
    title: "Tenho 60 dias úteis para aprender Ciência de Dados: o que realmente dá pra aprender e o que é ilusão",
    pillar: "JORNADA PROFISSIONAL / DATA SCIENCE",
    tension: "É possível construir uma base profissional de dados em 60 dias ou estou me iludindo?",
    visual: "Painel de estudos, cronograma real no calendário, matriz de matérias cortadas e código aplicado.",
    conclusion: "60 dias não criam um especialista sênior, mas tiram da inércia, geram projetos reais e mostram o que o mercado de fato cobra.",
  },
  {
    title: "Analisei dezenas de vagas de Dados para descobrir o que o mercado realmente pede (e parei de estudar o resto)",
    pillar: "JORNADA PROFISSIONAL / PRAGMATISMO",
    tension: "O tempo de estudo está alinhado com o que as empresas de fato contratam?",
    visual: "Vagas abertas na tela, quadro comparativo de requisitos (SQL e limpeza vs hype) e roadmap podado.",
    conclusion: "O mercado é muito mais básico e pragmático do que a internet vende. O básico bem feito dá muito mais segurança.",
  },
  {
    title: "Se você sente que começou tarde na tecnologia, esse vídeo é pra você",
    pillar: "AUTENTICIDADE E CARREIRA",
    tension: "Ainda vale a pena começar do zero quando parece que todo mundo já saiu na frente?",
    visual: "Ambiente real de trabalho, anotações de estudo, métricas e momentos de dúvida.",
    conclusion: "Comparação paralisa; consistência em um plano imperfeito traz mais resultado do que esperar a hora ideal.",
  },
];

export function CarlosRochaCenter({ page }: { page: "overview" | "competitors" | "library" | "opportunities" }) {
  const titles = {
    overview: ["CANAL PESSOAL", "Uma vida em construção, com algo real para mostrar."],
    competitors: ["CONCORRENTES", "Referências para aprender o formato — nunca para copiar a vida de alguém."],
    library: ["BIBLIOTECA", "Ideias que nascem da sua jornada, não de uma fórmula genérica."],
    opportunities: ["OPORTUNIDADES", "Pautas validadas e prontas para gravação a partir de sinais reais."],
  } as const;
  const [eyebrow, title] = titles[page];

  return <main className="evo-page evo-intel-page">
    <header className="evo-page-header">
      <div><p className="evo-eyebrow">{eyebrow}</p><h1>{title}</h1><p>Central privada do canal Carlos Rocha. Independente do Rocha Tech e orientada por evidência, contexto e autoria.</p></div>
      <Clapperboard size={32} />
    </header>

    {page === "overview" ? <>
      <section className="evo-intel-hero"><div className="evo-intel-icon"><Compass size={21} /></div><div><p className="evo-eyebrow">DIREÇÃO EDITORIAL</p><h2>Dados, prática e experiências vividas.</h2><p>O canal começa pela sua jornada de Ciência de Dados e primeira vaga, com espaço para projetos, bastidores e experiências que tenham uma história verdadeira.</p></div><span className="evo-intel-status">Em produção</span></section>
      <section className="evo-intel-grid">{principles.map(([heading, body], index) => <article className="evo-panel" key={heading}><div className="evo-panel-heading"><div><p className="evo-eyebrow">PILAR {index + 1}</p><h2>{heading}</h2><p>{body}</p></div>{index === 0 ? <BriefcaseBusiness size={19} /> : index === 1 ? <Sparkles size={19} /> : <MapPin size={19} />}</div></article>)}</section>
      <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">ESTADO DA CENTRAL</p><h2>Recursos ativos em produção</h2></div></div><div className="evo-intel-checklist"><li><UsersRound size={16} />14 concorrentes e 1.518 vídeos públicos analisados na janela de 365 dias.</li><li><Sparkles size={16} />Ranking dos 15 vídeos fora da curva ativo via snapshot local seguro.</li><li><Library size={16} />Biblioteca editorial e diretrizes de criação alinhadas ao canal.</li><li><Compass size={16} />{opportunities.length} oportunidades mapeadas e prontas para gravação.</li></div></section>
    </> : null}

    {page === "competitors" ? <><section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">BASE COLETADA</p><h2>14 canais acompanhados</h2><p>Vídeos públicos dos últimos 12 meses, títulos, datas, visualizações e thumbnails foram coletados localmente via YouTube Data API. A base completa não é enviada ao site.</p></div></div><div className="evo-intel-rank-guide"><strong>Leitura editorial</strong><span>O padrão mais útil não é “rotina perfeita”: é uma pessoa com objetivo concreto, processo visível, obstáculo real e uma conclusão que o público consegue levar para a própria vida.</span></div><div className="evo-intel-checklist"><li><UsersRound size={16} />Jornadas profissionais e projetos públicos.</li><li><Clapperboard size={16} />Bastidores, decisões e acesso a um processo real.</li><li><Sparkles size={16} />Teses pessoais somente quando sustentadas por experiência.</li></div></section><CarlosRochaOutlierRank /></> : null}

    {page === "library" ? <><section className="evo-intel-hero"><div className="evo-intel-icon"><Compass size={21} /></div><div><p className="evo-eyebrow">NORTE EDITORIAL</p><h2>Uma vida em construção, com algo real para mostrar.</h2><p>O público fica pela sua visão e vivência: não por uma aula técnica, um personagem ou uma rotina que finge ser universal.</p></div><span className="evo-intel-status">Autoria primeiro</span></section><section className="evo-intel-grid"><article className="evo-panel"><div className="evo-panel-heading"><div><p className="evo-eyebrow">O QUE ENTRA</p><h2>História com objetivo</h2><p>Uma tentativa, experiência, mudança, decisão ou resultado real que tenha começo, tensão, algo visual e conclusão honesta.</p></div><Sparkles size={19} /></div></article><article className="evo-panel"><div className="evo-panel-heading"><div><p className="evo-eyebrow">O QUE NÃO PAUTA</p><h2>Sem conteúdo por obrigação</h2><p>Tutorial técnico sem demanda, desafio inventado, rotina perfeita, autoridade emprestada ou vlog sem uma história para contar.</p></div><Compass size={19} /></div></article></section><section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">CAMINHOS APROVADOS</p><h2>Ideias que respeitam o seu jeito de criar.</h2><p>Títulos e recortes finais só são fechados quando existir a experiência concreta para mostrar.</p></div></div><div className="evo-intel-grid">{ideas.map(([heading, body]) => <article className="evo-panel" key={heading}><div className="evo-panel-heading"><div><h2>{heading}</h2><p>{body}</p></div><Sparkles size={19} /></div></article>)}</div></section></> : null}

    {page === "opportunities" ? <section className="evo-section">
      <div className="evo-section-heading">
        <div>
          <p className="evo-eyebrow">OPORTUNIDADES IDENTIFICADAS</p>
          <h2>Pautas geradas e validadas para gravação</h2>
          <p>Ideias formuladas cruzando o sinal dos maiores outliers do mercado com a sua jornada real atual.</p>
        </div>
      </div>
      <div className="evo-intel-grid">
        {opportunities.map((item) => (
          <article className="evo-panel" key={item.title}>
            <div className="evo-panel-heading">
              <div>
                <p className="evo-eyebrow">{item.pillar}</p>
                <h2>{item.title}</h2>
                <p style={{ marginTop: "8px" }}><strong>Tensão:</strong> {item.tension}</p>
                <p style={{ marginTop: "4px" }}><strong>Visual:</strong> {item.visual}</p>
                <p style={{ marginTop: "4px" }}><strong>Conclusão:</strong> {item.conclusion}</p>
              </div>
              <Sparkles size={19} />
            </div>
          </article>
        ))}
      </div>
      <div style={{ marginTop: "20px" }}>
        <Link href="/admin/evolucao/carlos-rocha/biblioteca" className="yt-text-link">Abrir biblioteca editorial <ArrowRight size={15} /></Link>
      </div>
    </section> : null}
  </main>;
}
