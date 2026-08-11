import { addDays } from "@/lib/performance";

export const itCareerLevelIds = ["foundation", "junior", "mid", "senior", "specialist"] as const;
export const itCareerCurrentLevelIds = ["zero", ...itCareerLevelIds] as const;
export const itCareerLevelLabels = {
  foundation: "Fundamentos",
  junior: "Conteúdo para atuação Júnior",
  mid: "Conteúdo intermediário",
  senior: "Conteúdo avançado",
  specialist: "Especialização técnica e arquitetura",
} as const;
export const itCareerCurrentLevelLabels = {
  zero: "Estou começando do zero",
  foundation: "Já estudei os fundamentos",
  junior: "Já estudei conteúdo para atuação Júnior",
  mid: "Já estudei conteúdo intermediário",
  senior: "Já estudei conteúdo avançado",
  specialist: "Já estudei especialização técnica e arquitetura",
} as const;

export const itCareerInterestIds = [
  "football",
  "cars",
  "news",
  "technology",
  "finance",
  "investments",
  "health_wellness",
  "games",
  "education",
  "music",
  "ecommerce",
] as const;

export const itCareerInterestOptions = [
  { id: "football", label: "Futebol", description: "Partidas, times, campeonatos e desempenho esportivo." },
  { id: "cars", label: "Carros", description: "Veículos, manutenção, consumo, oficinas e frotas." },
  { id: "news", label: "Notícias", description: "Matérias, fontes, editorias, tendências e credibilidade." },
  { id: "technology", label: "Tecnologia", description: "Produtos digitais, lançamentos, incidentes e uso de software." },
  { id: "finance", label: "Finanças pessoais", description: "Orçamentos, despesas, metas e transações fictícias." },
  { id: "investments", label: "Investimentos", description: "Mercados, carteiras, risco e séries históricas inteiramente fictícias." },
  { id: "health_wellness", label: "Saúde e bem-estar", description: "Hábitos e rotinas fictícias, sem diagnóstico médico." },
  { id: "games", label: "Jogos", description: "Partidas, jogadores, progressão e desempenho em jogos." },
  { id: "education", label: "Educação", description: "Cursos, exercícios, turmas e progresso de aprendizagem." },
  { id: "music", label: "Música", description: "Faixas, artistas, playlists e hábitos de reprodução." },
  { id: "ecommerce", label: "Comércio eletrônico", description: "Produtos, pedidos, estoque e experiência de compra." },
] as const;

export type ItCareerLevelId = typeof itCareerLevelIds[number];
export type ItCareerCurrentLevelId = typeof itCareerCurrentLevelIds[number];
export type ItCareerInterestId = typeof itCareerInterestIds[number];
export type ItKnownTopicPolicy = "skip" | "validate";

export type ItCareerProjectDataField = {
  name: string;
  type: string;
  description: string;
};

export type ItCareerProjectDataEntity = {
  name: string;
  requiredFields: ItCareerProjectDataField[];
};

export type ItCareerProjectEvaluationCriterion = {
  id: string;
  label: string;
  description: string;
  weightPercent: number;
};

export type ItCareerProjectSpec = {
  schemaVersion: 1;
  blueprintId: string;
  projectKind: "module_challenge" | "capstone";
  interest: { id: ItCareerInterestId; label: string };
  projectTitle: string;
  productDefinition: string;
  problemStatement: string;
  targetAudience: string;
  functionalities: string[];
  data: {
    sourceType: "synthetic_generator" | "provided_fixture" | "public_dataset";
    sourceLabel: string;
    acquisitionInstructions: string;
    entities: ItCareerProjectDataEntity[];
    preparationRules: string[];
  };
  technicalConcepts: string[];
  mandatoryRequirements: string[];
  deliverables: string[];
  evaluationCriteria: ItCareerProjectEvaluationCriterion[];
  submissionInstructions: string[];
  implementationFreedom: string;
  outOfScope: string[];
};

type TopicSeed = readonly [title: string, subtopics: readonly [string, string, ...string[]]];
type ModuleSeed = { title: string; objective: string; topics: readonly TopicSeed[] };
type CareerSeed = {
  id: ItCareerId;
  title: string;
  description: string;
  capstoneTitle: string;
  capstoneScenario: string;
  levels: Record<ItCareerLevelId, readonly ModuleSeed[]>;
};

export type ItCareerArtifact = {
  id: string;
  title: string;
  objective: string;
  scenario: string;
  /** Requisitos explícitos que devem ser seguidos na entrega. */
  requirements: string[];
  /** Mantido como espelho temporário para os consumidores legados. */
  constraints: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  /** Instrução objetiva de onde e como entregar o projeto. */
  submissionInstructions: string;
  /** Campo legado; não deve ser apresentado como uma atividade por assunto. */
  evidence: string;
  estimatedMinutes: number;
  projectSpec: ItCareerProjectSpec;
};

export type ItCareerQuestion = {
  id: string;
  type: "multiple_choice" | "ordering";
  prompt: string;
  options: string[];
  correctOptionIndex: number | null;
  correctOrder: number[];
  explanation: string;
};

export type ItCareerDailyQuizSession = {
  id: string;
  title: string;
  topicId: string;
  moduleId: string;
  level: ItCareerLevelId;
  sessionIndex: number;
  scheduledDate: string;
  estimatedMinutes: number;
  questions: ItCareerQuestion[];
};

export type ItCareerDailyQuestionPolicy = {
  targetLevel: ItCareerLevelId;
  questionsPerStudyDay: number;
  minutesPerQuestion: number;
  minutesReservedPerStudyDay: number;
  levelBaseQuestions: number;
  timeAdjustmentQuestions: number;
  rationale: string;
};

export type ItCareerTopicTemplate = {
  id: string;
  title: string;
  subtopics: string[];
  competence: string;
  studyMinutes: number;
  estimatedMinutes: number;
  reviewMinutes: number;
};

export type ItCareerModuleTemplate = {
  id: string;
  title: string;
  objective: string;
  successCriteria: string;
  level: ItCareerLevelId;
  topics: ItCareerTopicTemplate[];
  project: ItCareerArtifact;
};

export type ItCareerCatalog = {
  schemaVersion: 4;
  id: ItCareerId;
  version: number;
  title: string;
  description: string;
  levels: Record<ItCareerLevelId, { title: string; competenceStatement: string; modules: ItCareerModuleTemplate[] }>;
  capstone: ItCareerArtifact;
};

export type ItCareerPlanSetup = {
  careerId: ItCareerId | string;
  currentLevel: ItCareerCurrentLevelId | string;
  targetLevel: ItCareerLevelId | string;
  knownTopicIds: string[];
  knownTopicPolicy: ItKnownTopicPolicy;
  /** De um a três temas; o primeiro orienta desafios e TCC. */
  interestIds: ItCareerInterestId[];
  /** Perguntas objetivas entregues por sessão de estudo. */
  includeDailyQuestions?: boolean;
  /** @deprecated: compatibilidade de rascunhos anteriores; use includeDailyQuestions. */
  includeActivities?: boolean;
  includeModuleProjects: boolean;
  /** @deprecated: não há mais avaliação separada por módulo. */
  includeAssessments?: boolean;
  includeCapstone: boolean;
  jobPreparation: boolean;
  objective?: "learning" | "first_job" | "career_change" | "current_job" | "freelance";
  applicationIntent?: "none" | "after_roadmap" | "applying_now";
  targetRole?: string;
  startDate: string;
  timelineMode: "duration" | "deadline";
  durationMonths: number;
  deadline: string;
  availableDays: string[];
  minutesPerDay: number;
};

export type ItCareerPlanTopic = ItCareerTopicTemplate & {
  code: string;
  role: "topic" | "review";
  /** Uma sessão por dia planejado deste assunto, com perguntas objetivas fixas. */
  dailyQuizzes: ItCareerDailyQuizSession[];
};

export type ItCareerPlanModule = {
  id: string;
  title: string;
  objective: string;
  successCriteria: string;
  level: ItCareerLevelId;
  levelLabel: string;
  moduleKind: "core" | "specialization" | "capstone";
  topics: ItCareerPlanTopic[];
  project: ItCareerArtifact | null;
  estimatedMinutes: number;
  /** Escopo interno para projetos/TCC; pode incluir tópicos declarados como já dominados. */
  scopeSubjects: string[];
};

export type ItCareerPlanMilestone = {
  level: ItCareerLevelId;
  levelLabel: string;
  cumulativeEstimatedMinutes: number;
  cumulativeRecommendedEstimatedMinutes: number;
  recommendedTargetDate: string;
};

export type ItCareerProfessionalMilestoneInfo = {
  firstLevel: "junior";
  firstLabel: string;
  nextLevel: ItCareerLevelId | null;
  nextLabel: string | null;
};

export type ItCareerPlan = {
  templateKey: ItCareerId;
  templateVersion: number;
  title: string;
  description: string;
  targetLevel: ItCareerLevelId;
  startDate: string;
  targetDate: string;
  recommendedTargetDate: string;
  recommendedWeeks: number;
  deadlineWarning: boolean;
  totalEstimatedMinutes: number;
  bufferMinutes: number;
  recommendedEstimatedMinutes: number;
  dailyQuestionPolicy: ItCareerDailyQuestionPolicy;
  milestones: ItCareerPlanMilestone[];
  professionalMilestone: ItCareerProfessionalMilestoneInfo;
  interests: Array<{ id: ItCareerInterestId; label: string }>;
  modules: ItCareerPlanModule[];
};

export const itCareerIds = [
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "data_analytics_bi",
  "data_science_ai",
  "data_engineering",
  "devops_cloud",
  "cybersecurity",
  "qa_automation",
  "support_infra_networks",
] as const;
export type ItCareerId = typeof itCareerIds[number];

const levelCompetence: Record<ItCareerLevelId, string> = {
  foundation: "Conteúdo para compreender o vocabulário, as ferramentas e o fluxo essencial da área.",
  junior: "Conteúdo para praticar tarefas delimitadas, testes e entregas com revisão técnica.",
  mid: "Conteúdo intermediário para diagnóstico, integração e decisões técnicas contextualizadas.",
  senior: "Conteúdo avançado sobre arquitetura, segurança, escala, confiabilidade e trade-offs.",
  specialist: "Conteúdo de especialização em plataformas, governança e otimizações sistêmicas de longo prazo.",
};

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function mod(title: string, objective: string, ...topics: TopicSeed[]): ModuleSeed {
  return { title, objective, topics };
}

type CareerInterestProfile = {
  id: ItCareerInterestId;
  label: string;
  context: string;
  targetAudience: string;
  sourceLabel: string;
  acquisitionInstructions: string;
  entities: ItCareerProjectDataEntity[];
  preparationRules: string[];
  primaryOutcome: string;
  predictiveOutcome: string;
};

const field = (name: string, type: string, description: string): ItCareerProjectDataField => ({ name, type, description });

const interestProfiles: Record<ItCareerInterestId, CareerInterestProfile> = {
  football: {
    id: "football", label: "Futebol", context: "partidas e campeonatos de futebol", targetAudience: "analistas esportivos, comissões técnicas e torcedores",
    sourceLabel: "fixture histórica de partidas de futebol",
    acquisitionInstructions: "Gere, com seed 42, ao menos 1.000 partidas fictícias em CSV ou JSON. Mantenha a ordem cronológica e use apenas nomes inventados de times e campeonatos.",
    entities: [{ name: "match", requiredFields: [field("match_id", "string", "Identificador único"), field("competition", "string", "Campeonato fictício"), field("season", "string", "Temporada"), field("played_at", "date", "Data da partida"), field("home_team", "string", "Time mandante"), field("away_team", "string", "Time visitante"), field("home_goals", "integer", "Gols do mandante"), field("away_goals", "integer", "Gols do visitante"), field("home_shots", "integer", "Finalizações do mandante"), field("away_shots", "integer", "Finalizações do visitante"), field("home_recent_points", "integer", "Pontos nas cinco partidas anteriores"), field("away_recent_points", "integer", "Pontos nas cinco partidas anteriores")]}],
    preparationRules: ["Não usar resultados futuros ao calcular a forma anterior de um time.", "Rejeitar gols, finalizações ou pontos negativos.", "Separar treino e teste pela data quando houver modelagem."],
    primaryOutcome: "comparar o desempenho recente dos times e explicar os fatores que sustentam cada resultado",
    predictiveOutcome: "calcular as probabilidades de vitória do mandante, empate e vitória do visitante, sempre somando 100% e sem apresentar o resultado como dica de aposta",
  },
  cars: {
    id: "cars", label: "Carros", context: "veículos, manutenção e consumo de uma frota fictícia", targetAudience: "motoristas, oficinas e gestores de frota",
    sourceLabel: "fixture de veículos e registros de manutenção",
    acquisitionInstructions: "Gere, com seed 42, 200 veículos fictícios e ao menos 1.000 eventos de uso/manutenção em CSV ou JSON, sem placas ou dados pessoais reais.",
    entities: [{ name: "vehicle_event", requiredFields: [field("event_id", "string", "Identificador único"), field("vehicle_id", "string", "Veículo fictício"), field("model", "string", "Modelo do veículo"), field("model_year", "integer", "Ano-modelo fictício"), field("occurred_at", "date", "Data do evento"), field("odometer_km", "number", "Quilometragem acumulada"), field("fuel_liters", "number", "Combustível abastecido"), field("cost_brl", "number", "Custo do evento"), field("event_type", "enum", "uso, abastecimento ou manutenção"), field("maintenance_category", "string|null", "Categoria da manutenção quando aplicável"), field("days_until_next_maintenance", "integer|null", "Dias até a manutenção seguinte na série histórica")]}],
    preparationRules: ["A quilometragem não pode diminuir entre eventos do mesmo veículo.", "Valores monetários, litros e dias até manutenção devem ser não negativos.", "Categoria e prazo de manutenção só podem aparecer em eventos coerentes.", "Não armazenar placa, chassi ou proprietário real."],
    primaryOutcome: "acompanhar consumo, custos e manutenção e destacar veículos que exigem atenção",
    predictiveOutcome: "estimar risco de manutenção nos próximos 30 dias e explicar quais sinais contribuíram para a estimativa",
  },
  news: {
    id: "news", label: "Notícias", context: "matérias e fontes de um portal de notícias fictício", targetAudience: "leitores, editores e analistas de conteúdo",
    sourceLabel: "fixture de matérias jornalísticas fictícias",
    acquisitionInstructions: "Gere, com seed 42, ao menos 1.000 matérias fictícias em JSON. Use textos curtos originais e fontes/editorias inventadas para evitar conteúdo protegido.",
    entities: [{ name: "article", requiredFields: [field("article_id", "string", "Identificador único"), field("published_at", "datetime", "Data e hora de publicação"), field("source", "string", "Fonte fictícia"), field("category", "string", "Editoria"), field("headline", "string", "Título original fictício"), field("summary", "string", "Resumo original fictício"), field("views", "integer", "Visualizações"), field("correction_count", "integer", "Correções publicadas")]}],
    preparationRules: ["Não copiar matérias reais nem usar texto protegido.", "Datas futuras e contagens negativas são inválidas.", "Fonte e correções devem permanecer visíveis nas análises."],
    primaryOutcome: "organizar matérias por tema, fonte e período e permitir identificar tendências e correções",
    predictiveOutcome: "classificar a editoria e estimar o interesse esperado da matéria, exibindo incerteza e sem decidir credibilidade automaticamente",
  },
  technology: {
    id: "technology", label: "Tecnologia", context: "produtos digitais, versões e incidentes de uma empresa fictícia", targetAudience: "usuários, equipes de produto e operações",
    sourceLabel: "fixture de produtos, versões, uso e incidentes",
    acquisitionInstructions: "Gere, com seed 42, 50 produtos/serviços fictícios e ao menos 1.000 eventos de uso, versão ou incidente em JSON.",
    entities: [{ name: "product_event", requiredFields: [field("event_id", "string", "Identificador único"), field("product_id", "string", "Produto fictício"), field("occurred_at", "datetime", "Instante do evento"), field("environment", "enum", "desenvolvimento, homologação ou produção fictícia"), field("event_type", "enum", "uso, release ou incidente"), field("version", "string", "Versão relacionada"), field("duration_ms", "integer", "Duração ou latência"), field("severity", "enum", "baixa, média, alta ou crítica"), field("resolved", "boolean", "Indica resolução"), field("affected_sessions", "integer", "Sessões sintéticas afetadas")]}],
    preparationRules: ["Eventos precisam ter identificador, ambiente e data válidos.", "Severidade crítica exige um evento de resolução correspondente.", "Sessões afetadas não podem ser negativas.", "Não coletar identificadores reais de usuários."],
    primaryOutcome: "acompanhar adoção, estabilidade, versões e incidentes e apoiar a priorização do produto",
    predictiveOutcome: "estimar risco de incidente após uma versão e explicar os sinais operacionais associados",
  },
  finance: {
    id: "finance", label: "Finanças pessoais", context: "orçamentos e transações totalmente fictícios", targetAudience: "pessoas que desejam compreender seu orçamento",
    sourceLabel: "fixture de contas, categorias, metas e transações fictícias",
    acquisitionInstructions: "Gere, com seed 42, 12 meses e ao menos 1.000 transações fictícias. Não importe extratos, CPFs, cartões ou contas reais.",
    entities: [{ name: "transaction", requiredFields: [field("transaction_id", "string", "Identificador único"), field("occurred_on", "date", "Data"), field("account_id", "string", "Conta fictícia"), field("category", "string", "Categoria"), field("amount_brl", "number", "Valor com sinal"), field("kind", "enum", "receita ou despesa"), field("recurring", "boolean", "Recorrência"), field("goal_id", "string|null", "Meta fictícia relacionada")]}],
    preparationRules: ["Receitas e despesas devem seguir convenção de sinal documentada.", "Não armazenar credenciais nem dados financeiros reais.", "Toda previsão deve ser apresentada como simulação educacional."],
    primaryOutcome: "comparar receitas, despesas e metas e sinalizar desvios do orçamento",
    predictiveOutcome: "projetar o saldo dos próximos 30 dias como simulação e explicar categorias que mais influenciam a projeção",
  },
  investments: {
    id: "investments", label: "Investimentos", context: "carteiras, ativos e decisões de investimento inteiramente fictícios", targetAudience: "pessoas que estudam alocação, risco e acompanhamento de carteiras",
    sourceLabel: "fixture sintética de preços, fatores, eventos e carteiras fictícias",
    acquisitionInstructions: "Gere, com seed 42, séries diárias fictícias de pelo menos 30 ativos, três classes de ativos e 36 meses. Inclua calendário, preços, volume, custos e fatores; nunca use recomendação, cotação ou ativo real.",
    entities: [{ name: "market_snapshot", requiredFields: [field("snapshot_id", "string", "Identificador único"), field("occurred_on", "date", "Data do pregão fictício"), field("asset_id", "string", "Ativo sintético"), field("asset_class", "enum", "ação, ETF ou fundo imobiliário fictício"), field("close_price", "number", "Preço sintético de fechamento"), field("volume", "integer", "Volume sintético"), field("factor_value", "number", "Fator calculado somente com dados anteriores"), field("transaction_cost_bps", "number", "Custo simulado em pontos-base"), field("portfolio_weight", "number", "Peso de carteira simulado")]}],
    preparationRules: ["Não usar ativos, cotações, recomendações ou rentabilidades reais.", "Toda feature e decisão deve usar apenas informação disponível até a data simulada.", "Separar treino, validação e teste por tempo e registrar custos, liquidez e rebalanceamentos.", "Apresentar resultados como laboratório educacional, nunca como recomendação de investimento."],
    primaryOutcome: "comparar risco, retorno, custo e diversificação de carteiras sintéticas e explicar decisões com limites explícitos",
    predictiveOutcome: "ranquear ativos e comparar carteiras em backtest walk-forward sintético, com incerteza, custos e sem recomendação financeira",
  },
  health_wellness: {
    id: "health_wellness", label: "Saúde e bem-estar", context: "hábitos e rotinas de bem-estar de pessoas fictícias", targetAudience: "pessoas que acompanham hábitos não clínicos",
    sourceLabel: "fixture de hábitos e registros de rotina fictícios",
    acquisitionInstructions: "Gere, com seed 42, ao menos 1.000 registros fictícios de sono, hidratação, movimento e humor. Não use prontuários ou dados de pessoas reais.",
    entities: [{ name: "wellness_log", requiredFields: [field("log_id", "string", "Identificador único"), field("profile_id", "string", "Perfil fictício"), field("logged_on", "date", "Data do registro"), field("routine_type", "string", "Rotina acompanhada"), field("sleep_hours", "number", "Horas de sono"), field("water_ml", "integer", "Hidratação"), field("activity_minutes", "integer", "Movimento"), field("mood_score", "integer", "Autoavaliação de 1 a 5")]}],
    preparationRules: ["Valores devem respeitar limites humanos plausíveis documentados.", "Não emitir diagnóstico, tratamento ou recomendação médica.", "Usar somente perfis sintéticos e agregações não identificáveis."],
    primaryOutcome: "acompanhar a regularidade de hábitos e apresentar tendências de forma não clínica",
    predictiveOutcome: "estimar a probabilidade de manter uma rotina na semana seguinte sem produzir diagnóstico ou recomendação médica",
  },
  games: {
    id: "games", label: "Jogos", context: "partidas e progressão de um jogo competitivo fictício", targetAudience: "jogadores, designers e organizadores de torneios",
    sourceLabel: "fixture de partidas e eventos de jogadores fictícios",
    acquisitionInstructions: "Gere, com seed 42, ao menos 1.000 eventos de partidas fictícias em JSON, sem usernames ou identificadores reais.",
    entities: [{ name: "game_event", requiredFields: [field("event_id", "string", "Identificador único"), field("match_id", "string", "Partida"), field("player_id", "string", "Jogador fictício"), field("team_id", "string", "Equipe fictícia"), field("opponent_team_id", "string", "Equipe adversária fictícia"), field("occurred_at", "datetime", "Instante"), field("event_type", "string", "Ação no jogo"), field("score_delta", "integer", "Variação de pontos"), field("duration_seconds", "integer", "Duração"), field("rank_tier", "string", "Faixa competitiva"), field("won", "boolean", "Resultado final da equipe do evento")]}],
    preparationRules: ["Identificadores de jogador e equipe devem ser sintéticos.", "Eventos precisam respeitar a ordem temporal e o resultado final da partida.", "Equipe e adversário precisam ser distintos.", "Não criar mecânicas de aposta ou recompensa financeira."],
    primaryOutcome: "comparar desempenho, progressão e equilíbrio das partidas",
    predictiveOutcome: "estimar a probabilidade de vitória e detectar partidas desequilibradas sem relacionar o resultado a apostas",
  },
  education: {
    id: "education", label: "Educação", context: "cursos, exercícios e progresso de estudantes fictícios", targetAudience: "estudantes, professores e coordenações pedagógicas",
    sourceLabel: "fixture de cursos, tentativas e progresso fictícios",
    acquisitionInstructions: "Gere, com seed 42, 20 cursos fictícios e ao menos 1.000 tentativas de exercícios em CSV ou JSON, sem dados de alunos reais.",
    entities: [{ name: "learning_attempt", requiredFields: [field("attempt_id", "string", "Identificador único"), field("student_id", "string", "Estudante fictício"), field("course_id", "string", "Curso"), field("topic_id", "string", "Assunto"), field("attempted_at", "datetime", "Instante"), field("correct", "boolean", "Acerto"), field("duration_seconds", "integer", "Tempo de resposta"), field("difficulty", "integer", "Dificuldade de 1 a 5")]}],
    preparationRules: ["Não usar nomes, e-mails ou matrículas reais.", "Tentativas devem apontar para curso e assunto existentes.", "Resultados não devem rotular capacidade permanente do estudante."],
    primaryOutcome: "acompanhar progresso por assunto e indicar onde uma revisão pode ajudar",
    predictiveOutcome: "estimar a chance de acerto no próximo bloco e recomendar revisão sem rotular o estudante",
  },
  music: {
    id: "music", label: "Música", context: "faixas, artistas e playlists inteiramente fictícios", targetAudience: "ouvintes, curadores e equipes de catálogo",
    sourceLabel: "fixture de faixas e reproduções fictícias",
    acquisitionInstructions: "Gere, com seed 42, 200 faixas fictícias e ao menos 1.000 reproduções. Não use áudio, letras ou metadados protegidos de obras reais.",
    entities: [{ name: "play_event", requiredFields: [field("play_id", "string", "Identificador único"), field("listener_id", "string", "Ouvinte inteiramente fictício"), field("track_id", "string", "Faixa fictícia"), field("artist_id", "string", "Artista fictício"), field("played_at", "datetime", "Instante"), field("genre", "string", "Gênero"), field("mood", "string", "Clima musical"), field("duration_seconds", "integer", "Duração ouvida"), field("track_duration_seconds", "integer", "Duração total da faixa fictícia"), field("completed", "boolean", "Reprodução concluída"), field("discovery_source", "string", "Origem fictícia da descoberta")]}],
    preparationRules: ["Não copiar letras, capas ou áudio protegido.", "Ouvintes, artistas e faixas devem ser inventados.", "Duração ouvida deve ficar entre zero e a duração total da faixa.", "Eventos devem conter data e origem de descoberta válidas."],
    primaryOutcome: "organizar o catálogo e explicar padrões de reprodução e descoberta",
    predictiveOutcome: "estimar a chance de conclusão de uma faixa e gerar recomendações explicáveis com diversidade",
  },
  ecommerce: {
    id: "ecommerce", label: "Comércio eletrônico", context: "produtos, pedidos e estoque de uma loja fictícia", targetAudience: "clientes e equipes de operação de uma loja digital",
    sourceLabel: "fixture de catálogo, pedidos e estoque fictícios",
    acquisitionInstructions: "Gere, com seed 42, 200 produtos fictícios e ao menos 1.000 itens de pedido em JSON. Não use clientes, marcas ou pagamentos reais.",
    entities: [{ name: "order_item", requiredFields: [field("order_id", "string", "Pedido fictício"), field("product_id", "string", "Produto"), field("ordered_at", "datetime", "Instante"), field("category", "string", "Categoria"), field("quantity", "integer", "Quantidade"), field("unit_price_brl", "number", "Preço unitário"), field("stock_before", "integer", "Estoque anterior"), field("status", "enum", "criado, pago, enviado, entregue ou cancelado")]}],
    preparationRules: ["Quantidade, preço e estoque não podem ser negativos.", "Transições de status devem respeitar uma ordem documentada.", "Não processar pagamentos nem dados pessoais reais."],
    primaryOutcome: "permitir encontrar produtos, acompanhar pedidos e antecipar problemas de estoque",
    predictiveOutcome: "estimar demanda e risco de ruptura por produto, exibindo intervalo e fatores relevantes",
  },
};

