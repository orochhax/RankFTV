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

export function CarlosRochaCenter({ page }: { page: "overview" | "competitors" | "library" | "opportunities" }) {
  const titles = {
    overview: ["CANAL PESSOAL", "Uma vida em construção, com algo real para mostrar."],
    competitors: ["CONCORRENTES", "Referências para aprender o formato — nunca para copiar a vida de alguém."],
    library: ["BIBLIOTECA", "Ideias que nascem da sua jornada, não de uma fórmula genérica."],
    opportunities: ["OPORTUNIDADES", "Eventos e decisões reais que podem virar uma boa história."],
  } as const;
  const [eyebrow, title] = titles[page];

  return <main className="evo-page evo-intel-page">
    <header className="evo-page-header">
      <div><p className="evo-eyebrow">{eyebrow}</p><h1>{title}</h1><p>Central privada do canal Carlos Rocha. Independente do Rocha Tech e orientada por evidência, contexto e autoria.</p></div>
      <Clapperboard size={32} />
    </header>

    {page === "overview" ? <>
      <section className="evo-intel-hero"><div className="evo-intel-icon"><Compass size={21} /></div><div><p className="evo-eyebrow">DIREÇÃO EDITORIAL</p><h2>Dados, prática e experiências vividas.</h2><p>O canal começa pela sua jornada de Ciência de Dados e primeira vaga, com espaço para projetos, bastidores e experiências que tenham uma história verdadeira.</p></div><span className="evo-intel-status">Em construção</span></section>
      <section className="evo-intel-grid">{principles.map(([heading, body], index) => <article className="evo-panel" key={heading}><div className="evo-panel-heading"><div><p className="evo-eyebrow">PILAR {index + 1}</p><h2>{heading}</h2><p>{body}</p></div>{index === 0 ? <BriefcaseBusiness size={19} /> : index === 1 ? <Sparkles size={19} /> : <MapPin size={19} />}</div></article>)}</section>
      <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">PRÓXIMOS PASSOS</p><h2>O que a Central já organiza</h2></div></div><div className="evo-intel-checklist"><li><UsersRound size={16} />Base própria de concorrentes e dados públicos dos últimos 12 meses.</li><li><Library size={16} />Biblioteca editorial baseada no que você aprovou no chat.</li><li><Compass size={16} />Oportunidades aprovadas ficam visíveis aqui; as sugestões continuam sendo criadas no chat.</li></div></section>
    </> : null}

    {page === "competitors" ? <><section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">BASE COLETADA</p><h2>14 canais acompanhados</h2><p>Vídeos públicos dos últimos 12 meses, títulos, datas, visualizações e thumbnails foram coletados localmente via YouTube Data API. A base completa não é enviada ao site.</p></div></div><div className="evo-intel-rank-guide"><strong>Leitura editorial</strong><span>O padrão mais útil não é “rotina perfeita”: é uma pessoa com objetivo concreto, processo visível, obstáculo real e uma conclusão que o público consegue levar para a própria vida.</span></div><div className="evo-intel-checklist"><li><UsersRound size={16} />Jornadas profissionais e projetos públicos.</li><li><Clapperboard size={16} />Bastidores, decisões e acesso a um processo real.</li><li><Sparkles size={16} />Teses pessoais somente quando sustentadas por experiência.</li></div></section><CarlosRochaOutlierRank /></> : null}

    {page === "library" ? <><section className="evo-intel-hero"><div className="evo-intel-icon"><Compass size={21} /></div><div><p className="evo-eyebrow">NORTE EDITORIAL</p><h2>Uma vida em construção, com algo real para mostrar.</h2><p>O público fica pela sua visão e vivência: não por uma aula técnica, um personagem ou uma rotina que finge ser universal.</p></div><span className="evo-intel-status">Autoria primeiro</span></section><section className="evo-intel-grid"><article className="evo-panel"><div className="evo-panel-heading"><div><p className="evo-eyebrow">O QUE ENTRA</p><h2>História com objetivo</h2><p>Uma tentativa, experiência, mudança, decisão ou resultado real que tenha começo, tensão, algo visual e conclusão honesta.</p></div><Sparkles size={19} /></div></article><article className="evo-panel"><div className="evo-panel-heading"><div><p className="evo-eyebrow">O QUE NÃO PAUTA</p><h2>Sem conteúdo por obrigação</h2><p>Tutorial técnico sem demanda, desafio inventado, rotina perfeita, autoridade emprestada ou vlog sem uma história para contar.</p></div><Compass size={19} /></div></article></section><section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">CAMINHOS APROVADOS</p><h2>Ideias que respeitam o seu jeito de criar.</h2><p>Títulos e recortes finais só são fechados quando existir a experiência concreta para mostrar.</p></div></div><div className="evo-intel-grid">{ideas.map(([heading, body]) => <article className="evo-panel" key={heading}><div className="evo-panel-heading"><div><h2>{heading}</h2><p>{body}</p></div><Sparkles size={19} /></div></article>)}</div></section></> : null}

    {page === "opportunities" ? <section className="evo-section"><div className="evo-section-heading"><div><p className="evo-eyebrow">APROVAÇÃO PELO CHAT</p><h2>Nenhuma oportunidade foi publicada ainda.</h2><p>Você me conta um evento, uma decisão ou um projeto por aqui. Eu transformo em possibilidade de vídeo e, só depois da sua aprovação, ele aparece nesta Central.</p></div></div><Link href="/admin/evolucao/carlos-rocha/biblioteca" className="yt-text-link">Abrir biblioteca editorial <ArrowRight size={15} /></Link></section> : null}
  </main>;
}
