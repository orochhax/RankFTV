import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Clapperboard,
  Compass,
  Laptop,
  Library,
  MapPin,
  Palmtree,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { CarlosRochaOutlierRank } from "./CarlosRochaOutlierRank";
import { getCarlosRochaLibrary } from "@/lib/evolution/carlos-rocha-library";

const principles = [
  ["Jornada com missão", "Documentar a busca pela primeira vaga em Dados, projetos e decisões reais — sem fingir que o resultado já chegou."],
  ["Prática acima da teoria", "Mostrar o que foi construído, onde travou, o que mudou e o que vale repetir."],
  ["Experiências que têm história", "Viagens, eventos e mudanças entram quando existe um caminho, uma escolha ou uma descoberta para compartilhar."],
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

const categoryIcons = {
  tecnologia_dados: Laptop,
  viagens_vlogs: Palmtree,
  rotina_estilo_vida: Activity,
  carreira_negocios: BriefcaseBusiness,
} as const;

export function CarlosRochaCenter({ page }: { page: "overview" | "competitors" | "library" | "opportunities" }) {
  const library = getCarlosRochaLibrary();
  const totalIdeas = library.categories.reduce((acc, cat) => acc + cat.ideas.length, 0);

  const titles = {
    overview: ["CANAL PESSOAL", "Uma vida em construção, com algo real para mostrar."],
    competitors: ["CONCORRENTES", "Referências para aprender o formato — nunca para copiar a vida de alguém."],
    library: ["BIBLIOTECA DE IDEIAS", "Hub de recomendação de vídeos acionáveis, ranqueados por prioridade e viabilidade."],
    opportunities: ["OPORTUNIDADES", "Pautas validadas e prontas para gravação a partir de sinais reais."],
  } as const;
  const [eyebrow, title] = titles[page];

  return <main className="evo-page evo-intel-page">
    <header className="evo-page-header">
      <div>
        <p className="evo-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>Central privada do canal Carlos Rocha. Independente do Rocha Tech e orientada por evidência, contexto e autoria.</p>
      </div>
      <Clapperboard size={32} />
    </header>

    {page === "overview" ? <>
      <section className="evo-intel-hero">
        <div className="evo-intel-icon"><Compass size={21} /></div>
        <div>
          <p className="evo-eyebrow">DIREÇÃO EDITORIAL</p>
          <h2>Dados, prática e experiências vividas.</h2>
          <p>O canal começa pela sua jornada de Ciência de Dados e primeira vaga, com espaço para projetos, bastidores e experiências que tenham uma história verdadeira.</p>
        </div>
        <span className="evo-intel-status">Em produção</span>
      </section>
      <section className="evo-intel-grid">
        {principles.map(([heading, body], index) => (
          <article className="evo-panel" key={heading}>
            <div className="evo-panel-heading">
              <div>
                <p className="evo-eyebrow">PILAR {index + 1}</p>
                <h2>{heading}</h2>
                <p>{body}</p>
              </div>
              {index === 0 ? <BriefcaseBusiness size={19} /> : index === 1 ? <Sparkles size={19} /> : <MapPin size={19} />}
            </div>
          </article>
        ))}
      </section>
      <section className="evo-section">
        <div className="evo-section-heading">
          <div><p className="evo-eyebrow">ESTADO DA CENTRAL</p><h2>Recursos ativos em produção</h2></div>
        </div>
        <div className="evo-intel-checklist">
          <li><UsersRound size={16} />14 concorrentes e 1.518 vídeos públicos analisados na janela de 365 dias.</li>
          <li><Sparkles size={16} />Ranking dos 15 vídeos fora da curva ativo via snapshot local seguro.</li>
          <li><Library size={16} />{totalIdeas} ideias de vídeos estruturadas na Biblioteca por categorias estratégicas.</li>
          <li><Compass size={16} />{opportunities.length} oportunidades imediatas mapeadas e prontas para gravação.</li>
        </div>
      </section>
    </> : null}

    {page === "competitors" ? <>
      <section className="evo-section">
        <div className="evo-section-heading">
          <div>
            <p className="evo-eyebrow">BASE COLETADA</p>
            <h2>14 canais acompanhados</h2>
            <p>Vídeos públicos dos últimos 12 meses, títulos, datas, visualizações e thumbnails foram coletados localmente via YouTube Data API. A base completa não é enviada ao site.</p>
          </div>
        </div>
        <div className="evo-intel-rank-guide">
          <strong>Leitura editorial</strong>
          <span>O padrão mais útil não é “rotina perfeita”: é uma pessoa com objetivo concreto, processo visível, obstáculo real e uma conclusão que o público consegue levar para a própria vida.</span>
        </div>
        <div className="evo-intel-checklist">
          <li><UsersRound size={16} />Jornadas profissionais e projetos públicos.</li>
          <li><Clapperboard size={16} />Bastidores, decisões e acesso a um processo real.</li>
          <li><Sparkles size={16} />Teses pessoais somente quando sustentadas por experiência.</li>
        </div>
      </section>
      <CarlosRochaOutlierRank />
    </> : null}

    {page === "library" ? <>
      <section className="evo-intel-hero">
        <div className="evo-intel-icon"><Library size={21} /></div>
        <div>
          <p className="evo-eyebrow">HUB ACIONÁVEL DE VÍDEOS</p>
          <h2>Ideias estruturadas por pilares reais e ordenadas por score</h2>
          <p>Recomendações práticas prontas para gravação, baseadas na engenharia reversa dos concorrentes fora da curva e adaptadas à sua viabilidade logística na Bahia.</p>
        </div>
        <span className="evo-intel-status">{totalIdeas} ideias ativas</span>
      </section>

      {/* Regra de Ouro e Filtros Logísticos */}
      <section className="evo-panel" style={{ marginTop: "20px", background: "linear-gradient(135deg, #f8fafc, #ffffff)", border: "1px solid #cbd5e1" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--evo-blue)", fontWeight: 800, marginBottom: "4px" }}>
              <TrendingUp size={16} />
              <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Regra de Ouro: Versionamento Cumulativo</span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.55" }}>
              As ideias nunca são apagadas do zero. A pontuação (0 a 100) evolui dinamicamente a cada nova coleta. Uma ideia só é descartada se a nota cair <strong>abaixo de 50</strong>.
            </p>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#059669", fontWeight: 800, marginBottom: "4px" }}>
              <MapPin size={16} />
              <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Filtro de Viabilidade Logística</span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.55" }}>
              <strong>Base:</strong> Eunápolis (estúdio/quarto e corridas). <strong>Fins de semana:</strong> Porto Seguro, Arraial d&apos;Ajuda e Ecoparque. <strong>Planejamento futuro:</strong> Itacaré (março/2027).
            </p>
          </div>
        </div>
      </section>

      {/* Navegação Rápida entre Categorias */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "24px" }}>
        {library.categories.map((cat) => {
          const Icon = categoryIcons[cat.id as keyof typeof categoryIcons] || Sparkles;
          return (
            <a
              href={`#${cat.id}`}
              key={cat.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "999px",
                background: "#ffffff",
                border: "1px solid var(--evo-line)",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--evo-text)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              }}
            >
              <Icon size={14} color="var(--evo-blue)" />
              <span>{cat.name}</span>
              <span style={{ background: "#f1f5f9", padding: "2px 7px", borderRadius: "999px", fontSize: "10px", color: "var(--evo-muted)" }}>
                {cat.ideas.length}
              </span>
            </a>
          );
        })}
      </div>

      {/* Categorias Principais */}
      {library.categories.map((category) => {
        const Icon = categoryIcons[category.id as keyof typeof categoryIcons] || Sparkles;
        return (
          <section className="evo-section" key={category.id} id={category.id}>
            <div className="evo-section-heading">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ display: "inline-flex", padding: "6px", borderRadius: "8px", background: "var(--evo-blue-soft)", color: "var(--evo-blue)" }}>
                    <Icon size={20} />
                  </span>
                  <p className="evo-eyebrow" style={{ margin: 0 }}>PILAR EDITORIAL</p>
                </div>
                <h2>{category.name}</h2>
                <p style={{ textAlign: "left", marginTop: "4px" }}>{category.description}</p>
              </div>
              <span className="evo-pill">{category.ideas.length} opções ranqueadas</span>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
              {category.ideas.map((idea, index) => {
                const priorityLabel = idea.score >= 90 ? "Prioridade Máxima" : idea.score >= 80 ? "Alta Prioridade" : "Forte Potencial";
                const badgeBg = idea.score >= 90 ? "#ecfdf5" : idea.score >= 80 ? "#eff6ff" : "#fffbeb";
                const badgeColor = idea.score >= 90 ? "#059669" : idea.score >= 80 ? "#2563eb" : "#d97706";

                return (
                  <article className="evo-panel" key={idea.id} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 850, fontSize: "14px", color: "var(--evo-blue)" }}>#{index + 1}</span>
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "999px", background: "#f1f5f9", color: "#475569" }}>
                          {category.name}
                        </span>
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 11px", borderRadius: "999px", background: badgeBg, color: badgeColor, fontWeight: 800, fontSize: "12px" }}>
                        <Sparkles size={14} />
                        <span>Score: {idea.score} / 100</span>
                        <span style={{ opacity: 0.75, fontWeight: 600 }}>• {priorityLabel}</span>
                      </div>
                    </div>

                    <h3 style={{ margin: 0, fontSize: "19px", lineHeight: "1.35", letterSpacing: "-0.02em", color: "var(--evo-ink)", fontWeight: 750 }}>
                      {idea.title}
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "12px", fontSize: "12px", lineHeight: "1.55" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--evo-blue)", fontWeight: 750, marginBottom: "3px" }}>
                          <MapPin size={14} />
                          <span>Cenário & Logística</span>
                        </div>
                        <p style={{ margin: 0, color: "#334155" }}>{idea.scenario}</p>
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#0f766e", fontWeight: 750, marginBottom: "3px" }}>
                          <Target size={14} />
                          <span>Premissa & Gancho</span>
                        </div>
                        <p style={{ margin: 0, color: "#334155" }}>{idea.premise}</p>
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#b45309", fontWeight: 750, marginBottom: "3px" }}>
                          <ShieldAlert size={14} />
                          <span>Tensão / Conflito</span>
                        </div>
                        <p style={{ margin: 0, color: "#334155" }}>{idea.tension}</p>
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#4338ca", fontWeight: 750, marginBottom: "3px" }}>
                          <Clapperboard size={14} />
                          <span>O que Mostrar (Visual)</span>
                        </div>
                        <p style={{ margin: 0, color: "#334155" }}>{idea.visual}</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid var(--evo-line)", fontSize: "11px", color: "var(--evo-muted)" }}>
                      <span><strong>Sinal do Concorrente:</strong> {idea.competitorReference}</span>
                      <span><strong>Execução (CLT):</strong> {idea.executionTip}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </> : null}

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