type CareerProjectBlueprint = {
  capstoneLabel: string;
  stageProducts: Record<ItCareerLevelId, string>;
  baseFunctionalities: (interest: CareerInterestProfile) => string[];
  levelFunctionalities: Record<ItCareerLevelId, (interest: CareerInterestProfile) => string>;
  technicalRequirements: string[];
};

const careerProjectBlueprints: Record<ItCareerId, CareerProjectBlueprint> = {
  frontend: { capstoneLabel: "Portal web acessível", stageProducts: { foundation: "uma página web semântica e responsiva", junior: "um painel web interativo", mid: "uma aplicação web integrada a dados", senior: "um front-end observável e resiliente", specialist: "uma plataforma front-end governada" }, baseFunctionalities: (i) => [`Listar, pesquisar e filtrar os registros da ${i.sourceLabel}.`, "Exibir uma visão detalhada e uma comparação lado a lado.", "Tratar carregamento, ausência de dados, erro e navegação por teclado."], levelFunctionalities: { foundation: () => "Entregar HTML semântico, layout responsivo e histórico Git legível.", junior: () => "Implementar componentes tipados, estado, formulários e rotas navegáveis.", mid: () => "Sincronizar filtros com a URL, validar mutações e cobrir os fluxos principais com testes.", senior: () => "Aplicar estratégia de renderização, orçamento de performance, segurança no navegador e telemetria.", specialist: () => "Publicar componentes reutilizáveis, contratos versionados e métricas de regressão da plataforma." }, technicalRequirements: ["Atender navegação por teclado e contraste WCAG AA.", "Não ocultar erros nem estados vazios da interface."] },
  backend: { capstoneLabel: "Serviço multiusuário confiável", stageProducts: { foundation: "um serviço local de consulta", junior: "uma API REST tipada", mid: "um serviço modular com integrações", senior: "um serviço distribuído resiliente", specialist: "uma plataforma de APIs governada" }, baseFunctionalities: (i) => [`Importar e validar a ${i.sourceLabel}.`, `Disponibilizar consultas paginadas para ${i.primaryOutcome}.`, "Retornar erros padronizados e registrar operações relevantes."], levelFunctionalities: { foundation: () => "Persistir os registros em banco relacional e expor consultas HTTP básicas.", junior: () => "Implementar autenticação, autorização, validação e testes de integração.", mid: () => "Executar uma operação assíncrona idempotente com retentativa e observabilidade.", senior: () => "Definir limites de consistência, rate limiting, degradação e auditoria de segurança.", specialist: () => "Versionar contratos, automatizar golden paths e demonstrar recuperação ou failover." }, technicalRequirements: ["Validar toda entrada no servidor.", "Não registrar segredos ou dados sensíveis em logs."] },
  fullstack: { capstoneLabel: "Produto web ponta a ponta", stageProducts: { foundation: "um catálogo web persistente", junior: "um produto web autenticado", mid: "uma plataforma web modular", senior: "um produto SaaS confiável", specialist: "uma plataforma de produtos governada" }, baseFunctionalities: (i) => [`Importar e consultar a ${i.sourceLabel}.`, `Oferecer uma jornada completa para ${i.primaryOutcome}.`, "Persistir alterações e mostrar confirmação ou erro ao usuário."], levelFunctionalities: { foundation: () => "Entregar interface responsiva, API simples e banco relacional.", junior: () => "Implementar autenticação, autorização, formulários tipados e testes dos fluxos críticos.", mid: () => "Separar domínios, processar um job assíncrono e integrar cache ou webhook com idempotência.", senior: () => "Aplicar SLO, auditoria, degradação segura e decisão explícita de custo/performance.", specialist: () => "Padronizar componentes e APIs e demonstrar evolução compatível entre versões." }, technicalRequirements: ["Separar claramente interface, domínio e persistência.", "As regras críticas devem ser validadas no servidor."] },
  mobile: { capstoneLabel: "Aplicativo móvel offline", stageProducts: { foundation: "um protótipo móvel navegável", junior: "um aplicativo móvel conectado", mid: "um aplicativo offline-first", senior: "um aplicativo móvel seguro e observável", specialist: "uma plataforma móvel distribuível" }, baseFunctionalities: (i) => [`Listar, buscar e detalhar registros da ${i.sourceLabel}.`, `Permitir uma ação principal relacionada a ${i.primaryOutcome}.`, "Tratar modo offline, sincronização pendente e falha de rede de forma visível."], levelFunctionalities: { foundation: () => "Entregar navegação, layout adaptável e componentes acessíveis ao toque.", junior: () => "Consumir API, persistir dados locais e testar a jornada principal.", mid: () => "Implementar fila offline, reconciliação idempotente e uma integração nativa.", senior: () => "Proteger armazenamento, coletar crashes/traces e controlar rollout por versão.", specialist: () => "Automatizar builds assinados, componentes compartilhados e políticas de compatibilidade." }, technicalRequirements: ["Não perder ações confirmadas durante uma oscilação de rede.", "Não armazenar segredo em texto aberto no dispositivo."] },
  data_analytics_bi: { capstoneLabel: "Sistema analítico executivo", stageProducts: { foundation: "um relatório analítico reproduzível", junior: "um dashboard de indicadores", mid: "um produto analítico automatizado", senior: "uma camada semântica governada", specialist: "uma plataforma analítica self-service" }, baseFunctionalities: (i) => [`Carregar, limpar e documentar a ${i.sourceLabel}.`, `Calcular indicadores que permitam ${i.primaryOutcome}.`, "Disponibilizar filtros de período e categoria, visão de detalhe e explicação das métricas."], levelFunctionalities: { foundation: () => "Comparar média, mediana, distribuição e qualidade dos dados sem afirmar causalidade.", junior: () => "Modelar fatos/dimensões e publicar um dashboard com narrativa e definições de KPI.", mid: () => "Automatizar transformações, métricas e atualização com testes de dados.", senior: () => "Definir camada semântica, propriedade, acesso, linhagem e cenários de decisão.", specialist: () => "Oferecer templates self-service, governança e medição de uso/custo do produto analítico." }, technicalRequirements: ["Toda métrica deve ter fórmula, granularidade e fonte documentadas.", "Correlação não pode ser apresentada como causalidade."] },
  data_science_ai: { capstoneLabel: "Previsor probabilístico reproduzível", stageProducts: { foundation: "um laboratório de dados reproduzível", junior: "um sistema preditivo comparativo", mid: "um serviço de experimentos e predição", senior: "um produto de IA governado", specialist: "uma plataforma de IA otimizada e avaliável" }, baseFunctionalities: (i) => [`Carregar, validar e versionar a ${i.sourceLabel}.`, `Executar uma análise reproduzível para ${i.primaryOutcome}.`, "Comparar o resultado com uma baseline simples e registrar parâmetros e métricas."], levelFunctionalities: { foundation: () => "Produzir notebook reproduzível com consultas, distribuições, ausências, outliers e conclusões limitadas pelos dados.", junior: (i) => `Treinar e comparar pelo menos dois modelos para ${i.predictiveOutcome}.`, mid: () => "Versionar experimentos, executar tuning, expor predição por API e monitorar latência e qualidade.", senior: () => "Automatizar treino/registro, testar drift, explicabilidade, privacidade e incluir um assistente RAG que responda apenas com fontes do projeto e guardrails.", specialist: () => "Comparar adaptação ou fine-tuning de um modelo, otimizar inferência e aplicar avaliações e governança versionadas na plataforma de IA." }, technicalRequirements: ["Quando houver modelagem, separar treino e teste sem vazamento de dados.", "Fixar sementes e versões para reproduzir métricas."] },
  data_engineering: { capstoneLabel: "Plataforma de dados batch e streaming", stageProducts: { foundation: "um pipeline de dados versionado", junior: "um warehouse com ETL reexecutável", mid: "uma plataforma batch e streaming observável", senior: "um lakehouse governado", specialist: "uma plataforma de data products self-service" }, baseFunctionalities: (i) => [`Ingerir a ${i.sourceLabel} de maneira reexecutável.`, "Validar esquema, unicidade, volume, atualidade e regras do domínio.", `Publicar tabelas prontas para ${i.primaryOutcome}.`], levelFunctionalities: { foundation: () => "Entregar transformações SQL/Python idempotentes e particionadas por data.", junior: () => "Modelar camadas raw/staging/mart, testes dbt e orquestração com retentativa.", mid: () => "Processar um fluxo contínuo, documentar semântica de entrega e medir freshness/volume.", senior: () => "Aplicar formato transacional, contratos, linhagem, controle de acesso e análise de custo.", specialist: () => "Oferecer template self-service, SLO por data product e estratégia de recuperação multi-região." }, technicalRequirements: ["Reprocessar o mesmo lote não pode duplicar registros.", "Falhas de qualidade devem bloquear ou quarentenar a publicação."] },
  devops_cloud: { capstoneLabel: "Plataforma de implantação reproduzível", stageProducts: { foundation: "um ambiente Linux automatizado", junior: "uma esteira containerizada de entrega", mid: "uma plataforma Kubernetes declarativa", senior: "uma arquitetura altamente disponível", specialist: "uma developer platform governada" }, baseFunctionalities: (i) => [`Implantar um serviço de demonstração que consuma a ${i.sourceLabel}.`, "Automatizar build, configuração e promoção entre ambientes.", "Exibir saúde, logs, métricas e um alerta acionável do serviço."], levelFunctionalities: { foundation: () => "Provisionar arquivos, processos, rede e scripts reexecutáveis em Linux.", junior: () => "Construir imagem mínima, pipeline CI/CD e rollback verificável.", mid: () => "Provisionar infraestrutura com Terraform e workloads Kubernetes com segredos protegidos.", senior: () => "Demonstrar SLO, capacidade, failover e recuperação compatíveis com RTO/RPO definidos.", specialist: () => "Oferecer golden path self-service, policy as code, scorecard e análise de lock-in/custo." }, technicalRequirements: ["Nenhum segredo pode entrar no repositório ou na imagem.", "Toda automação deve ser idempotente ou declarar claramente seu estado."] },
  cybersecurity: { capstoneLabel: "Laboratório de segurança verificável", stageProducts: { foundation: "um laboratório isolado de hardening", junior: "um sistema de detecção e resposta", mid: "um laboratório de AppSec e forense", senior: "uma arquitetura zero trust monitorada", specialist: "uma plataforma de controles e purple team" }, baseFunctionalities: (i) => [`Proteger, em laboratório local e autorizado, um serviço que use a ${i.sourceLabel}.`, "Coletar eventos, detectar ao menos três comportamentos suspeitos simulados e gerar alertas explicáveis.", "Registrar triagem, contenção, recuperação e evidências de cada simulação."], levelFunctionalities: { foundation: () => "Aplicar menor privilégio, atualização, configuração segura e revisão de logs.", junior: () => "Configurar IAM, baseline, scanning e playbook para falhas OWASP simuladas.", mid: () => "Produzir threat model, integrar SAST/DAST e preservar uma timeline forense.", senior: () => "Aplicar segmentação, policy as code, métricas de risco e operação de detecção contínua.", specialist: () => "Automatizar guardrails, emulação segura, validação de detecções e governança de evidências." }, technicalRequirements: ["Executar testes apenas em ambiente próprio, isolado e autorizado.", "Não incluir credenciais, malware funcional ou instruções de ataque a terceiros."] },
  qa_automation: { capstoneLabel: "Plataforma de qualidade baseada em risco", stageProducts: { foundation: "um plano de testes rastreável", junior: "uma suíte automatizada de UI e API", mid: "um framework de qualidade em CI", senior: "uma estratégia de qualidade e resiliência", specialist: "uma test platform self-service" }, baseFunctionalities: (i) => [`Validar um produto de demonstração que use a ${i.sourceLabel}.`, "Cobrir jornada principal, entrada inválida, estado vazio, falha de dependência e recuperação.", "Publicar relatório com resultado, evidência, severidade e vínculo ao requisito."], levelFunctionalities: { foundation: () => "Criar matriz de risco, casos equivalentes/limites e roteiro exploratório.", junior: () => "Automatizar API e UI com fixtures isoladas, locators estáveis e traces de falha.", mid: () => "Executar testes em paralelo na CI, controlar flakiness e validar contratos entre serviços.", senior: () => "Medir cobertura por risco e executar testes de carga, acessibilidade e degradação.", specialist: () => "Oferecer ambiente/dados self-service, property-based tests e scorecard de qualidade." }, technicalRequirements: ["Teste deve falhar por comportamento incorreto, não por ordem ou tempo arbitrário.", "Dados de teste precisam ser determinísticos e isolados."] },
  support_infra_networks: { capstoneLabel: "Ambiente empresarial resiliente", stageProducts: { foundation: "um laboratório de suporte documentado", junior: "um ambiente de identidade e serviços", mid: "uma operação híbrida monitorada", senior: "uma infraestrutura com continuidade testada", specialist: "uma arquitetura corporativa automatizada" }, baseFunctionalities: (i) => [`Operar um serviço interno de demonstração baseado na ${i.sourceLabel}.`, "Cadastrar ativo, usuário fictício, incidente e mudança com histórico auditável.", "Monitorar disponibilidade, capacidade e falha de conectividade com alerta e runbook."], levelFunctionalities: { foundation: () => "Documentar hardware/OS, endereçamento, DNS e diagnóstico passo a passo.", junior: () => "Configurar identidade, grupos, políticas, scripts, serviço de arquivos e restauração testada.", mid: () => "Operar VMs/cloud, inventário, automação e fluxo ITSM com SLA.", senior: () => "Demonstrar redundância, failover, RTO/RPO e comando de incidente.", specialist: () => "Aplicar zero trust, network automation, compliance e previsão de capacidade." }, technicalRequirements: ["Toda mudança precisa de plano de validação e reversão.", "O teste de recuperação deve registrar tempo e resultado observado."] },
};

function uniqueText(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

type ModuleProjectBlueprint = {
  productName: string;
  mission: string;
  dataUse: string;
  verification: string;
};

type ModuleProjectBlueprintRow = readonly [
  moduleTitle: string,
  productName: string,
  mission: string,
  dataUse: string,
  verification: string,
];

// Cada linha corresponde a um módulo real do catálogo. Não existe fallback:
// adicionar ou renomear um módulo exige definir previamente o produto que o
// aluno receberá, o uso dos dados e a evidência objetiva de conclusão.
const moduleProjectBlueprintRows: Record<ItCareerId, readonly ModuleProjectBlueprintRow[]> = {
  frontend: [
    ["Web, HTTP e Git", "inspetor web de requisições e versões", "registrar uma alteração de interface, exibir o ciclo requisição/resposta e permitir comparar duas versões do código", "servir uma amostra paginada da fixture por HTTP e registrar status, headers e tempo de resposta", "histórico Git com branches, revisão do diff e captura da requisição validada"],
    ["HTML e CSS", "catálogo responsivo e acessível", "apresentar registros em lista, detalhe e comparação que funcionem por teclado e em três larguras de tela", "transformar os campos da fixture em conteúdo semântico, tabela acessível e estados vazio/erro", "auditoria de semântica, contraste, foco, zoom de 200% e responsividade"],
    ["JavaScript e TypeScript", "configurador tipado de registros", "filtrar, ordenar, agrupar e validar uma seleção sem conversões implícitas ou estados impossíveis", "tipar a entidade da fixture, validar o JSON recebido e rejeitar campos ausentes ou incompatíveis", "testes das funções puras, dos erros de validação e da serialização do estado"],
    ["React e Next.js", "painel navegável em React e Next.js", "oferecer rotas de listagem e detalhe, filtros persistentes e atualização previsível dos dados", "carregar a fixture no servidor, entregar somente os campos necessários e tratar revalidação", "teste das rotas, estados de carregamento/erro e navegação sem recarga completa"],
    ["Estado, dados e formulários", "central de consulta e edição", "sincronizar filtros com a URL, editar um registro fictício com validação e desfazer uma alteração", "normalizar a fixture, separar estado remoto/local e impedir mutação com versão desatualizada", "testes do formulário, conflito de versão, optimistic update e recuperação do erro"],
    ["Qualidade e design systems", "biblioteca de interface com página de referência", "entregar componentes de tabela, filtro, feedback e comparação reutilizados por uma página funcional", "representar variações dos dados como stories determinísticos, incluindo valores longos, ausentes e inválidos", "testes de componente, acessibilidade e regressão visual dos estados documentados"],
    ["Arquitetura e renderização", "comparador de estratégias de renderização", "implementar a mesma consulta em renderização estática, servidor e cliente e justificar a estratégia final", "medir payload, atualidade e tempo de resposta usando o mesmo recorte versionado da fixture", "relatório comparativo com métricas, decisão arquitetural e teste das fronteiras servidor/cliente"],
    ["Performance, segurança e observabilidade", "painel web com orçamento operacional", "manter a jornada principal dentro de orçamento de desempenho, aplicar proteções do navegador e registrar falhas úteis", "usar um recorte grande da fixture para medir LCP, INP, tamanho transferido e erros por rota", "trace de uma falha, relatório Lighthouse reproduzível e testes de XSS, CSP e autorização na interface"],
    ["Plataforma e internals", "kit de build e diagnóstico front-end", "criar um plugin ou codemod que padronize imports e um diagnóstico que explique custo de bundle por módulo", "processar um projeto-fixture com imports válidos, cíclicos e pesados sem modificar arquivos fora do escopo", "golden tests do código transformado, mapa do bundle e benchmark de build incremental"],
    ["Governança e escala", "portal de componentes e conformidade", "publicar versões de componentes, detectar usos incompatíveis e exibir adoção e regressões por produto", "agregar uma fixture de pacotes, versões, consumidores e resultados de CI com contratos versionados", "scorecard por produto, política de migração e demonstração de bloqueio de uma quebra incompatível"],
  ],
  backend: [
    ["Lógica, Linux e Git", "serviço CLI de importação auditável", "importar um arquivo, validar argumentos, registrar contagens e retornar códigos de saída distintos para sucesso e falha", "ler a fixture por streaming, rejeitar linhas inválidas e gravar um resumo sem alterar o arquivo original", "testes de entrada válida/inválida, log de execução e histórico Git com correção isolada"],
    ["HTTP e bancos relacionais", "API de consulta relacional", "persistir a fixture e oferecer listagem paginada, detalhe e filtro com respostas HTTP consistentes", "criar esquema relacional com chaves, índices e transação de importação idempotente", "plano de consulta, migration reproduzível e testes de status, paginação e rollback"],
    ["Node.js e APIs", "API REST tipada de operações", "expor criação fictícia, consulta e atualização com contrato, validação e erros padronizados", "validar payloads contra o esquema da fixture e mapear domínio, transporte e persistência sem tipos implícitos", "OpenAPI, testes de contrato e integração e demonstração de uma entrada rejeitada"],
    ["Persistência, autenticação e testes", "serviço multiusuário com autorização", "autenticar perfis fictícios e impedir leitura ou alteração de registros fora do escopo autorizado", "associar registros da fixture a tenants sintéticos e testar transações, isolamento e revogação", "matriz de permissões, testes de integração por papel e evidência de tentativa negada"],
    ["Arquitetura modular e integrações", "orquestrador modular de integrações", "separar domínio, aplicação e adaptadores e sincronizar um provedor fictício sem duplicar operações", "converter eventos da fixture em comandos idempotentes e guardar cursor, versão e resultado da integração", "diagrama de portas/adaptadores, contract test do provedor e replay bem-sucedido"],
    ["Filas, cache e observabilidade", "processador assíncrono observável", "enfileirar uma análise, evitar duplicidade, armazenar resultado em cache e explicar falhas por trace", "publicar itens da fixture com chave idempotente, política de retry, dead-letter e invalidação de cache", "dashboard de latência/falhas, teste de retry e prova de que o replay não duplica resultado"],
    ["Sistemas distribuídos", "simulador de reserva distribuída", "coordenar uma operação entre dois serviços sob atraso, repetição e indisponibilidade parcial", "usar eventos derivados da fixture com versão, idempotency key e ordem observável para testar consistência", "registro de invariantes, teste de partição e comparação documentada entre saga e transação local"],
    ["Escala e segurança", "gateway de tráfego protegido", "aplicar autenticação, rate limiting, paginação por cursor e degradação segura sob carga", "reproduzir tráfego determinístico a partir da fixture e separar requisições normais, abusivas e inválidas", "teste de carga com percentis, relatório de ameaças e evidência de limite sem indisponibilizar clientes válidos"],
    ["Plataforma de APIs", "portal self-service de APIs", "criar um template que gere serviço, contrato, pipeline e telemetria seguindo um golden path versionado", "usar a fixture como exemplo do contrato gerado e validar compatibilidade entre duas versões da entidade", "repositório template, scorecard e demonstração de criação e upgrade de um serviço"],
    ["Alta disponibilidade e multi-região", "serviço multi-região com failover", "replicar consultas, direcionar tráfego e recuperar escrita após perda simulada de uma região", "gerar operações cronológicas da fixture e verificar perda, atraso e conflito frente a RPO/RTO definidos", "ensaio de failover, reconciliação dos registros e relatório de capacidade, custo e consistência"],
  ],
  fullstack: [
    ["Web, Git e programação", "catálogo web versionado", "carregar registros por uma API local, renderizar lista/detalhe e registrar uma evolução completa em Git", "converter a fixture em JSON validado e expor busca por identificador sem editar a fonte", "teste ponta a ponta da consulta e histórico com issue, branch, commits e merge"],
    ["Interface e dados", "cadastro web persistente", "criar, listar e editar registros fictícios com formulário acessível e persistência relacional", "mapear campos da fixture para formulário, regras de domínio e migration com chave única", "teste de criação/edição, validação de duplicidade e inspeção do banco resultante"],
    ["React e Next.js", "painel de exploração em Next.js", "oferecer rotas, filtros, detalhe e estados de interface com fronteiras claras entre servidor e cliente", "buscar a fixture no servidor e serializar somente dados necessários para componentes tipados", "testes de navegação, renderização, loading, vazio e erro de dependência"],
    ["API, banco e autenticação", "produto autenticado por tenant", "permitir que perfis fictícios administrem somente seus registros por interface e API", "associar a fixture a tenants e aplicar a mesma autorização no servidor, consultas e mutações", "matriz de acesso, testes UI/API e evidência de bloqueio entre tenants"],
    ["Arquitetura ponta a ponta", "fluxo transacional modular", "executar uma jornada que atravessa UI, domínio, banco e integração mantendo invariantes e erros recuperáveis", "transformar um evento da fixture em comando versionado e persistir estado e outbox na mesma transação", "diagrama de sequência, teste ponta a ponta e replay idempotente da integração"],
    ["Qualidade, cache e observabilidade", "produto web operável", "reduzir latência com cache, invalidar após mutação e correlacionar erro de interface ao trace do servidor", "gerar consultas repetidas e mutações da fixture para medir hit rate, stale data e falhas", "dashboard, teste de invalidação e investigação documentada de uma falha injetada"],
    ["Escala e confiabilidade", "SaaS resiliente sob carga", "preservar a jornada crítica durante pico, timeout e indisponibilidade de uma dependência", "reproduzir carga com operações determinísticas da fixture, isoladas por tenant e prioridade", "teste de carga, SLO, estratégia de degradação e evidência de recuperação sem duplicidade"],
    ["Segurança e decisões de produto", "central de operações seguras", "proteger uma ação sensível, registrar auditoria e medir o impacto de uma regra de produto em um funil fictício", "classificar eventos da fixture por papel e sensibilidade sem incluir dados pessoais reais", "threat model, teste de abuso, trilha de auditoria e análise do funil com decisão justificada"],
    ["Plataforma full stack", "gerador de produto com golden path", "criar um template que entregue UI, API, banco, autenticação, testes e pipeline já integrados", "materializar um domínio de exemplo a partir do esquema da fixture e validar migrations e contratos gerados", "template executável, scorecard e demonstração de criação e atualização de um produto"],
    ["Multi-região e governança", "ecossistema de produtos multi-região", "rotear usuários, replicar dados e aplicar políticas comuns sem interromper uma versão anterior", "reproduzir eventos da fixture em duas regiões e detectar atraso, conflito e quebra de contrato", "ensaio de failover, relatório de consistência e processo automatizado de evolução compatível"],
  ],
  mobile: [
    ["Programação, Git e UX móvel", "protótipo móvel de consulta", "entregar uma jornada de lista, detalhe e ação principal com navegação previsível e histórico Git", "carregar um recorte local da fixture e representar estados inicial, vazio, inválido e concluído", "teste da lógica, mapa da jornada e histórico versionado da evolução das telas"],
    ["Plataformas móveis", "aplicativo de ciclo de vida monitorado", "preservar estado ao pausar/retomar, adaptar layout e tratar permissão nativa simulada", "armazenar a fixture localmente e medir carregamento, memória e restauração de estado", "teste em dois tamanhos de tela, log do ciclo de vida e matriz de permissões"],
    ["React Native e Expo", "aplicativo navegável em React Native", "listar, buscar, detalhar e favoritar registros com componentes acessíveis e rotas tipadas", "validar a fixture antes de alimentar listas virtualizadas e estados de navegação", "testes de componente/navegação e demonstração em Android e iOS simulados"],
    ["Estado, APIs e armazenamento", "app sincronizado com cache local", "consultar uma API, persistir favoritos e explicar ao usuário dados em cache ou falha de rede", "versionar o esquema local da fixture e reconciliar respostas remotas sem perder a última seleção", "testes de API, migration local, reinício do app e recuperação após timeout"],
    ["Offline-first e sincronização", "app offline com fila de ações", "aceitar alterações sem rede, exibir pendências e sincronizar sem duplicar quando a conexão retorna", "gerar operações da fixture com client id, versão e timestamp para detectar conflito", "teste de oscilação de rede, política de conflito e prova de replay idempotente"],
    ["Nativo, performance e releases", "app com recurso nativo e rollout", "integrar uma capacidade do dispositivo, manter fluidez da lista e distribuir duas versões compatíveis", "usar a fixture para benchmark de renderização e um payload fictício da integração nativa", "perfil de performance, teste do bridge/módulo nativo e plano de release/rollback"],
    ["Arquitetura modular", "super-app modular de referência", "separar dois domínios em módulos com contratos explícitos e navegação compartilhada", "particionar a fixture por domínio e impedir acesso direto ao armazenamento interno de outro módulo", "diagrama de dependências, contract tests e demonstração de ativação independente"],
    ["Observabilidade e escala", "app móvel observável em frota", "correlacionar crash, trace e versão e controlar uma funcionalidade por rollout gradual", "simular dispositivos, versões e eventos da fixture sem identificadores pessoais", "dashboard por versão, reprodução de crash e decisão de pausar ou avançar rollout"],
    ["SDKs e internals", "SDK móvel versionado", "expor uma API nativa tipada, fila segura e compatibilidade entre duas versões do aplicativo", "serializar entidades da fixture pelo contrato do SDK e rejeitar payload incompatível", "pacote do SDK, app de exemplo, testes de contrato e benchmark de serialização"],
    ["Plataforma mobile", "esteira self-service de aplicativos", "gerar builds assinados de demonstração, aplicar componentes comuns e comparar saúde entre versões", "usar uma fixture de apps, versões, artefatos e telemetria para scorecards reprodutíveis", "template de app, pipeline, catálogo de componentes e scorecard de qualidade da versão"],
  ],
  data_analytics_bi: [
    ["Alfabetização de dados", "relatório de leitura crítica", "distinguir contagem, taxa e distribuição e explicar por que os dados não provam causalidade", "calcular perfil, ausências e granularidade da fixture antes de produzir qualquer indicador", "dicionário de dados e relatório com três conclusões sustentadas e duas limitações explícitas"],
    ["Planilhas e ética", "planilha auditável de indicadores", "limpar registros, calcular indicadores e manter origem, fórmula e alerta de uso indevido visíveis", "importar a fixture sem edição manual oculta, validar células e separar dado bruto, transformação e apresentação", "arquivo reproduzível, log de validação e checklist de privacidade e interpretação responsável"],
    ["SQL e limpeza", "mart SQL de qualidade e consulta", "deduplicar, padronizar e responder consultas de período, categoria e tendência", "carregar a fixture em staging, aplicar testes de chave/nulidade/faixa e publicar uma tabela analítica", "scripts SQL reexecutáveis, relatório de qualidade e conjunto de consultas com resultado esperado"],
    ["Power BI e storytelling", "dashboard executivo com modelo estrela", "apresentar KPIs definidos, filtros, drill-through e narrativa sem confundir correlação e causa", "modelar fato/dimensões a partir da fixture e documentar medida, granularidade e regra de filtro", "arquivo do dashboard, catálogo de medidas e roteiro de decisão com limitações"],
    ["SQL, DAX e Power Query avançados", "painel de métricas avançadas", "calcular janela, coorte e comparação temporal com filtros consistentes entre SQL, Power Query e DAX", "produzir a mesma métrica de referência nas três camadas e reconciliar diferenças", "consultas, transformações, medidas e teste automatizado de equivalência dos totais"],
    ["Python, métricas e experimentos", "monitor de métricas e experimento", "automatizar atualização, definir métrica norteadora e analisar um experimento fictício com incerteza", "gerar grupos e resultados determinísticos na fixture e verificar balanceamento e intervalo de confiança", "pipeline Python, ficha da métrica e relatório do experimento sem alegação causal indevida"],
    ["Camada semântica e governança", "catálogo governado de métricas", "publicar definições únicas, proprietário, acesso e linhagem para indicadores consumidos por dois painéis", "mapear campos da fixture até métricas versionadas e bloquear uma mudança incompatível", "modelo semântico, catálogo, matriz de acesso e teste de contrato da métrica"],
    ["Performance e decisão executiva", "cockpit executivo performático", "responder cenários de decisão com drill-down dentro de um orçamento de atualização e consulta", "particionar/agregar a fixture e medir tempo, custo e atualização sem alterar a definição das métricas", "benchmark, plano de otimização e memorando executivo com decisão e riscos"],
    ["Plataforma analítica", "portal self-service de produtos analíticos", "permitir criar um mart por template, validar qualidade e descobrir métricas certificadas", "usar a fixture como domínio de referência e registrar owner, SLA, linhagem e custo de cada artefato", "template, catálogo pesquisável, scorecard e demonstração de publicação bloqueada por teste"],
    ["Analytics engineering e estratégia", "portfólio de analytics products", "conectar perguntas de negócio, contratos de dados, métricas e adoção em um plano priorizado", "simular consumidores e uso da fixture para medir valor, custo, freshness e dívida do produto", "mapa de produtos, contratos, métricas de adoção e roadmap de evolução com trade-offs"],
  ],
  data_science_ai: [
    ["Python, SQL e dados", "laboratório Python/SQL reproduzível", "validar, consultar e resumir a fixture em notebook executável sem etapas manuais ocultas", "carregar por Python e SQL, comparar contagens e rejeitar esquema, tipo ou faixa inválidos", "notebook reiniciável, consultas versionadas e relatório de qualidade antes/depois"],
    ["Matemática e estatística", "estudo estatístico de incerteza", "estimar distribuições, intervalos e uma otimização simples explicitando hipóteses e limites", "selecionar variáveis da fixture, definir população/amostra e verificar sensibilidade a outliers", "caderno de cálculos, simulação com seed fixa e interpretação sem extrapolar os dados"],
    ["EDA e features", "pipeline de EDA e atributos", "detectar padrões, ausências e outliers e produzir features sem usar informação futura", "separar dados cronologicamente antes de ajustar transformações e comparar distribuições de treino/teste", "relatório EDA versionado, pipeline de features e teste automatizado de vazamento"],
    ["Modelos e avaliação", "comparador de modelos preditivos", "treinar baseline e dois modelos, calibrar probabilidades e selecionar métricas compatíveis com o objetivo", "criar split adequado ao domínio, registrar features/alvo e avaliar incerteza e erro por segmento", "pipeline treinável, tabela de métricas, curva de calibração e model card do modelo escolhido"],
    ["Experimentos e tuning", "serviço de experimentos rastreáveis", "executar busca de hiperparâmetros, comparar runs e justificar promoção frente à baseline", "versionar dataset/split e impedir que tuning consulte o conjunto de teste final", "tracking dos runs, configuração reproduzível, análise de erro e decisão de promoção"],
    ["Domínios e produção", "API de predição monitorada", "servir predição e uma análise temporal ou textual do domínio com validação e latência observável", "validar payload contra o esquema da fixture, registrar versão do modelo e detectar mudança de distribuição", "API documentada, testes de contrato/carga e dashboard de latência, erro e drift"],
    ["MLOps e IA responsável", "pipeline governado de modelos", "automatizar treino, registro, aprovação e rollback com explicabilidade, privacidade e fairness verificáveis", "versionar dados e modelo, comparar métricas globais/segmentadas e bloquear promoção fora dos limites", "pipeline CI/CT, registry, relatório de riscos e ensaio de rollback"],
    ["GenAI e RAG", "assistente RAG com fontes", "responder apenas sobre documentos derivados da fixture, citar trechos recuperados e recusar pergunta sem suporte", "criar corpus versionado, separar conjunto de avaliação e registrar retrieval, resposta e citação", "aplicação RAG, dataset de avaliação, métricas de retrieval/resposta e relatório de guardrails"],
    ["Modelos fundacionais", "laboratório de adaptação de modelo", "comparar prompting, retrieval e fine-tuning leve sob a mesma avaliação de qualidade, custo e risco", "versionar exemplos de treino/teste derivados da fixture sem contaminação entre conjuntos", "configs/adapters, benchmark comparativo, dataset card e decisão de adaptação"],
    ["Inferência e plataforma de IA", "plataforma de serving otimizado", "publicar versões de modelo, aplicar batching/cache/quantização e controlar qualidade, custo e rollback", "reproduzir uma carga de inferência da fixture com tamanhos, concorrência e respostas esperadas", "serving, benchmark de qualidade/latência/custo, catálogo e ensaio de rollback"],
  ],
  data_engineering: [
    ["SQL, Python e Git", "pipeline SQL/Python versionado", "ingerir, validar e transformar a fixture com execução incremental e histórico de mudanças legível", "separar raw e curated, registrar watermark e rejeitar chave, tipo ou faixa inválidos", "scripts reexecutáveis, testes de dados e comparação de duas versões do pipeline"],
    ["Linux e modelagem de dados", "mart analítico operado por CLI", "modelar entidades e fatos e executar carga, consulta e backup por comandos idempotentes", "mapear a fixture para modelo normalizado e dimensional com chaves e particionamento documentados", "DDL, diagrama, scripts shell e restauração validada do banco"],
    ["ETL, ELT e warehouse", "warehouse incremental em camadas", "carregar raw/staging/mart, tratar atualização e reprocessar lote sem duplicar linhas", "gerar dois lotes da fixture com inserções/correções e aplicar merge por chave e data de atualização", "pipeline, modelo dimensional e prova de idempotência e reconciliação"],
    ["dbt, orquestração e qualidade", "DAG dbt com contratos", "orquestrar modelos dependentes, testar contratos e impedir publicação quando a qualidade falhar", "materializar staging e marts da fixture com freshness, unique, not_null e regra do domínio", "projeto dbt, DAG, catálogo e execução com falha bloqueada e retry bem-sucedido"],
    ["Processamento distribuído", "job distribuído de agregação", "processar volume particionado, evitar skew e comparar resultado com implementação local de referência", "expandir deterministicamente a fixture, particionar por chave/data e registrar shuffle, memória e duração", "job, benchmark por configuração e teste de igualdade entre resultado local/distribuído"],
    ["Streaming e observabilidade", "pipeline de eventos em tempo quase real", "processar eventos atrasados/duplicados, publicar agregados e alertar atraso ou queda de volume", "emitir a fixture com event time, chave, duplicatas e atraso controlados e definir watermark", "topologia streaming, teste de semântica de entrega e dashboard de lag, volume e falhas"],
    ["Lakehouse e escala", "lakehouse transacional", "manter tabelas versionadas, compactar arquivos e servir batch e incremental com custo medido", "carregar snapshots da fixture, aplicar merge, time travel e evolução compatível de esquema", "tabelas, benchmark, política de compactação e demonstração de rollback de dados"],
    ["Segurança, metadados e contratos", "catálogo de data products protegidos", "publicar contrato, owner, linhagem e acesso por coluna e detectar mudança incompatível", "classificar campos da fixture, aplicar mascaramento sintético e validar produtor/consumidor em CI", "contrato versionado, catálogo, matriz de acesso e teste de quebra bloqueada"],
    ["Plataforma self-service", "portal de criação de data products", "gerar pipeline, testes, observabilidade e catálogo a partir de um contrato aprovado", "usar a fixture como domínio exemplo e medir tempo de provisionamento, freshness e custo do produto", "template executável, portal/CLI, scorecard e demonstração de criação e desativação"],
    ["Federação e multi-região", "malha federada de dados multi-região", "coordenar contratos por domínio, replicar produto crítico e recuperar publicação após perda regional", "distribuir eventos da fixture entre domínios/regiões e verificar atraso, duplicidade e soberania", "arquitetura, ensaio de failover, reconciliação e relatório de RPO/RTO/custo"],
  ],
  devops_cloud: [
    ["Linux e shell", "host Linux configurado por script", "provisionar usuário, diretórios, processo e rotação de logs com script seguro e reexecutável", "instalar uma cópia da fixture e validar dono, permissão, checksum e retenção sem usar caminho privilegiado amplo", "script idempotente, teste em ambiente limpo e log de segunda execução sem mudanças"],
    ["Redes e cloud", "laboratório de rede em nuvem", "isolar serviço público e banco privado, resolver DNS e demonstrar regras mínimas de entrada/saída", "servir a fixture por um endpoint de demonstração e registrar fluxos permitidos e negados", "diagrama, IaC ou roteiro reproduzível, testes DNS/TLS/conectividade e estimativa de custo"],
    ["Containers e CI/CD", "esteira containerizada com rollback", "construir imagem mínima, testar, publicar e promover uma versão com rollback verificável", "empacotar um serviço que consulta a fixture sem incluir segredos nem dados mutáveis na imagem", "Dockerfile, pipeline, SBOM, scan e demonstração de deploy e rollback"],
    ["AWS e monitoramento", "serviço AWS monitorado", "implantar compute/storage/IAM mínimos e alertar erro ou latência acima do limite", "armazenar a fixture em serviço gerenciado e gerar tráfego determinístico para logs, métricas e alarmes", "IaC, dashboard, alarme testado e relatório de permissões e custo mensal"],
    ["Terraform e Kubernetes", "plataforma Kubernetes declarativa", "provisionar infraestrutura e workload com health checks, autoscaling e configuração protegida", "montar ou acessar a fixture por serviço interno e simular carga/indisponibilidade de pod", "módulos Terraform, manifests/Helm, policy checks e teste de rollout/rollback"],
    ["SRE, secrets e incidentes", "serviço com SLO e resposta a incidente", "definir SLI/SLO, proteger segredo, disparar alerta acionável e executar runbook de recuperação", "reproduzir tráfego e falha sobre a fixture com timestamps para calcular disponibilidade e burn rate", "dashboard, alerta, runbook, timeline do incidente e postmortem sem culpabilização"],
    ["Alta disponibilidade e recuperação", "arquitetura com failover e restore", "manter serviço durante falha zonal e restaurar dados dentro de RTO/RPO definidos", "gerar escritas derivadas da fixture, snapshot e log para medir perda e consistência após recuperação", "IaC, plano de DR, ensaio cronometrado e reconciliação dos registros"],
    ["FinOps, zero trust e supply chain", "guardrail de custo e cadeia de entrega", "aplicar identidade mínima, assinatura/verificação de artefato e limite de custo com alerta", "usar builds e tráfego da fixture para atribuir custo por ambiente e detectar artefato não autorizado", "policies as code, SBOM/assinatura, dashboard de custo e evidência de bloqueio"],
    ["Developer platform", "golden path self-service", "provisionar repositório, pipeline, ambiente e observabilidade por uma interface ou CLI com políticas padrão", "usar o serviço da fixture como template e registrar lead time, conformidade e saúde da implantação", "portal/CLI, template, scorecard e demonstração de criação, upgrade e remoção"],
    ["Híbrido, multicloud e SRE organizacional", "plataforma híbrida com operação comum", "implantar o mesmo serviço em dois ambientes, rotear tráfego e comparar SLO, custo e dependência de fornecedor", "replicar a fixture com regra de residência e medir atraso, erro e egress entre ambientes", "arquitetura, failover, scorecard de SLO/custo e plano de saída testável"],
  ],
  cybersecurity: [
    ["Linux, redes e web", "laboratório isolado de superfície de ataque", "inventariar serviços, capturar fluxo autorizado e corrigir três exposições de configuração", "servir a fixture apenas na rede do laboratório e registrar portas, processos e requisições esperadas", "inventário antes/depois, regras de rede, evidências de correção e roteiro de reprodução seguro"],
    ["Fundamentos de segurança", "baseline de controles e riscos", "classificar ativos, ameaças e riscos e aplicar menor privilégio, atualização e logging", "marcar campos/serviços da fixture por sensibilidade fictícia e testar acesso permitido e negado", "matriz de risco, baseline aplicada, logs de validação e plano de tratamento priorizado"],
    ["IAM, hardening e vulnerabilidades", "ambiente endurecido por função", "provisionar papéis mínimos, aplicar baseline e corrigir vulnerabilidades simuladas sem interromper o serviço", "associar operações da fixture a papéis sintéticos e registrar autenticação, autorização e mudança de privilégio", "matriz IAM, scan antes/depois, scripts de hardening e teste de regressão"],
    ["SIEM, incidentes e OWASP", "central de detecção e resposta web", "detectar três ataques simulados contra app local, correlacionar eventos e executar contenção e recuperação", "gerar logs benignos e maliciosos autorizados sobre a fixture com IDs e timestamps correlacionáveis", "regras SIEM, alertas, timeline, playbook e evidência de restauração do serviço"],
    ["Threat modeling e AppSec", "pipeline AppSec orientado a ameaças", "modelar fluxos, priorizar abuso e bloquear uma falha introduzida em aplicação de laboratório", "mapear origem, transformação e acesso da fixture e criar casos de abuso sem payload ofensivo reutilizável", "DFD/threat model, requisitos, SAST/DAST em CI e correção comprovada"],
    ["Cloud, containers e forense", "workload cloud endurecido e investigável", "aplicar controles de container/cloud e reconstruir timeline de um incidente simulado preservando evidências", "produzir logs imutáveis de acesso e eventos da fixture com relógio sincronizado e checksum", "IaC/policies, imagem verificada, cadeia de custódia e relatório forense do laboratório"],
    ["Zero trust e DevSecOps", "serviço zero trust com políticas em CI", "autorizar cada fluxo por identidade/contexto e impedir deploy que viole um controle obrigatório", "classificar consumidores fictícios da fixture e testar segmentação, token curto e revogação", "policies as code, pipeline, matriz de fluxos e evidência de bloqueio e revogação"],
    ["Arquitetura, risco e SOC", "arquitetura monitorada por risco", "ligar cenários de ameaça a controles, telemetria e playbooks com prioridade mensurável", "gerar eventos da fixture e do laboratório para medir cobertura, falso positivo e tempo de resposta", "arquitetura, registro de riscos, casos de detecção e relatório de exercício do SOC"],
    ["Plataforma e purple team", "plataforma de validação de controles", "executar emulações seguras catalogadas e medir se prevenção, detecção e resposta funcionam", "usar cenários inofensivos com IDs, resultado esperado e telemetria sobre o serviço da fixture", "catálogo de testes, automação, scorecard de cobertura e backlog de lacunas"],
    ["Criptografia aplicada e estratégia", "serviço de proteção e rotação de dados", "aplicar criptografia em trânsito/repouso, rotação de chaves e assinatura sem criar algoritmo próprio", "proteger campos sintéticos da fixture, guardar metadados de versão e demonstrar recuperação autorizada", "modelo de chaves, implementação com biblioteca consolidada, teste de rotação e estratégia de longo prazo"],
  ],
  qa_automation: [
    ["Ciclo de software e testes", "plano de qualidade rastreável", "mapear requisitos, riscos e níveis de teste e executar casos de caminho feliz, limite e falha", "usar regras e registros da fixture como base para entradas válidas, inválidas e fronteiras", "matriz requisito-risco-teste, casos executados e relatório de defeitos reproduzíveis"],
    ["Git, HTTP e SQL", "kit de investigação de defeitos", "reproduzir uma falha atravessando commit, requisição HTTP e estado do banco e isolar a causa", "carregar a fixture, executar consulta de verificação e correlacionar request id com alteração persistida", "script SQL, coleção HTTP, branch com teste de regressão e relatório de causa"],
    ["Casos, exploratório e defeitos", "sessão exploratória baseada em risco", "desenhar partições/limites, explorar uma jornada e relatar defeitos com evidência e severidade", "derivar combinações válidas/inválidas dos campos e regras da fixture sem inventar dados pessoais", "charter, mapa de cobertura, casos prioritários e três relatórios de defeito ou riscos justificados"],
    ["API e Playwright", "suíte automatizada de API e UI", "cobrir jornada crítica, validação, autorização e recuperação com fixtures isoladas", "criar dados por API antes do teste, identificar registros e remover somente o escopo criado", "testes Playwright/API, traces de falha e relatório determinístico da execução"],
    ["Frameworks e CI", "framework paralelo de regressão", "organizar camadas, executar testes em paralelo e publicar diagnóstico de falha sem ordem implícita", "gerar uma fixture por worker com IDs/seed próprios e impedir compartilhamento de estado", "framework, pipeline, relatório, medição de duração e prova de repetição sem flakiness"],
    ["Contratos, ambientes e não funcionais", "bateria de contratos e riscos não funcionais", "validar compatibilidade de serviço, desempenho, acessibilidade e segurança básica em ambiente reproduzível", "usar o esquema da fixture como contrato e volume determinístico para carga e estados acessíveis", "contract tests, teste de carga, auditoria de acessibilidade e relatório do ambiente"],
    ["Estratégia baseada em risco", "portfólio de testes priorizado", "distribuir cobertura por impacto/probabilidade e definir critérios de entrada, saída e risco aceito", "associar fluxos da fixture a criticidade fictícia, frequência e histórico de falhas", "modelo de risco, mapa de cobertura, plano de releases e decisão documentada de risco residual"],
    ["Shift-right e resiliência", "validador de produção e caos seguro", "monitorar jornada sintética, injetar falha controlada e verificar alerta, degradação e recuperação", "executar operações sintéticas identificáveis sobre a fixture sem alterar dados de usuários reais", "synthetic check, experimento de falha, dashboard e postmortem com ações"],
    ["Test platform", "portal self-service de qualidade", "provisionar ambiente/dados, executar suíte e publicar scorecard por serviço por um fluxo único", "usar a fixture como pacote versionado e controlar reserva, limpeza e compatibilidade do ambiente", "portal/CLI, template, pipeline e métricas de adoção, duração e confiabilidade"],
    ["Técnicas avançadas e cultura", "laboratório de geração de testes", "combinar property-based, mutation e model-based testing e mostrar falhas que exemplos fixos não encontraram", "derivar geradores e invariantes do esquema/regras da fixture e reduzir automaticamente casos falhos", "geradores, mutantes, modelo de estado, casos minimizados e guia de adoção pelo time"],
  ],
  support_infra_networks: [
    ["Hardware e sistemas operacionais", "bancada documentada de diagnóstico", "inventariar máquina fictícia, diagnosticar falha de disco/memória/processo e registrar correção e rollback", "armazenar a fixture local com checksum e simular apenas falhas seguras de permissão e espaço", "inventário, árvore de diagnóstico, comandos/resultados e validação pós-correção"],
    ["Redes, segurança e atendimento", "laboratório de atendimento e conectividade", "resolver chamado de DNS/conectividade, proteger acesso e comunicar impacto, evidência e resolução", "servir a fixture em serviço interno e registrar IP, DNS, rota e teste de porta permitido", "ticket completo, diagrama, capturas de diagnóstico e checklist de segurança"],
    ["Identidade e troubleshooting", "domínio de identidades com runbook", "provisionar usuário/grupo/política e diagnosticar acesso negado sem conceder privilégio excessivo", "associar perfis sintéticos da fixture a grupos e registrar login, autorização e revogação", "matriz de grupos, scripts, ticket de diagnóstico e teste de acesso antes/depois"],
    ["Scripts, serviços e backup", "serviço automatizado com restauração", "instalar e monitorar serviço, agendar backup e restaurar uma versão específica por script", "copiar a fixture com checksum, retenção e logs e corromper uma cópia de laboratório para testar restore", "scripts idempotentes, backup catalogado, restauração cronometrada e validação de integridade"],
    ["Servidores, virtualização e cloud", "ambiente híbrido inventariado", "provisionar duas VMs e um serviço cloud, aplicar capacidade e migrar a aplicação de demonstração", "distribuir a fixture entre armazenamento local/cloud com regra de sincronização e acesso", "IaC/scripts, inventário, teste de migração e comparação de capacidade e custo"],
    ["Monitoramento, automação e ITSM", "central ITSM orientada a sinais", "abrir incidente por alerta, enriquecer ticket, executar runbook e medir SLA/tempo de recuperação", "gerar métricas e falhas do serviço da fixture com IDs correlacionados ao ativo e mudança", "dashboard, automação, tickets incidente/problema/mudança e relatório de SLA"],
    ["Alta disponibilidade e DR", "serviço redundante com recuperação", "manter consulta durante falha primária e restaurar dados dentro de RTO/RPO definidos", "gerar alterações cronológicas na fixture, replicar, interromper nó e reconciliar após retorno", "arquitetura, runbook, ensaio cronometrado e relatório de perda/consistência"],
    ["Arquitetura híbrida e incidentes", "operação híbrida com comando de incidente", "detectar falha entre rede local/cloud, coordenar comunicação e recuperar serviço por decisão registrada", "usar logs/fluxos do serviço da fixture em ambos ambientes com relógio e request id alinhados", "diagrama, timeline, registro de decisões, comunicação e postmortem"],
    ["Arquitetura corporativa e zero trust", "blueprint corporativo de acesso", "segmentar usuários/dispositivos/serviços e autorizar acesso por identidade e postura verificável", "classificar perfis e recursos sintéticos da fixture e testar fluxos permitidos, negados e revogados", "arquitetura alvo, policies, matriz de fluxos e roadmap de migração por etapas"],
    ["Automação e observabilidade de redes", "controlador de rede com telemetria", "gerar configuração, validar mudança, detectar degradação e reverter automaticamente quando o limite falhar", "usar uma topologia-fixture com interfaces, rotas, latência e perda esperadas e snapshots versionados", "código de automação, testes em laboratório, dashboard e demonstração de mudança/rollback"],
  ],
};

const capstoneProjectBlueprints: Record<ItCareerId, ModuleProjectBlueprint> = {
  frontend: { productName: "Portal web acessível", mission: "entregar busca, comparação e edição em uma interface acessível, performática, segura e observável", dataUse: "servir e atualizar a fixture por contratos versionados, com cache e estados de erro mensuráveis", verification: "jornada ponta a ponta, auditoria WCAG, orçamento de Web Vitals e trace correlacionado de uma falha" },
  backend: { productName: "Serviço multiusuário confiável", mission: "operar uma API autenticada com jobs idempotentes, limites de consistência e recuperação testada", dataUse: "persistir e processar a fixture por tenant, com transações, eventos versionados e trilha de auditoria", verification: "testes de contrato/carga, replay sem duplicidade e ensaio de failover dentro de RTO/RPO" },
  fullstack: { productName: "Produto web ponta a ponta", mission: "entregar uma jornada autenticada que atravesse interface, domínio, banco e integração sob falhas controladas", dataUse: "separar a fixture por tenant e preservar invariantes entre formulário, API, persistência, cache e job", verification: "teste E2E da jornada, trace de falha, teste de carga e demonstração de rollback compatível" },
  mobile: { productName: "Aplicativo móvel offline", mission: "oferecer consulta e ação principal offline-first com sincronização, segurança, telemetria e distribuição controlada", dataUse: "versionar a fixture no armazenamento local e reconciliar operações remotas por id, versão e timestamp", verification: "teste de oscilação de rede, conflito, crash por versão, desempenho e rollout/rollback em duas plataformas" },
  data_analytics_bi: { productName: "Sistema analítico executivo", mission: "publicar métricas governadas, dashboard e narrativa que sustentem uma decisão sem alegar causalidade indevida", dataUse: "transformar a fixture em fatos, dimensões e camada semântica com fórmula, granularidade, owner e linhagem", verification: "reconciliação automatizada dos KPIs, benchmark de consulta e memorando executivo com limitações" },
  data_science_ai: { productName: "Previsor probabilístico reproduzível", mission: "treinar, servir e governar previsões calibradas comparadas a uma baseline, com avaliação e monitoramento reproduzíveis", dataUse: "versionar fixture, split, features, parâmetros e modelo e impedir vazamento entre treino, validação e teste", verification: "model card, comparação de pelo menos dois modelos, calibração, API, drift e ensaio de rollback" },
  data_engineering: { productName: "Plataforma de dados batch e streaming", mission: "publicar data products idempotentes em batch e streaming com qualidade, catálogo, linhagem e SLO", dataUse: "ingerir versões da fixture em raw/staging/mart, tratar atraso e duplicidade e bloquear contrato inválido", verification: "reprocessamento sem duplicidade, teste de evento atrasado, dashboard de freshness e ensaio de recuperação" },
  devops_cloud: { productName: "Plataforma de implantação reproduzível", mission: "provisionar, implantar e operar um serviço por golden path seguro com SLO, custo e recuperação mensurados", dataUse: "usar o serviço da fixture como workload de referência e gerar carga/falhas determinísticas entre ambientes", verification: "pipeline, policy checks, dashboard, rollback, failover cronometrado e relatório de custo" },
  cybersecurity: { productName: "Laboratório de segurança verificável", mission: "proteger um serviço isolado, detectar cenários autorizados e executar contenção, recuperação e governança de evidências", dataUse: "classificar campos e fluxos sintéticos da fixture e correlacionar logs benignos e suspeitos por id e timestamp", verification: "threat model, controles como código, alertas, timeline de incidente e validação de detecções" },
  qa_automation: { productName: "Plataforma de qualidade baseada em risco", mission: "provisionar dados e executar cobertura UI, API, contrato e não funcional priorizada por risco", dataUse: "derivar fixtures, geradores e invariantes do esquema sem compartilhar estado entre execuções", verification: "matriz de risco, suíte determinística, traces, teste de carga/acessibilidade e scorecard de flakiness" },
  support_infra_networks: { productName: "Ambiente empresarial resiliente", mission: "operar identidade, rede e serviços híbridos com monitoramento, automação, backup e continuidade testada", dataUse: "usar a fixture em serviço interno replicado e correlacionar ativo, usuário sintético, incidente e mudança", verification: "runbooks, tickets, dashboards e ensaio cronometrado de failover e restauração dentro de RTO/RPO" },
};

type CareerStarterResource = {
  sourceType: ItCareerProjectSpec["data"]["sourceType"];
  scaffoldSpecification: string;
  dataInstructions: (interest: CareerInterestProfile) => string;
};

const careerStarterResources: Record<ItCareerId, CareerStarterResource> = {
  frontend: { sourceType: "synthetic_generator", scaffoldSpecification: "projeto Next.js com rota local /api/records, layout, tokens e testes configurados", dataInstructions: (interest) => interest.acquisitionInstructions },
  backend: { sourceType: "synthetic_generator", scaffoldSpecification: "projeto Node.js/TypeScript com servidor HTTP, migration inicial e suíte de integração", dataInstructions: (interest) => interest.acquisitionInstructions },
  fullstack: { sourceType: "synthetic_generator", scaffoldSpecification: "projeto Next.js full stack com banco local, autenticação fictícia e testes E2E", dataInstructions: (interest) => interest.acquisitionInstructions },
  mobile: { sourceType: "synthetic_generator", scaffoldSpecification: "projeto Expo/React Native com navegação, armazenamento local e mock server", dataInstructions: (interest) => interest.acquisitionInstructions },
  data_analytics_bi: { sourceType: "synthetic_generator", scaffoldSpecification: "projeto analítico com esquema, dicionário, consultas de validação e diretórios raw/staging/mart", dataInstructions: (interest) => interest.acquisitionInstructions },
  data_science_ai: { sourceType: "synthetic_generator", scaffoldSpecification: "projeto Python com ambiente fixado, gerador seed 42, notebook limpo, testes e tracking local", dataInstructions: (interest) => interest.acquisitionInstructions },
  data_engineering: { sourceType: "synthetic_generator", scaffoldSpecification: "projeto de dados com gerador seed 42, contratos, camadas raw/staging/mart e testes de qualidade", dataInstructions: (interest) => interest.acquisitionInstructions },
  devops_cloud: { sourceType: "synthetic_generator", scaffoldSpecification: "serviço containerizado com endpoint /records, health check e carga sintética", dataInstructions: (interest) => interest.acquisitionInstructions },
  cybersecurity: { sourceType: "synthetic_generator", scaffoldSpecification: "laboratório local isolado com serviço vulnerável apenas por configuração, logs e roteiro seguro de reset", dataInstructions: (interest) => interest.acquisitionInstructions },
  qa_automation: { sourceType: "synthetic_generator", scaffoldSpecification: "aplicação deliberadamente testável com API, UI, requisitos e defeitos seguros catalogados", dataInstructions: (interest) => interest.acquisitionInstructions },
  support_infra_networks: { sourceType: "synthetic_generator", scaffoldSpecification: "laboratório de duas VMs e um serviço interno com inventário, snapshots e procedimento de reset", dataInstructions: (interest) => interest.acquisitionInstructions },
};

const moduleProjectEffortRatio: Record<ItCareerLevelId, number> = {
  foundation: 0.22,
  junior: 0.28,
  mid: 0.34,
  senior: 0.4,
  specialist: 0.46,
};

const capstoneMinutesByLevel: Record<ItCareerLevelId, number> = {
  foundation: 1_800,
  junior: 2_400,
  mid: 3_000,
  senior: 4_200,
  specialist: 4_800,
};

const projectLevelRequirements: Record<ItCareerLevelId, string> = {
  foundation: "A execução deve funcionar localmente por um roteiro curto e comprovar o fluxo essencial com validações explícitas.",
  junior: "A entrega deve separar responsabilidades, validar entradas e cobrir o caminho principal e erros previsíveis com testes automatizados.",
  mid: "A entrega deve integrar ao menos uma fronteira externa ou assíncrona, medir o comportamento e recuperar uma falha injetada.",
  senior: "A entrega deve declarar SLO ou limite operacional, threat model e estratégia testada de degradação ou rollback.",
  specialist: "A entrega deve oferecer um caminho reutilizável, políticas versionadas, scorecard e análise de custo e evolução.",
};

function moduleProjectBlueprint(careerId: ItCareerId, moduleTitle: string): ModuleProjectBlueprint {
  const row = moduleProjectBlueprintRows[careerId].find(([title]) => title === moduleTitle);
  if (!row) throw new Error(`Blueprint de desafio ausente para ${careerId}/${moduleTitle}.`);
  const [, productName, mission, dataUse, verification] = row;
  return { productName, mission, dataUse, verification };
}

function guidedArtifact(input: {
  id: string;
  careerId: ItCareerId;
  interest: CareerInterestProfile;
  level: ItCareerLevelId;
  moduleTitle: string;
  blueprintModuleTitle?: string;
  moduleObjective: string;
  technicalConcepts: string[];
  estimatedMinutes: number;
  kind: "module_challenge" | "capstone";
  objectiveContextLabel?: string;
}): ItCareerArtifact {
  const { careerId, interest, level, kind } = input;
  const blueprint = careerProjectBlueprints[careerId];
  const starterResource = careerStarterResources[careerId];
  const isCapstone = kind === "capstone";
  const projectBlueprint = isCapstone
    ? capstoneProjectBlueprints[careerId]
    : moduleProjectBlueprint(careerId, input.blueprintModuleTitle ?? input.moduleTitle);
  const isInvestmentPortfolioLab = isCapstone && careerId === "data_science_ai" && interest.id === "investments";
  const productName = isInvestmentPortfolioLab ? "Portfolio Intelligence Lab" : projectBlueprint.productName;
  const title = isCapstone
    ? `TCC — ${productName} sobre ${interest.label}`
    : `Desafio do módulo — ${productName} sobre ${interest.label}`;
  const productDefinition = isInvestmentPortfolioLab
    ? "Desenvolva o Portfolio Intelligence Lab: um laboratório educacional que versiona dados sintéticos, ranqueia ativos fictícios, compara carteiras e executa backtests walk-forward com custos, liquidez, incerteza e limites explícitos."
    : isCapstone && careerId === "data_science_ai" && itCareerLevelIds.indexOf(level) >= itCareerLevelIds.indexOf("junior")
    ? `Desenvolva um sistema de IA capaz de analisar a ${interest.sourceLabel} e ${interest.predictiveOutcome}.`
    : `Desenvolva ${productName.toLocaleLowerCase("pt-BR")} para ${interest.context}. O produto deverá ${projectBlueprint.mission}.`;
  const audience = `${interest.targetAudience.charAt(0).toLocaleUpperCase("pt-BR")}${interest.targetAudience.slice(1)}`;
  const problemStatement = `${audience} precisam ${interest.primaryOutcome}. Neste projeto, ainda falta um fluxo capaz de ${projectBlueprint.mission}; o produto especificado deve resolver essa lacuna usando somente os dados sintéticos definidos.`;
  const baseFunctionalities = blueprint.baseFunctionalities(interest);
  const levelFunctions = isCapstone
    ? itCareerLevelIds.slice(0, itCareerLevelIds.indexOf(level) + 1).map((stage) => blueprint.levelFunctionalities[stage](interest))
    : [
        `${projectBlueprint.mission.charAt(0).toLocaleUpperCase("pt-BR")}${projectBlueprint.mission.slice(1)}.`,
        `${projectBlueprint.dataUse.charAt(0).toLocaleUpperCase("pt-BR")}${projectBlueprint.dataUse.slice(1)}.`,
        `${projectBlueprint.verification.charAt(0).toLocaleUpperCase("pt-BR")}${projectBlueprint.verification.slice(1)}.`,
      ];
  const functionalities = [...baseFunctionalities, ...levelFunctions].slice(0, 8);
  const technicalConcepts = uniqueText(input.technicalConcepts);
  const technicalCoverageRequirement = isCapstone
    ? "Integrar no produto as competências de todos os módulos listados em Conceitos técnicos e demonstrar onde cada uma participa da solução."
    : technicalConcepts.length
      ? "Aplicar no fluxo todos os assuntos listados em Conceitos técnicos e demonstrar onde cada um participa da solução."
      : `Documentar os conceitos técnicos aplicados no ${productName}.`;
  const mandatoryRequirements = [
    `O ${productName} deve ${projectBlueprint.mission}.`,
    `Na camada de dados, é obrigatório ${projectBlueprint.dataUse}.`,
    `Estruturar a solução como ${starterResource.scaffoldSpecification}; adaptações devem permanecer justificadas e reproduzíveis.`,
    ...blueprint.technicalRequirements,
    `A validação precisa produzir ${projectBlueprint.verification}.`,
    projectLevelRequirements[level],
    technicalCoverageRequirement,
    "Incluir testes automatizados ou verificações reproduzíveis para o fluxo principal e pelo menos dois cenários de falha.",
    input.objectiveContextLabel ? `Relacionar a apresentação da entrega ao objetivo de ${input.objectiveContextLabel}, sem alterar o escopo técnico.` : "Documentar decisões, limites conhecidos e como reproduzir o resultado.",
  ].slice(0, 8);
  const deliverables = [
    `${productName.charAt(0).toLocaleUpperCase("pt-BR")}${productName.slice(1)} funcional em um repositório versionado.`,
    `Gerador determinístico e arquivo de dados resultante (${interest.sourceLabel}), seguindo o esquema, o volume e a seed especificados.`,
    `Pacote de validação contendo ${projectBlueprint.verification}.`,
    "README com instalação, execução, arquitetura, decisões, limites e demonstração do fluxo principal.",
    isCapstone ? "Documento de arquitetura e operação, incluindo riscos, segurança, observabilidade e evolução." : "Relatório curto de validação com casos executados, resultado e correções realizadas.",
    "Vídeo curto, capturas ou relatório executável demonstrando o produto com a fixture definida.",
  ];
  const evaluationCriteria: ItCareerProjectEvaluationCriterion[] = [
    { id: "product", label: "Produto e funcionalidades", description: `O ${productName} executa a missão de ${projectBlueprint.mission} com estados de sucesso e falha observáveis.`, weightPercent: 30 },
    { id: "technical", label: "Aplicação técnica", description: `Os conceitos exigidos sustentam o funcionamento do ${productName} e as decisões técnicas são justificadas por resultados.`, weightPercent: 25 },
    { id: "data", label: "Dados e validação", description: `O fluxo demonstra corretamente como ${projectBlueprint.dataUse}, respeitando esquema, qualidade e reprodução.`, weightPercent: 15 },
    { id: "quality", label: "Qualidade e confiabilidade", description: `Os testes e relatórios comprovam ${projectBlueprint.verification} sem respostas ou resultados fixados manualmente.`, weightPercent: 15 },
    { id: "documentation", label: "Documentação e defesa", description: `Outra pessoa consegue executar, inspecionar e defender os limites do ${productName} seguindo a documentação.`, weightPercent: 15 },
  ];
  const submissionInstructions = [
    "Entregue o link do repositório na versão final marcada com uma tag ou release.",
    "Inclua no README um único comando ou uma sequência curta para gerar a fixture, executar o produto e rodar os testes.",
    "Anexe o relatório de validação e a demonstração do fluxo principal.",
  ];
  const projectSpec: ItCareerProjectSpec = {
    schemaVersion: 1,
    blueprintId: `${input.id}.${kind}.${level}`,
    projectKind: kind,
    interest: { id: interest.id, label: interest.label },
    projectTitle: title,
    productDefinition,
    problemStatement,
    targetAudience: interest.targetAudience,
    functionalities,
    data: {
      sourceType: starterResource.sourceType,
      sourceLabel: interest.sourceLabel,
      acquisitionInstructions: `${starterResource.dataInstructions(interest)} Para este projeto, ${projectBlueprint.dataUse}.`,
      entities: interest.entities,
      preparationRules: uniqueText([...interest.preparationRules, projectBlueprint.dataUse]),
    },
    technicalConcepts,
    mandatoryRequirements,
    deliverables,
    evaluationCriteria,
    submissionInstructions,
    implementationFreedom: "O produto, os dados mínimos e os critérios são fixos. Você decide a arquitetura interna, a organização do código e as bibliotecas compatíveis com a carreira, desde que justifique as escolhas.",
    outOfScope: ["Trocar o produto especificado por outra ideia.", "Usar dados pessoais, credenciais, conteúdo protegido ou sistemas de terceiros sem autorização.", "Fixar respostas finais manualmente para simular uma implementação funcional."],
  };
  const acceptanceCriteria = evaluationCriteria.map((criterion) => `${criterion.label} (${criterion.weightPercent}%): ${criterion.description}`);
  return {
    id: input.id,
    title,
    objective: productDefinition,
    scenario: problemStatement,
    requirements: mandatoryRequirements,
    constraints: mandatoryRequirements,
    deliverables,
    acceptanceCriteria,
    submissionInstructions: submissionInstructions.join(" "),
    evidence: "",
    estimatedMinutes: input.estimatedMinutes,
    projectSpec,
  };
}

const topicStudyMinuteBases: Record<ItCareerLevelId, number> = {
  foundation: 1_500,
  junior: 1_950,
  mid: 2_400,
  senior: 2_850,
  specialist: 3_300,
};

function deterministicTopicEstimates(level: ItCareerLevelId, title: string, subtopics: readonly string[]): Pick<ItCareerTopicTemplate, "studyMinutes" | "reviewMinutes" | "estimatedMinutes"> {
  const source = `${level}|${title}|${subtopics.join("|")}`;
  const hash = [...source].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 2_166_136_261);
  const complexityOffset = ((hash % 9) - 4) * 75;
  const studyMinutes = topicStudyMinuteBases[level] + complexityOffset;
  const reviewMinutes = Math.max(150, Math.round(studyMinutes * (0.16 + ((hash >>> 16) % 3) * 0.02)));
  return { studyMinutes, reviewMinutes, estimatedMinutes: studyMinutes };
}

function positionedOptions(correct: string, distractors: string[], seed: number): { options: string[]; correctOptionIndex: number } {
  const options = distractors.filter((option) => option !== correct).slice(0, 3);
  const correctOptionIndex = Math.abs(seed) % (options.length + 1);
  options.splice(correctOptionIndex, 0, correct);
  return { options, correctOptionIndex };
}

const dailyQuestionLevelBase: Record<ItCareerLevelId, number> = {
  foundation: 2,
  junior: 3,
  mid: 4,
  senior: 5,
  specialist: 6,
};

function dailyQuestionTimeAdjustment(minutesPerDay: number): number {
  if (minutesPerDay < 60) return 0;
  if (minutesPerDay < 90) return 1;
  if (minutesPerDay < 150) return 2;
  if (minutesPerDay < 240) return 3;
  return 4;
}

function dailyQuestionPolicy(targetLevel: ItCareerLevelId, minutesPerDay: number): ItCareerDailyQuestionPolicy {
  const minutesPerQuestion = 4;
  const levelBaseQuestions = dailyQuestionLevelBase[targetLevel];
  const timeAdjustmentQuestions = dailyQuestionTimeAdjustment(minutesPerDay);
  const capacityQuestions = Math.max(2, Math.floor((minutesPerDay * 0.3) / minutesPerQuestion));
  const questionsPerStudyDay = Math.min(10, levelBaseQuestions + timeAdjustmentQuestions, capacityQuestions);
  const minutesReservedPerStudyDay = questionsPerStudyDay * minutesPerQuestion;
  return {
    targetLevel,
    questionsPerStudyDay,
    minutesPerQuestion,
    minutesReservedPerStudyDay,
    levelBaseQuestions,
    timeAdjustmentQuestions,
    rationale: `São ${questionsPerStudyDay} perguntas objetivas por dia: ${levelBaseQuestions} pela profundidade escolhida (${itCareerLevelLabels[targetLevel]}) e +${timeAdjustmentQuestions} pelo tempo disponível. Elas reservam cerca de ${minutesReservedPerStudyDay} minutos da sua sessão de ${minutesPerDay} minutos.`,
  };
}

function studyDates(startDate: string, days: Set<number>, count: number): string[] {
  const dates: string[] = [];
  let cursor = startDate;
  for (let index = 0; dates.length < count && index < 36_600; index += 1) {
    if (days.has(new Date(`${cursor}T12:00:00Z`).getUTCDay())) dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  if (dates.length !== count) throw new Error("Não foi possível agendar as perguntas diárias.");
  return dates;
}

type SemanticQuestionLens = {
  prompt: string;
  action: string;
  evidence: string;
};

type SemanticQuestionSeed = {
  key: string;
  prompt: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
};

// Os cinco ângulos mudam com a profundidade. O banco de cada tópico combina
// esses ângulos com seus subtópicos e com o objetivo técnico do módulo; o tema
// de interesse só é interpolado depois, no enunciado, e nunca muda o gabarito.
const semanticQuestionLenses: Record<ItCareerLevelId, readonly SemanticQuestionLens[]> = {
  foundation: [
    { prompt: "qual decisão identifica corretamente o papel de", action: "Usar", evidence: "uma saída simples que comprove" },
    { prompt: "qual sequência mínima permite praticar", action: "Preparar, executar e conferir", evidence: "um registro reproduzível de" },
    { prompt: "qual verificação mostra que o fundamento de", action: "Comparar o resultado de", evidence: "um exemplo válido e um limite de" },
    { prompt: "qual explicação reconhece uma limitação real de", action: "Documentar onde aplicar", evidence: "a condição em que deixa de bastar" },
    { prompt: "qual procedimento torna o exercício de", action: "Repetir desde uma entrada limpa", evidence: "o mesmo resultado observável para" },
  ],
  junior: [
    { prompt: "qual implementação transforma em comportamento verificável", action: "Implementar um contrato para", evidence: "casos de aceite de" },
    { prompt: "qual teste protege o uso correto de", action: "Testar caminho principal e entrada inválida de", evidence: "a resposta esperada de" },
    { prompt: "qual tratamento impede uma falha previsível em", action: "Validar antes e retornar erro explícito em", evidence: "a recuperação de" },
    { prompt: "qual integração mantém responsabilidades claras ao usar", action: "Isolar a fronteira de", evidence: "um contrato entre" },
    { prompt: "qual refatoração preserva o comportamento de", action: "Separar e renomear", evidence: "testes verdes para" },
  ],
  mid: [
    { prompt: "qual diagnóstico isola a causa de uma divergência em", action: "Correlacionar entrada, estado e saída de", evidence: "uma hipótese testável sobre" },
    { prompt: "qual contrato reduz acoplamento ao integrar", action: "Versionar a interface de", evidence: "compatibilidade entre" },
    { prompt: "qual medição permite avaliar a decisão sobre", action: "Definir baseline e medir", evidence: "uma métrica e seu limite para" },
    { prompt: "qual mecanismo recupera uma falha parcial em", action: "Detectar, registrar e repetir com idempotência", evidence: "a ausência de duplicidade em" },
    { prompt: "qual análise explicita o trade-off de", action: "Comparar duas alternativas para", evidence: "impacto, custo e risco sobre" },
  ],
  senior: [
    { prompt: "qual decisão arquitetural define uma fronteira sustentável para", action: "Declarar invariantes e dependências de", evidence: "um diagrama e decisão sobre" },
    { prompt: "qual estratégia preserva consistência ou disponibilidade em", action: "Escolher e testar o modelo de falha de", evidence: "o comportamento degradado de" },
    { prompt: "qual controle reduz a superfície de risco de", action: "Aplicar menor privilégio e validação a", evidence: "tentativas permitidas e negadas de" },
    { prompt: "qual SLO torna operável a escolha de", action: "Definir indicador, objetivo e alerta para", evidence: "latência, erro ou capacidade de" },
    { prompt: "qual telemetria permite explicar uma falha em", action: "Correlacionar log, métrica e trace de", evidence: "a causa e a recuperação de" },
  ],
  specialist: [
    { prompt: "qual capacidade de plataforma torna reutilizável", action: "Oferecer por template ou API", evidence: "adoção e tempo de entrega de" },
    { prompt: "qual política governa a evolução de", action: "Versionar regras e responsáveis por", evidence: "conformidade e exceções de" },
    { prompt: "qual experimento otimiza sem degradar", action: "Comparar baseline e variante de", evidence: "qualidade, custo e regressão de" },
    { prompt: "qual padrão reduz variação entre equipes ao aplicar", action: "Codificar um golden path para", evidence: "scorecards consistentes de" },
    { prompt: "qual estratégia permite evoluir com compatibilidade", action: "Publicar migração e janela de depreciação de", evidence: "consumidores antigos e novos de" },
  ],
};

function lowerInitial(value: string): string {
  return `${value.charAt(0).toLocaleLowerCase("pt-BR")}${value.slice(1)}`;
}

function semanticQuestionBank(topic: ItCareerPlanTopic, module: ItCareerPlanModule): SemanticQuestionSeed[] {
  const lenses = semanticQuestionLenses[module.level];
  const moduleConcepts = uniqueText(module.topics.flatMap((candidate) => [candidate.title, ...candidate.subtopics]));
  const bankSize = Math.max(10, topic.subtopics.length * lenses.length);
  return Array.from({ length: bankSize }, (_, index) => {
    const lens = lenses[index % lenses.length];
    const focus = topic.subtopics[index % topic.subtopics.length];
    const companion = topic.subtopics[(index + 1) % topic.subtopics.length];
    const alternate = moduleConcepts.find((concept) => concept !== focus && concept !== companion && concept !== topic.title)
      ?? topic.title;
    const objective = lowerInitial(module.objective).replace(/\.$/, "");
    const correct = `${lens.action} ${focus} em conjunto com ${companion} e produzir ${lens.evidence} ${alternate}.`;
    return {
      key: `${module.level}.${index + 1}.${slug(focus)}.${slug(companion)}`,
      prompt: `A equipe precisa ${objective}; ${lens.prompt} “${focus}” dentro de “${topic.title}”?`,
      correct,
      distractors: [
        `Aplicar ${focus} sem definir como ${companion} será observado e aceitar qualquer saída de ${alternate}.`,
        `Substituir ${focus} por ${alternate} e retirar a validação relacionada a ${companion}.`,
        `Declarar “${topic.title}” concluído porque ${focus} foi citado, sem produzir ${lens.evidence} ${alternate}.`,
      ],
      explanation: `${correct} Isso preserva o objetivo técnico de “${module.title}”; o assunto de interesse altera somente o cenário da pergunta.`,
    };
  });
}

function dailyQuestionFor(
  topic: ItCareerPlanTopic,
  module: ItCareerPlanModule,
  sessionIndex: number,
  questionIndex: number,
  scheduledDate: string,
  interest: CareerInterestProfile,
): ItCareerQuestion {
  const bank = semanticQuestionBank(topic, module);
  const questionSeed = bank[(sessionIndex * 3 + questionIndex) % bank.length];
  const optionSeed = [...`${topic.id}|${questionSeed.key}|${sessionIndex}|${questionIndex}`]
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const answer = positionedOptions(questionSeed.correct, questionSeed.distractors, optionSeed);
  return {
    id: `${topic.id}.daily.${sessionIndex + 1}.question.${questionIndex + 1}`,
    type: "multiple_choice",
    prompt: `No estudo de ${scheduledDate}, considerando ${interest.context}, ${questionSeed.prompt}`,
    options: answer.options,
    correctOptionIndex: answer.correctOptionIndex,
    correctOrder: [],
    explanation: questionSeed.explanation,
  };
}

function buildCatalog(seed: CareerSeed): ItCareerCatalog {
  const defaultInterest = interestProfiles.technology;
  const levels = Object.fromEntries(itCareerLevelIds.map((level) => {
    const modules = seed.levels[level].map((moduleSeed, moduleIndex): ItCareerModuleTemplate => {
      const moduleId = `${seed.id}.${level}.${moduleIndex + 1}.${slug(moduleSeed.title)}`;
      const topics = moduleSeed.topics.map(([title, subtopics], topicIndex): ItCareerTopicTemplate => {
        const id = `${moduleId}.topic.${topicIndex + 1}.${slug(title)}`;
        const estimates = deterministicTopicEstimates(level, title, subtopics);
        return {
          id,
          title,
          subtopics: [...subtopics],
          competence: `Aplicar ${title} considerando ${subtopics.join(", ")}.`,
          ...estimates,
        };
      });
      const project = guidedArtifact({
        id: `${moduleId}.project`,
        careerId: seed.id,
        interest: defaultInterest,
        level,
        moduleTitle: moduleSeed.title,
        moduleObjective: moduleSeed.objective,
        technicalConcepts: topics.flatMap((topic) => [topic.title, ...topic.subtopics]),
        estimatedMinutes: Math.round(topics.reduce((sum, topic) => sum + topic.studyMinutes, 0) * moduleProjectEffortRatio[level]),
        kind: "module_challenge",
      });
      return { id: moduleId, title: moduleSeed.title, objective: moduleSeed.objective, successCriteria: `Entregar e explicar uma solução que combine ${topics.map((topic) => topic.title).join(" e ")}.`, level, topics, project };
    });
    return [level, { title: itCareerLevelLabels[level], competenceStatement: levelCompetence[level], modules }];
  })) as ItCareerCatalog["levels"];
  return {
    schemaVersion: 4,
    id: seed.id,
    version: 4,
    title: seed.title,
    description: seed.description,
    levels,
    capstone: guidedArtifact({
      id: `${seed.id}.capstone`,
      careerId: seed.id,
      interest: defaultInterest,
      level: "specialist",
      moduleTitle: seed.capstoneTitle,
      moduleObjective: seed.capstoneScenario,
      technicalConcepts: itCareerLevelIds.flatMap((level) => levels[level].modules.map((module) => module.title)),
      estimatedMinutes: 4_800,
      kind: "capstone",
    }),
  };
}

const seeds: CareerSeed[] = [
  {
    id: "frontend", title: "Desenvolvimento Front-end", description: "Interfaces web acessíveis e robustas com TypeScript, React e Next.js.",
    capstoneTitle: "TCC — Aplicação web acessível, testada e observável", capstoneScenario: "Construir um produto web completo, responsivo, seguro, mensurável e pronto para evolução.",
    levels: {
      foundation: [mod("Web, HTTP e Git", "Entender a entrega de uma aplicação web e trabalhar com histórico confiável.", ["Web e HTTP", ["cliente e servidor", "requisição e resposta", "status e cabeçalhos"]], ["Git e GitHub", ["working tree e staging", "commits e histórico", "branches e pull requests"]]), mod("HTML e CSS", "Criar páginas semânticas, responsivas e acessíveis.", ["HTML semântico", ["estrutura do documento", "formulários", "SEO básico"]], ["CSS e layout responsivo", ["cascade e especificidade", "Flexbox e Grid", "media queries"]])],
      junior: [mod("JavaScript e TypeScript", "Implementar comportamento previsível com tipos.", ["JavaScript moderno", ["funções e escopo", "arrays e objetos", "assincronicidade"]], ["TypeScript", ["tipos e interfaces", "narrowing", "generics básicos"]]), mod("React e Next.js", "Construir interfaces componentizadas com navegação e dados.", ["React", ["componentes e props", "estado e efeitos", "composição"]], ["Next.js essencial", ["App Router", "Server e Client Components", "rotas e dados"]])],
      mid: [mod("Estado, dados e formulários", "Integrar estado local, servidor e validação.", ["Gerenciamento de estado", ["estado local", "cache de servidor", "sincronização"]], ["Formulários e APIs", ["validação", "erros e loading", "mutações seguras"]]), mod("Qualidade e design systems", "Manter uma interface consistente e testável.", ["Testes de front-end", ["unitários", "integração", "E2E"]], ["Design systems", ["tokens", "componentes acessíveis", "documentação"]])],
      senior: [mod("Arquitetura e renderização", "Escolher estratégias de renderização e fronteiras sustentáveis.", ["Arquitetura front-end", ["domínios e módulos", "dependências", "microfrontends e trade-offs"]], ["Estratégias de renderização", ["SSR e SSG", "streaming", "cache e invalidação"]]), mod("Performance, segurança e observabilidade", "Operar aplicações rápidas e seguras em produção.", ["Performance web", ["Core Web Vitals", "bundles", "imagens e fontes"]], ["Segurança e observabilidade", ["XSS e CSP", "telemetria", "erros e tracing"]])],
      specialist: [mod("Plataforma e internals", "Aprofundar runtime, compilação e experiência de desenvolvimento.", ["Internals do navegador", ["rendering pipeline", "event loop", "memória"]], ["Plataforma front-end", ["toolchains", "CI e previews", "contratos e templates"]]), mod("Governança e escala", "Evoluir múltiplos produtos com padrões mensuráveis.", ["Governança técnica", ["RFCs", "compatibilidade", "migrações"]], ["Performance avançada", ["profiling", "RUM", "orçamentos e regressões"]])],
    },
  },
  {
    id: "backend", title: "Desenvolvimento Back-end", description: "APIs e serviços confiáveis com Node.js, TypeScript e PostgreSQL.",
    capstoneTitle: "TCC — Serviço multiusuário confiável", capstoneScenario: "Entregar um serviço com autenticação, persistência, jobs, testes, segurança e observabilidade.",
    levels: {
      foundation: [mod("Lógica, Linux e Git", "Criar uma base operacional para desenvolvimento de serviços.", ["Lógica de programação", ["controle de fluxo", "funções", "estruturas de dados"]], ["Linux, terminal e Git", ["processos e arquivos", "shell", "versionamento"]]), mod("HTTP e bancos relacionais", "Entender comunicação web e persistência estruturada.", ["HTTP e APIs", ["métodos e status", "headers", "JSON"]], ["SQL e modelagem", ["tabelas e chaves", "consultas", "normalização"]])],
      junior: [mod("Node.js e APIs", "Implementar APIs tipadas e organizadas.", ["Node.js e TypeScript", ["runtime", "módulos", "tratamento de erros"]], ["APIs REST", ["recursos", "validação", "paginação"]]), mod("Persistência, autenticação e testes", "Proteger e testar operações de dados.", ["PostgreSQL na aplicação", ["transações", "índices", "migrations"]], ["Autenticação e testes", ["sessões e tokens", "autorização", "testes de integração"]])],
      mid: [mod("Arquitetura modular e integrações", "Separar domínios e integrar serviços externos.", ["Arquitetura modular", ["camadas", "domínios", "injeção de dependência"]], ["Integrações robustas", ["timeouts", "idempotência", "webhooks"]]), mod("Filas, cache e observabilidade", "Operar cargas assíncronas e reduzir latência.", ["Mensageria e jobs", ["filas", "retentativas", "dead letters"]], ["Cache e telemetria", ["Redis", "métricas", "logs e tracing"]])],
      senior: [mod("Sistemas distribuídos", "Decidir consistência e resiliência entre serviços.", ["Consistência distribuída", ["transações", "sagas", "eventual consistency"]], ["Resiliência", ["circuit breaker", "backpressure", "degradação"]]), mod("Escala e segurança", "Projetar serviços de alto volume e superfície controlada.", ["Escalabilidade", ["particionamento", "replicação", "balanceamento"]], ["Segurança de APIs", ["ameaças", "rate limiting", "segredos e auditoria"]])],
      specialist: [mod("Plataforma de APIs", "Padronizar entrega, contratos e operação de serviços.", ["Contratos e gateways", ["OpenAPI", "versionamento", "políticas"]], ["Developer platform", ["templates", "self-service", "golden paths"]]), mod("Alta disponibilidade e multi-região", "Operar dados e serviços além de uma região.", ["Arquitetura multi-região", ["failover", "latência", "roteamento"]], ["Dados em escala", ["sharding", "CDC", "recuperação"]])],
    },
  },
  {
    id: "fullstack", title: "Desenvolvimento Full Stack", description: "Produtos completos com React/Next.js, Node.js e PostgreSQL.",
    capstoneTitle: "TCC — Produto SaaS ponta a ponta", capstoneScenario: "Construir um SaaS com interface, API, banco, autenticação, testes, deploy e métricas.",
    levels: {
      foundation: [mod("Web, Git e programação", "Entender o fluxo completo de uma aplicação web.", ["Web e HTTP", ["cliente e servidor", "protocolo", "JSON"]], ["Git e JavaScript", ["commits", "lógica", "assincronicidade"]]), mod("Interface e dados", "Criar páginas e persistir informação básica.", ["HTML e CSS", ["semântica", "layout", "acessibilidade"]], ["SQL", ["modelagem", "consultas", "integridade"]])],
      junior: [mod("React e Next.js", "Construir a experiência do produto.", ["React", ["componentes", "estado", "formulários"]], ["Next.js", ["rotas", "renderização", "mutações"]]), mod("API, banco e autenticação", "Implementar o núcleo seguro do produto.", ["APIs Node.js", ["validação", "erros", "contratos"]], ["Persistência e identidade", ["PostgreSQL", "sessões", "autorização"]])],
      mid: [mod("Arquitetura ponta a ponta", "Definir fronteiras claras entre UI, domínio e dados.", ["Arquitetura full stack", ["domínios", "camadas", "contratos"]], ["Jobs e integrações", ["filas", "webhooks", "idempotência"]]), mod("Qualidade, cache e observabilidade", "Entregar mudanças seguras e operar o produto.", ["Testes completos", ["unitários", "integração", "E2E"]], ["Cache e telemetria", ["invalidação", "métricas", "tracing"]])],
      senior: [mod("Escala e confiabilidade", "Projetar um produto resiliente em crescimento.", ["Escala ponta a ponta", ["CDN", "filas", "banco"]], ["Confiabilidade", ["SLOs", "degradação", "incidentes"]]), mod("Segurança e decisões de produto", "Equilibrar risco, custo e experiência.", ["Segurança full stack", ["OWASP", "segredos", "auditoria"]], ["Trade-offs de produto", ["experimentação", "custos", "evolução"]])],
      specialist: [mod("Plataforma full stack", "Criar caminhos padronizados de desenvolvimento e entrega.", ["Developer experience", ["templates", "ambientes", "CI/CD"]], ["Plataforma de componentes e APIs", ["design system", "contratos", "governança"]]), mod("Multi-região e governança", "Evoluir ecossistemas de produtos com consistência.", ["Arquitetura multi-região", ["dados", "roteamento", "failover"]], ["Governança arquitetural", ["RFCs", "métricas", "migrações"]])],
    },
  },
  {
    id: "mobile", title: "Desenvolvimento Mobile", description: "Aplicativos multiplataforma com React Native e Expo.",
    capstoneTitle: "TCC — Aplicativo distribuído e offline", capstoneScenario: "Entregar um app com autenticação, dados remotos, modo offline, testes, telemetria e distribuição.",
    levels: {
      foundation: [mod("Programação, Git e UX móvel", "Entender o ciclo de um aplicativo e as limitações do dispositivo.", ["Programação e TypeScript", ["funções", "tipos", "assincronicidade"]], ["Git e UX móvel", ["versionamento", "navegação", "touch e acessibilidade"]]), mod("Plataformas móveis", "Compreender componentes nativos e ciclo de vida.", ["Android e iOS", ["processos", "permissões", "lojas"]], ["Layout responsivo", ["densidade", "safe areas", "teclado"]])],
      junior: [mod("React Native e Expo", "Construir telas e navegação consistentes.", ["Componentes React Native", ["views", "listas", "estilos"]], ["Expo e navegação", ["rotas", "assets", "builds"]]), mod("Estado, APIs e armazenamento", "Conectar o app a dados locais e remotos.", ["Estado e rede", ["cache", "loading", "erros"]], ["Persistência e testes", ["storage", "segredos", "testes"]])],
      mid: [mod("Offline-first e sincronização", "Manter o produto útil sem conexão confiável.", ["Dados offline", ["fila local", "conflitos", "reconciliação"]], ["Sincronização", ["idempotência", "versionamento", "background tasks"]]), mod("Nativo, performance e releases", "Integrar recursos do aparelho e operar lançamentos.", ["APIs nativas", ["câmera", "notificações", "deep links"]], ["Performance e distribuição", ["profiling", "OTA", "lojas"]])],
      senior: [mod("Arquitetura modular", "Separar domínios e reduzir acoplamento entre plataformas.", ["Arquitetura mobile", ["módulos", "dependências", "feature flags"]], ["Segurança mobile", ["secure storage", "integridade", "ameaças"]]), mod("Observabilidade e escala", "Diagnosticar comportamento real em muitos dispositivos.", ["Telemetria mobile", ["crashes", "traces", "RUM"]], ["Escala de produto", ["compatibilidade", "rollouts", "experimentos"]])],
      specialist: [mod("SDKs e internals", "Criar abstrações nativas e compreender o runtime.", ["Bridges e módulos nativos", ["JSI", "threads", "interop"]], ["Internals de renderização", ["reconciliação", "layout", "memória"]]), mod("Plataforma mobile", "Padronizar builds, componentes e observabilidade.", ["Mobile platform", ["templates", "CI", "assinatura"]], ["Governança de apps", ["políticas", "compatibilidade", "migrações"]])],
    },
  },
  {
    id: "data_analytics_bi", title: "Análise de Dados e BI", description: "Decisões por dados com SQL, Power BI e Python.",
    capstoneTitle: "TCC — Sistema analítico executivo", capstoneScenario: "Entregar tratamento, modelo, métricas, dashboard, narrativa e governança de um problema de negócio.",
    levels: {
      foundation: [mod("Alfabetização de dados", "Interpretar dados sem confundir medida, causa e opinião.", ["Tipos e qualidade de dados", ["dimensões e métricas", "granularidade", "ausências"]], ["Estatística descritiva", ["distribuição", "média e mediana", "variabilidade"]]), mod("Planilhas e ética", "Organizar análises reproduzíveis e responsáveis.", ["Planilhas", ["fórmulas", "tabelas", "validação"]], ["Ética e privacidade", ["viés", "LGPD", "uso responsável"]])],
      junior: [mod("SQL e limpeza", "Consultar e preparar dados confiáveis.", ["SQL analítico", ["joins", "agregações", "window functions"]], ["Limpeza de dados", ["tipos", "duplicatas", "regras"]]), mod("Power BI e storytelling", "Construir um modelo e comunicar decisões.", ["Modelagem dimensional", ["fatos", "dimensões", "relacionamentos"]], ["Dashboards", ["DAX básico", "visualização", "narrativa"]])],
      mid: [mod("SQL, DAX e Power Query avançados", "Resolver transformações e métricas complexas.", ["SQL avançado", ["CTEs", "planos", "otimização"]], ["DAX e Power Query", ["contexto", "time intelligence", "M"]]), mod("Python, métricas e experimentos", "Automatizar análises e definir indicadores úteis.", ["Pandas", ["transformações", "profiling", "automação"]], ["Métricas e experimentos", ["North Star", "funil", "teste A/B"]])],
      senior: [mod("Camada semântica e governança", "Padronizar métricas e propriedade dos dados.", ["Camada semântica", ["contratos", "métricas", "reuso"]], ["Governança analítica", ["catálogo", "acesso", "linhagem"]]), mod("Performance e decisão executiva", "Operar BI em escala e orientar escolhas difíceis.", ["Performance de BI", ["modelo", "refresh", "capacidade"]], ["Decisão executiva", ["cenários", "incerteza", "recomendação"]])],
      specialist: [mod("Plataforma analítica", "Criar uma experiência self-service controlada.", ["Analytics platform", ["ingestão", "modelos", "serving"]], ["Self-service", ["governança", "templates", "enablement"]]), mod("Analytics engineering e estratégia", "Conectar arquitetura analítica a resultados organizacionais.", ["Analytics engineering", ["dbt", "testes", "documentação"]], ["Estratégia de dados", ["portfólio", "ROI", "maturidade"]])],
    },
  },
  {
    id: "data_science_ai", title: "Ciência de Dados e Inteligência Artificial", description: "Produtos de dados e IA com Python, estatística e aprendizado de máquina.",
    capstoneTitle: "TCC — Produto de IA reproduzível", capstoneScenario: "Entregar experimento, modelo, API, avaliação, monitoramento, documentação e análise de riscos.",
    levels: {
      foundation: [mod("Python, SQL e dados", "Manipular dados de forma reproduzível.", ["Python científico", ["NumPy", "Pandas", "notebooks"]], ["SQL para ciência de dados", ["consultas", "amostragem", "features"]]), mod("Matemática e estatística", "Compreender incerteza e relações quantitativas.", ["Probabilidade e estatística", ["distribuições", "inferência", "viés"]], ["Álgebra e otimização", ["vetores", "matrizes", "gradiente"]])],
      junior: [mod("EDA e features", "Investigar dados e preparar sinais úteis.", ["Análise exploratória", ["distribuições", "outliers", "visualização"]], ["Feature engineering", ["codificação", "escala", "vazamento"]]), mod("Modelos e avaliação", "Treinar e comparar modelos básicos corretamente.", ["Aprendizado supervisionado", ["regressão", "classificação", "árvores"]], ["Avaliação", ["validação", "métricas", "baseline"]])],
      mid: [mod("Experimentos e tuning", "Aumentar desempenho sem perder validade.", ["Experimentação", ["hipóteses", "cross-validation", "tracking"]], ["Tuning e ensembles", ["busca", "regularização", "boosting"]]), mod("Domínios e produção", "Aplicar modelos especializados e disponibilizá-los.", ["Séries temporais e NLP", ["forecast", "texto", "embeddings"]], ["Deploy e monitoramento", ["API", "drift", "latência"]])],
      senior: [mod("MLOps e IA responsável", "Operar modelos com governança e segurança.", ["MLOps", ["pipelines", "registry", "reprodutibilidade"]], ["IA responsável", ["fairness", "explicabilidade", "privacidade"]]), mod("GenAI e RAG", "Projetar soluções generativas avaliáveis e seguras.", ["LLMs e prompting", ["tokens", "contexto", "structured outputs"]], ["RAG e agentes", ["retrieval", "avaliação", "guardrails"]])],
      specialist: [mod("Modelos fundacionais", "Adaptar modelos e dados a domínios complexos.", ["Fine-tuning", ["datasets", "PEFT", "avaliação"]], ["Arquiteturas modernas", ["transformers", "multimodal", "mixture of experts"]]), mod("Inferência e plataforma de IA", "Otimizar serving e governar múltiplos produtos de IA.", ["Inferência eficiente", ["quantização", "batching", "caching"]], ["AI platform", ["feature store", "evals", "governança"]])],
    },
  },
  {
    id: "data_engineering", title: "Engenharia de Dados", description: "Pipelines batch e streaming com Python, dbt, Airflow, Spark e Kafka.",
    capstoneTitle: "TCC — Plataforma de dados batch e streaming", capstoneScenario: "Entregar ingestão, transformação, qualidade, catálogo, observabilidade e consumo confiável de dados.",
    levels: {
      foundation: [mod("SQL, Python e Git", "Construir transformações legíveis e versionadas.", ["SQL", ["joins", "agregações", "modelagem"]], ["Python e Git", ["arquivos", "APIs", "versionamento"]]), mod("Linux e modelagem de dados", "Trabalhar com sistemas e estruturas analíticas.", ["Linux e shell", ["processos", "permissões", "automação"]], ["Modelagem", ["normalização", "dimensional", "particionamento"]])],
      junior: [mod("ETL, ELT e warehouse", "Mover e transformar dados de maneira reexecutável.", ["Pipelines ETL/ELT", ["extração", "carga", "incremental"]], ["Warehouse e lake", ["formatos", "camadas", "partições"]]), mod("dbt, orquestração e qualidade", "Organizar dependências e validar contratos.", ["dbt", ["models", "tests", "docs"]], ["Airflow e qualidade", ["DAGs", "retries", "data tests"]])],
      mid: [mod("Processamento distribuído", "Processar grandes volumes com eficiência.", ["Spark", ["DataFrames", "shuffle", "tuning"]], ["Cloud data", ["storage", "compute", "IAM"]]), mod("Streaming e observabilidade", "Operar fluxos contínuos e detectar falhas.", ["Kafka e streaming", ["topics", "partitions", "semântica de entrega"]], ["Observabilidade de dados", ["freshness", "volume", "linhagem"]])],
      senior: [mod("Lakehouse e escala", "Projetar uma arquitetura de dados sustentável.", ["Lakehouse", ["table formats", "catalog", "ACID"]], ["Escala e custo", ["particionamento", "autoscaling", "FinOps"]]), mod("Segurança, metadados e contratos", "Governar dados entre produtores e consumidores.", ["Segurança de dados", ["acesso", "criptografia", "mascaramento"]], ["Contratos e linhagem", ["schemas", "ownership", "impact analysis"]])],
      specialist: [mod("Plataforma self-service", "Permitir que times publiquem dados com segurança.", ["Data platform", ["templates", "orquestração", "observabilidade"]], ["Data products", ["SLOs", "contratos", "descoberta"]]), mod("Federação e multi-região", "Coordenar domínios e continuidade global.", ["Data mesh", ["domínios", "governança federada", "interoperabilidade"]], ["Arquitetura multi-região", ["replicação", "residência", "recuperação"]])],
    },
  },
  {
    id: "devops_cloud", title: "DevOps e Cloud", description: "Infraestrutura, entrega e confiabilidade com containers, IaC, Kubernetes e SRE.",
    capstoneTitle: "TCC — Plataforma de implantação reproduzível", capstoneScenario: "Entregar IaC, CI/CD, observabilidade, segurança, recuperação e documentação operacional.",
    levels: {
      foundation: [mod("Linux e shell", "Administrar processos, arquivos e automações básicas.", ["Linux", ["processos", "permissões", "serviços"]], ["Shell e Git", ["scripts", "pipes", "versionamento"]]), mod("Redes e cloud", "Entender conectividade e serviços de nuvem.", ["Redes", ["TCP/IP", "DNS", "HTTP e TLS"]], ["Fundamentos de cloud", ["regiões", "responsabilidade compartilhada", "custos"]])],
      junior: [mod("Containers e CI/CD", "Empacotar e entregar aplicações de forma repetível.", ["Docker", ["imagens", "volumes", "redes"]], ["CI/CD", ["pipelines", "artefatos", "deploy"]]), mod("AWS e monitoramento", "Operar compute, storage, identidade e sinais básicos.", ["Compute, storage e IAM", ["EC2", "S3", "papéis"]], ["Monitoramento", ["métricas", "logs", "alertas"]])],
      mid: [mod("Terraform e Kubernetes", "Provisionar e orquestrar infraestrutura declarativa.", ["Terraform", ["state", "modules", "plans"]], ["Kubernetes", ["workloads", "services", "configuração"]]), mod("SRE, secrets e incidentes", "Operar confiabilidade e responder a falhas.", ["SRE", ["SLIs", "SLOs", "error budget"]], ["Segredos e incidentes", ["vaults", "runbooks", "post-mortems"]])],
      senior: [mod("Alta disponibilidade e recuperação", "Projetar continuidade diante de falhas severas.", ["HA e DR", ["RTO e RPO", "replicação", "failover"]], ["Arquitetura resiliente", ["multi-AZ", "degradação", "capacity planning"]]), mod("FinOps, zero trust e supply chain", "Controlar custo e risco da plataforma.", ["FinOps", ["alocação", "otimização", "forecast"]], ["Segurança da entrega", ["zero trust", "SBOM", "assinatura"]])],
      specialist: [mod("Developer platform", "Criar self-service com padrões seguros.", ["Platform engineering", ["portais", "golden paths", "scorecards"]], ["Policy as code", ["admission", "compliance", "drift"]]), mod("Híbrido, multicloud e SRE organizacional", "Governar operações em múltiplos ambientes.", ["Híbrido e multicloud", ["conectividade", "portabilidade", "lock-in"]], ["SRE organizacional", ["maturidade", "priorização", "governança"]])],
    },
  },
  {
    id: "cybersecurity", title: "Cibersegurança", description: "Prevenção, detecção e resposta em aplicações, cloud e ambientes corporativos.",
    capstoneTitle: "TCC — Programa de segurança verificável", capstoneScenario: "Entregar threat model, hardening, detecção, resposta, evidências e plano de melhoria de um ambiente.",
    levels: {
      foundation: [mod("Linux, redes e web", "Compreender a superfície técnica que precisa ser protegida.", ["Linux e sistemas", ["processos", "permissões", "logs"]], ["Redes e web", ["TCP/IP", "DNS", "HTTP e TLS"]]), mod("Fundamentos de segurança", "Aplicar princípios básicos de proteção e análise.", ["Princípios de segurança", ["CIA", "menor privilégio", "defesa em profundidade"]], ["Criptografia e identidade", ["hash", "chaves", "autenticação"]])],
      junior: [mod("IAM, hardening e vulnerabilidades", "Reduzir exposição e controlar identidades.", ["IAM e hardening", ["papéis", "baselines", "patching"]], ["Gestão de vulnerabilidades", ["scanning", "priorização", "remediação"]]), mod("SIEM, incidentes e OWASP", "Detectar sinais e responder a ataques comuns.", ["SIEM e resposta", ["eventos", "correlação", "playbooks"]], ["OWASP", ["injeção", "controle de acesso", "XSS"]])],
      mid: [mod("Threat modeling e AppSec", "Antecipar ameaças e integrar segurança ao software.", ["Threat modeling", ["ativos", "STRIDE", "controles"]], ["AppSec", ["SAST e DAST", "code review", "secrets"]]), mod("Cloud, containers e forense", "Proteger workloads modernos e investigar evidências.", ["Cloud e containers", ["IAM", "network policies", "images"]], ["Detecção e forense", ["telemetria", "timeline", "cadeia de custódia"]])],
      senior: [mod("Zero trust e DevSecOps", "Projetar controles contínuos e verificáveis.", ["Zero trust", ["identidade", "segmentação", "verificação"]], ["DevSecOps", ["pipelines", "policy as code", "supply chain"]]), mod("Arquitetura, risco e SOC", "Conectar ameaças técnicas a prioridades organizacionais.", ["Arquitetura de segurança", ["zonas", "controles", "resiliência"]], ["Risco e SOC", ["frameworks", "métricas", "operações"]])],
      specialist: [mod("Plataforma e purple team", "Escalar controles e validar detecções.", ["Security platform", ["self-service", "guardrails", "evidências"]], ["Purple team", ["emulação", "detecção", "melhoria"]]), mod("Criptografia aplicada e estratégia", "Decidir controles avançados e direção de segurança.", ["Criptografia aplicada", ["PKI", "KMS", "protocolos"]], ["Estratégia de segurança", ["portfólio", "governança", "ameaças emergentes"]])],
    },
  },
  {
    id: "qa_automation", title: "QA e Automação de Testes", description: "Qualidade contínua com testes de UI, API, integração e requisitos não funcionais.",
    capstoneTitle: "TCC — Estratégia e plataforma de qualidade", capstoneScenario: "Entregar estratégia baseada em risco e suíte automatizada de UI, API, integração e testes não funcionais.",
    levels: {
      foundation: [mod("Ciclo de software e testes", "Entender como qualidade participa de toda a entrega.", ["Ciclo de desenvolvimento", ["requisitos", "versionamento", "CI"]], ["Fundamentos de teste", ["níveis", "tipos", "pirâmide"]]), mod("Git, HTTP e SQL", "Investigar sistemas e preparar dados de teste.", ["Git e colaboração", ["commits", "branches", "pull requests"]], ["HTTP e SQL", ["requests", "status", "consultas"]])],
      junior: [mod("Casos, exploratório e defeitos", "Planejar cobertura e comunicar problemas claramente.", ["Design de testes", ["partições", "limites", "cenários"]], ["Exploratório e bugs", ["charters", "evidência", "severidade"]]), mod("API e Playwright", "Automatizar fluxos críticos em diferentes camadas.", ["Testes de API", ["contratos", "dados", "asserções"]], ["Playwright", ["locators", "fixtures", "traces"]])],
      mid: [mod("Frameworks e CI", "Criar automação sustentável e rápida.", ["Arquitetura de testes", ["camadas", "reuso", "flakiness"]], ["Integração contínua", ["paralelismo", "reports", "gates"]]), mod("Contratos, ambientes e não funcionais", "Cobrir integrações e riscos além da funcionalidade.", ["Contract testing", ["consumidores", "schemas", "compatibilidade"]], ["Performance e segurança", ["carga", "acessibilidade", "vulnerabilidades"]])],
      senior: [mod("Estratégia baseada em risco", "Direcionar investimento de qualidade pelo impacto.", ["Risk-based testing", ["probabilidade", "impacto", "cobertura"]], ["Métricas de qualidade", ["escape rate", "lead time", "confiabilidade"]]), mod("Shift-right e resiliência", "Validar sistemas em produção e sob falhas.", ["Observabilidade e sintéticos", ["RUM", "checks", "alertas"]], ["Resiliência", ["chaos", "degradação", "recuperação"]])],
      specialist: [mod("Test platform", "Oferecer qualidade como capacidade self-service.", ["Plataforma de testes", ["ambientes", "dados", "execução"]], ["Governança de automação", ["padrões", "custos", "scorecards"]]), mod("Técnicas avançadas e cultura", "Ampliar descoberta de falhas e responsabilidade coletiva.", ["Property e model-based testing", ["geradores", "invariantes", "modelos"]], ["Qualidade organizacional", ["coaching", "políticas", "maturidade"]])],
    },
  },
  {
    id: "support_infra_networks", title: "Suporte, Infraestrutura e Redes", description: "Operações de TI, identidade, redes, automação, observabilidade e continuidade.",
    capstoneTitle: "TCC — Ambiente empresarial resiliente", capstoneScenario: "Entregar identidade, rede, serviços, monitoramento, backup, suporte e recuperação de um ambiente corporativo.",
    levels: {
      foundation: [mod("Hardware e sistemas operacionais", "Compreender os componentes e o ciclo básico de suporte.", ["Hardware", ["CPU e memória", "armazenamento", "diagnóstico"]], ["Windows e Linux", ["arquivos", "processos", "permissões"]]), mod("Redes, segurança e atendimento", "Resolver incidentes básicos com comunicação segura.", ["Fundamentos de redes", ["IP", "DNS", "DHCP"]], ["Segurança e atendimento", ["phishing", "acesso", "registro e comunicação"]])],
      junior: [mod("Identidade e troubleshooting", "Administrar usuários e investigar falhas de forma estruturada.", ["Diretórios e identidade", ["usuários", "grupos", "políticas"]], ["Troubleshooting", ["hipóteses", "isolamento", "evidências"]]), mod("Scripts, serviços e backup", "Automatizar rotinas e proteger dados.", ["PowerShell e shell", ["scripts", "logs", "tarefas"]], ["Serviços e backup", ["DNS", "arquivos", "restore"]])],
      mid: [mod("Servidores, virtualização e cloud", "Operar workloads em ambientes híbridos.", ["Servidores e virtualização", ["VMs", "storage", "clusters"]], ["Cloud e identidade híbrida", ["compute", "rede", "federação"]]), mod("Monitoramento, automação e ITSM", "Padronizar operações e reduzir tempo de recuperação.", ["Observabilidade", ["métricas", "logs", "alertas"]], ["Automação e ITSM", ["inventário", "mudanças", "SLAs"]])],
      senior: [mod("Alta disponibilidade e DR", "Projetar continuidade para serviços críticos.", ["HA", ["redundância", "failover", "capacidade"]], ["Disaster recovery", ["RTO e RPO", "runbooks", "testes"]]), mod("Arquitetura híbrida e incidentes", "Coordenar ambientes complexos e crises.", ["Arquitetura híbrida", ["conectividade", "identidade", "segurança"]], ["Gestão de incidentes", ["comando", "comunicação", "post-mortem"]])],
      specialist: [mod("Arquitetura corporativa e zero trust", "Projetar padrões de infraestrutura seguros.", ["Enterprise infrastructure", ["padrões", "ciclo de vida", "governança"]], ["Zero trust", ["identidade", "segmentação", "postura"]]), mod("Automação e observabilidade de redes", "Operar redes como software e prever degradações.", ["Network automation", ["APIs", "configuração", "compliance"]], ["Observabilidade avançada", ["telemetria", "topologia", "capacidade"]])],
    },
  },
];

export const itCareerCatalogs: ItCareerCatalog[] = seeds.map(buildCatalog);

export function getItCareerCatalog(careerId: string): ItCareerCatalog | null {
  return itCareerCatalogs.find((career) => career.id === careerId) ?? null;
}

export function topicsForItCareer(careerId: string, throughLevel: string = "specialist"): Array<ItCareerTopicTemplate & { moduleLabel: string; levelLabel: string; level: ItCareerLevelId }> {
  const catalog = getItCareerCatalog(careerId);
  if (!catalog) return [];
  const rank = throughLevel === "zero" ? -1 : itCareerLevelIds.indexOf(throughLevel as ItCareerLevelId);
  if (rank < 0) return [];
  return itCareerLevelIds.slice(0, rank + 1).flatMap((level) => catalog.levels[level].modules.flatMap((module) => module.topics.map((topic) => ({ ...topic, moduleLabel: module.title, levelLabel: itCareerLevelLabels[level], level }))));
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addCalendarMonths(value: string, months: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const totalMonth = year * 12 + month - 1 + months;
  const nextYear = Math.floor(totalMonth / 12);
  const nextMonth = totalMonth % 12;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function itCareerTargetDate(startDate: string, timelineMode: "duration" | "deadline", durationMonths: number, deadline: string): string {
  return timelineMode === "deadline" ? deadline : addDays(addCalendarMonths(startDate, durationMonths), -1);
}

function recommendedDate(startDate: string, days: Set<number>, minutesPerDay: number, totalMinutes: number): string {
  let remaining = totalMinutes;
  let cursor = startDate;
  for (let index = 0; index < 36_600; index += 1) {
    if (days.has(new Date(`${cursor}T12:00:00Z`).getUTCDay())) remaining -= minutesPerDay;
    if (remaining <= 0) return cursor;
    cursor = addDays(cursor, 1);
  }
  throw new Error("Não foi possível calcular o prazo recomendado.");
}

function careerPreparationModule(level: ItCareerLevelId, targetRole: string, applicationIntent: ItCareerPlanSetup["applicationIntent"]): ItCareerPlanModule {
  const topicBase: ItCareerPlanTopic[] = [
    ["portfolio", "Portfólio e evidências", ["seleção de projetos", "estudos de caso", "demonstração de impacto"]],
    ["cv", "Currículo e LinkedIn", ["competências verificáveis", "resultados", "palavras-chave honestas"]],
    ["interview", "Entrevistas técnicas", ["explicação de decisões", "exercícios", "comunicação de trade-offs"]],
  ].map(([key, title, subtopics], index) => {
    const id = `career-preparation.${key}`;
    const template: ItCareerTopicTemplate = { id, title: String(title), subtopics: subtopics as string[], competence: `Apresentar ${String(title).toLowerCase()} com clareza e honestidade.`, studyMinutes: 120, estimatedMinutes: 120, reviewMinutes: 45 };
    return { ...template, code: `C.${index + 1}`, role: "topic" as const, dailyQuizzes: [] };
  });
  const timing = applicationIntent === "applying_now" ? "para candidaturas em andamento" : "para candidaturas após o roadmap";
  return { id: "career-preparation", title: targetRole ? `Preparação profissional — ${targetRole}` : "Preparação profissional", objective: `Transformar o aprendizado em uma apresentação honesta ${timing}.`, successCriteria: "Apresentar competências, projetos e decisões com clareza, sem prometer experiência inexistente.", level, levelLabel: "Carreira", moduleKind: "specialization", topics: topicBase, project: null, estimatedMinutes: topicBase.reduce((sum, topic) => sum + topic.estimatedMinutes, 0), scopeSubjects: topicBase.flatMap((topic) => [topic.title, ...topic.subtopics]) };
}

const objectiveContext = {
  learning: { label: "aprendizado pessoal", scenario: "priorize compreensão, experimentação e registro do que aprendeu" },
  first_job: { label: "primeiro emprego em TI", scenario: "produza evidências claras que possam ser apresentadas em uma primeira oportunidade" },
  career_change: { label: "mudança de carreira", scenario: "relacione as novas competências à experiência transferível que já possui" },
  current_job: { label: "aplicação no trabalho atual", scenario: "conecte a entrega a um problema real ou equivalente do ambiente profissional" },
  freelance: { label: "trabalho freelance", scenario: "trate requisitos, aceite, documentação e comunicação como uma entrega a cliente" },
} as const;

/**
 * Monta uma trilha de TI sem IA: tópicos e subtópicos do catálogo, perguntas
 * objetivas em cada dia de estudo, desafios obrigatórios por módulo e TCC opcional.
 */
function buildItCareerPlanInternal(setup: ItCareerPlanSetup, materializeDailyQuestions: boolean): ItCareerPlan {
  const catalog = getItCareerCatalog(setup.careerId);
  if (!catalog) throw new Error("Escolha uma carreira de TI válida.");

  const targetRank = itCareerLevelIds.indexOf(setup.targetLevel as ItCareerLevelId);
  const currentRank = setup.currentLevel === "zero" ? -1 : itCareerLevelIds.indexOf(setup.currentLevel as ItCareerLevelId);
  if (targetRank < 0) throw new Error("Escolha a profundidade de conteúdo que deseja estudar.");
  if (currentRank > targetRank) throw new Error("A profundidade final não pode ficar abaixo do nível atual informado.");
  if (!validIsoDate(setup.startDate)) throw new Error("Informe uma data inicial válida.");
  if (setup.timelineMode === "deadline" && (!validIsoDate(setup.deadline) || setup.deadline < setup.startDate)) {
    throw new Error("Informe um prazo igual ou posterior ao início.");
  }
  if (setup.timelineMode === "duration" && (!Number.isInteger(setup.durationMonths) || setup.durationMonths < 1 || setup.durationMonths > 120)) {
    throw new Error("A duração deve ficar entre 1 e 120 meses.");
  }
  if (!Number.isInteger(setup.minutesPerDay) || setup.minutesPerDay < 30 || setup.minutesPerDay > 480) {
    throw new Error("Informe entre 30 minutos e 8 horas por dia.");
  }

  const dayValues = [...new Set(setup.availableDays)].filter((day) => /^[0-6]$/.test(day));
  if (!dayValues.length) throw new Error("Escolha ao menos um dia de estudo.");
  if (!['skip', 'validate'].includes(setup.knownTopicPolicy)) throw new Error("Escolha como tratar os assuntos já dominados.");

  const submittedInterestIds = Array.isArray(setup.interestIds) ? setup.interestIds : [];
  const uniqueInterestIds = [...new Set(submittedInterestIds)];
  if (uniqueInterestIds.length !== submittedInterestIds.length) throw new Error("Escolha interesses diferentes, sem repetir opções.");
  if (uniqueInterestIds.length < 1 || uniqueInterestIds.length > 3) throw new Error("Escolha de um a três assuntos de interesse.");
  if (uniqueInterestIds.some((id) => !itCareerInterestIds.includes(id))) throw new Error("A lista de interesses contém uma opção inválida.");
  const interests = uniqueInterestIds.map((id) => interestProfiles[id]);

  const allowedTopics = new Set(topicsForItCareer(catalog.id, setup.currentLevel).map((topic) => topic.id));
  if (setup.knownTopicIds.some((id) => !allowedTopics.has(id))) {
    throw new Error("A lista de assuntos dominados contém um item inválido para esta carreira.");
  }
  if (setup.currentLevel === "zero" && setup.knownTopicIds.length) {
    throw new Error("Quem está começando do zero não pode enviar assuntos dominados.");
  }

  if (!setup.includeModuleProjects) {
    throw new Error("Os desafios práticos ao final de cada módulo são obrigatórios neste formato de roadmap.");
  }

  // Não existe opção de desligar as perguntas no produto. O fallback mantém
  // rascunhos anteriores compatíveis sem permitir que uma chamada forjada
  // retire a rotina diária do novo formato.
  const includeDailyQuestions = setup.includeDailyQuestions !== false;
  if (!includeDailyQuestions) throw new Error("As perguntas diárias fazem parte obrigatória deste formato de roadmap.");

  const objective = setup.objective && setup.objective in objectiveContext ? setup.objective : "learning";
  const knownTopics = new Set(setup.knownTopicIds);
  const studyDays = new Set(dayValues.map(Number));
  const questionPolicy = dailyQuestionPolicy(setup.targetLevel as ItCareerLevelId, setup.minutesPerDay);
  const contentMinutesPerStudyDay = Math.max(1, setup.minutesPerDay - questionPolicy.minutesReservedPerStudyDay);

  let moduleNumber = 0;
  const modules: ItCareerPlanModule[] = [];

  for (const level of itCareerLevelIds.slice(0, targetRank + 1)) {
    for (const templateModule of catalog.levels[level].modules) {
      const selectedTopics = templateModule.topics.filter((topic) => !(knownTopics.has(topic.id) && setup.knownTopicPolicy === "skip"));
      const projectOnly = selectedTopics.length === 0;
      const scopeTopics = projectOnly ? templateModule.topics : selectedTopics;
      const partiallyFiltered = selectedTopics.length !== templateModule.topics.length;
      const scopeSubjects = scopeTopics.flatMap((topic) => [topic.title, ...topic.subtopics]);
      const moduleTitle = projectOnly
        ? `Projeto de consolidação — ${templateModule.title}`
        : partiallyFiltered
          ? selectedTopics.map((topic) => topic.title).join(" e ")
          : templateModule.title;
      const moduleObjective = projectOnly
        ? `Consolidar, em um projeto, os assuntos que você declarou já conhecer: ${templateModule.topics.map((topic) => topic.title).join(" e ")}.`
        : partiallyFiltered
          ? `Desenvolver competência em ${selectedTopics.map((topic) => topic.title).join(" e ")}, considerando apenas os assuntos mantidos no roadmap.`
          : templateModule.objective;

      moduleNumber += 1;
      const topics: ItCareerPlanTopic[] = selectedTopics.map((topic, topicIndex) => {
        const review = knownTopics.has(topic.id) && setup.knownTopicPolicy === "validate";
        return {
          ...topic,
          code: `${moduleNumber}.${topicIndex + 1}`,
          role: review ? "review" : "topic",
          estimatedMinutes: review ? topic.reviewMinutes : topic.estimatedMinutes,
          dailyQuizzes: [],
        };
      });
      const moduleInterest = interests[(moduleNumber - 1) % interests.length];
      const project = guidedArtifact({
        id: templateModule.project.id,
        careerId: catalog.id,
        interest: moduleInterest,
        level,
        moduleTitle,
        blueprintModuleTitle: templateModule.title,
        moduleObjective,
        technicalConcepts: scopeSubjects,
        estimatedMinutes: templateModule.project.estimatedMinutes,
        kind: "module_challenge",
        objectiveContextLabel: objectiveContext[objective].label,
      });
      const estimatedMinutes = topics.reduce((sum, topic) => sum + topic.estimatedMinutes, 0) + (project?.estimatedMinutes ?? 0);
      modules.push({
        id: templateModule.id,
        title: moduleTitle,
        objective: moduleObjective,
        successCriteria: projectOnly
          ? `Aplicar os assuntos declarados em um projeto de consolidação: ${scopeTopics.map((topic) => topic.title).join(" e ")}.`
          : `Estudar os tópicos e responder às questões diárias de ${topics.map((topic) => topic.title).join(" e ")}.`,
        level,
        levelLabel: itCareerLevelLabels[level],
        moduleKind: level === "foundation" || level === "junior" ? "core" : "specialization",
        topics,
        project,
        estimatedMinutes,
        scopeSubjects,
      });
    }
  }

  const technicalModules = [...modules];
  const sessionCountByTopic = new Map(technicalModules.flatMap((roadmapModule) => roadmapModule.topics.map((topic) => [
    topic.id,
    Math.max(1, Math.ceil(topic.estimatedMinutes / contentMinutesPerStudyDay)),
  ] as const)));
  if (materializeDailyQuestions) {
    const lastModuleWithQuiz = technicalModules.findLastIndex((roadmapModule) => roadmapModule.topics.length > 0);
    const topicSessionCount = [...sessionCountByTopic.values()].reduce((sum, count) => sum + count, 0);
    const reservedProjectDays = technicalModules.reduce((sum, roadmapModule, moduleIndex) => (
      moduleIndex < lastModuleWithQuiz
        ? sum + Math.ceil((roadmapModule.project?.estimatedMinutes ?? 0) / setup.minutesPerDay)
        : sum
    ), 0);
    const plannedDates = studyDates(setup.startDate, studyDays, topicSessionCount + reservedProjectDays);
    let dateCursor = 0;
    let topicEntryIndex = 0;
    technicalModules.forEach((roadmapModule, moduleIndex) => {
      roadmapModule.topics.forEach((topic) => {
        const sessionCount = sessionCountByTopic.get(topic.id) ?? 1;
        topic.dailyQuizzes = Array.from({ length: sessionCount }, (_, sessionIndex): ItCareerDailyQuizSession => {
          const scheduledDate = plannedDates[dateCursor++];
          return {
            id: `${topic.id}.daily.${sessionIndex + 1}`,
            title: `Questões do dia — ${topic.title} · sessão ${sessionIndex + 1}`,
            topicId: topic.id,
            moduleId: roadmapModule.id,
            level: roadmapModule.level,
            sessionIndex,
            scheduledDate,
            estimatedMinutes: questionPolicy.minutesReservedPerStudyDay,
            questions: Array.from(
              { length: questionPolicy.questionsPerStudyDay },
              (_, questionIndex) => dailyQuestionFor(
                topic,
                roadmapModule,
                sessionIndex,
                questionIndex,
                scheduledDate,
                interests[(topicEntryIndex + sessionIndex + questionIndex) % interests.length],
              ),
            ),
          };
        });
        roadmapModule.estimatedMinutes += topic.dailyQuizzes.reduce((sum, quiz) => sum + quiz.estimatedMinutes, 0);
        topicEntryIndex += 1;
      });
      if (moduleIndex < lastModuleWithQuiz) {
        dateCursor += Math.ceil((roadmapModule.project?.estimatedMinutes ?? 0) / setup.minutesPerDay);
      }
    });
  } else {
    technicalModules.forEach((roadmapModule) => {
      roadmapModule.topics.forEach((topic) => {
        const sessionCount = sessionCountByTopic.get(topic.id) ?? 1;
        roadmapModule.estimatedMinutes += sessionCount * questionPolicy.minutesReservedPerStudyDay;
      });
    });
  }

  if (setup.jobPreparation) {
    modules.push(careerPreparationModule(setup.targetLevel as ItCareerLevelId, setup.targetRole?.trim() ?? "", setup.applicationIntent));
  }

  if (setup.includeCapstone && technicalModules.length) {
    const targetScope = technicalModules.flatMap((roadmapModule) => roadmapModule.scopeSubjects);
    const capstone = guidedArtifact({
      id: catalog.capstone.id,
      careerId: catalog.id,
      interest: interests[0],
      level: setup.targetLevel as ItCareerLevelId,
      moduleTitle: catalog.capstone.title,
      moduleObjective: catalog.capstone.objective,
      technicalConcepts: technicalModules.map((roadmapModule) => roadmapModule.title),
      estimatedMinutes: capstoneMinutesByLevel[setup.targetLevel as ItCareerLevelId],
      kind: "capstone",
      objectiveContextLabel: objectiveContext[objective].label,
    });
    modules.push({
      id: `${catalog.id}.capstone.module`,
      title: capstone.title,
      objective: capstone.objective,
      successCriteria: capstone.acceptanceCriteria.join(" "),
      level: setup.targetLevel as ItCareerLevelId,
      levelLabel: "Projeto final",
      moduleKind: "capstone",
      topics: [],
      project: capstone,
      estimatedMinutes: capstone.estimatedMinutes,
      scopeSubjects: targetScope,
    });
  }

  const totalEstimatedMinutes = modules.reduce((sum, roadmapModule) => sum + roadmapModule.estimatedMinutes, 0);
  if (!totalEstimatedMinutes) throw new Error("As escolhas não produziram nenhum conteúdo para o roadmap.");

  const targetDate = itCareerTargetDate(setup.startDate, setup.timelineMode, setup.durationMonths, setup.deadline);
  const bufferMinutes = Math.ceil(totalEstimatedMinutes * 0.25);
  const recommendedEstimatedMinutes = totalEstimatedMinutes + bufferMinutes;
  const recommendedTargetDate = recommendedDate(setup.startDate, studyDays, setup.minutesPerDay, recommendedEstimatedMinutes);
  const recommendedWeeks = Math.max(1, Math.ceil((new Date(`${recommendedTargetDate}T12:00:00Z`).getTime() - new Date(`${setup.startDate}T12:00:00Z`).getTime()) / 604_800_000));

  let cumulativeEstimatedMinutes = 0;
  const milestones: ItCareerPlanMilestone[] = itCareerLevelIds.slice(0, targetRank + 1).map((level) => {
    cumulativeEstimatedMinutes += technicalModules
      .filter((roadmapModule) => roadmapModule.level === level)
      .reduce((sum, roadmapModule) => sum + roadmapModule.estimatedMinutes, 0);
    const cumulativeRecommendedEstimatedMinutes = cumulativeEstimatedMinutes + Math.ceil(cumulativeEstimatedMinutes * 0.25);
    return {
      level,
      levelLabel: itCareerLevelLabels[level],
      cumulativeEstimatedMinutes,
      cumulativeRecommendedEstimatedMinutes,
      recommendedTargetDate: recommendedDate(setup.startDate, studyDays, setup.minutesPerDay, cumulativeRecommendedEstimatedMinutes),
    };
  });
  const nextProfessionalLevel = currentRank < itCareerLevelIds.indexOf("junior") ? "junior" : itCareerLevelIds[currentRank + 1] ?? null;

  return {
    templateKey: catalog.id,
    templateVersion: catalog.version,
    title: `${catalog.title} — currículo até ${itCareerLevelLabels[setup.targetLevel as ItCareerLevelId]}`,
    description: `${catalog.description} Roteiro predefinido para ${objectiveContext[objective].label}; concluir o conteúdo não comprova senioridade profissional.`,
    targetLevel: setup.targetLevel as ItCareerLevelId,
    startDate: setup.startDate,
    targetDate,
    recommendedTargetDate,
    recommendedWeeks,
    deadlineWarning: targetDate < recommendedTargetDate,
    totalEstimatedMinutes,
    bufferMinutes,
    recommendedEstimatedMinutes,
    dailyQuestionPolicy: questionPolicy,
    milestones,
    professionalMilestone: {
      firstLevel: "junior",
      firstLabel: itCareerLevelLabels.junior,
      nextLevel: nextProfessionalLevel,
      nextLabel: nextProfessionalLevel ? itCareerLevelLabels[nextProfessionalLevel] : null,
    },
    interests: interests.map((interest) => ({ id: interest.id, label: interest.label })),
    modules,
  };
}

/** Plano completo usado na gravação: contém cada sessão e cada questão. */
export function buildItCareerPlan(setup: ItCareerPlanSetup): ItCareerPlan {
  return buildItCareerPlanInternal(setup, true);
}

/**
 * Prévia leve para o client: conserva carga, prazos, módulos, projetos e a
 * política diária, mas não aloca milhares de sessões/perguntas em memória.
 */
export function buildItCareerPreview(setup: ItCareerPlanSetup): ItCareerPlan {
  return buildItCareerPlanInternal(setup, false);
}
