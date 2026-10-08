export type LearnerId = "carlos" | "julia";

export type LessonResource = {
  label: string;
  url: string;
  duration: string;
  source: string;
  views: string;
  startSeconds?: number;
  endSeconds?: number;
};
export type RoadmapActivity = {
  id: string;
  kind: "lesson" | "listening" | "practice" | "speaking" | "review";
  title: string;
  description: string;
  duration: string;
  resources?: LessonResource[];
};
export type RoadmapDay = {
  id: string;
  day: number;
  week: number;
  weekday: string;
  title: string;
  level: string;
  activities: RoadmapActivity[];
};
type CuratedLesson = {
  id: string;
  title: string;
  level: string;
  resources: LessonResource[];
  practice: string;
};

export const LEARNERS: Array<{ id: LearnerId; name: string; initials: string }> = [
  { id: "carlos", name: "Carlos", initials: "CR" },
  { id: "julia", name: "Júlia", initials: "JL" },
];

export const TOTAL_YEAR_DAYS = 365;

export const YEAR_PHASES = [
  { name: "Base absoluta", range: "Dias 1–60", level: "A0 → A1", color: "bg-sky-500" },
  { name: "Inglês essencial", range: "Dias 61–120", level: "A1", color: "bg-cyan-500" },
  { name: "Autonomia", range: "Dias 121–210", level: "A2", color: "bg-violet-500" },
  { name: "Conversação", range: "Dias 211–300", level: "B1", color: "bg-amber-500" },
  { name: "Inglês avançado", range: "Dias 301–365", level: "B1 → B2+", color: "bg-emerald-500" },
] as const;

export const SOURCE_STRATEGY = [
  { name: "Curso em Vídeo", role: "Curso principal", note: "Ordem didática do módulo 1; 19 aulas de conteúdo foram aproveitadas." },
  { name: "Professor Kenny", role: "Fundação", note: "Alfabeto e pronúncia inicial; aula selecionada com 12 milhões de visualizações." },
  { name: "ABC Fluent", role: "Reforço", note: "Aulas do nível 0 usadas para consolidar a base com muita repetição." },
  { name: "Você Aprende Agora", role: "Microaulas", note: "Somente vídeos objetivos e úteis; publicidade, certificados e repetições foram retirados." },
  { name: "SmallAdvantages", role: "Pronúncia e uso real", note: "Entra nos próximos ciclos como complemento, sem repetir a gramática principal." },
  { name: "Volka e Andrew", role: "Escuta e conversação", note: "Input compreensível e shadowing já entram no A0 em trechos curtos; a duração cresce com o nível." },
  { name: "engVid James", role: "Intermediário e avançado", note: "Reservado para vocabulário, escrita e compreensão após a base." },
] as const;

const youtube = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const IMMERSION_BY_WEEK: Record<number, { resource: LessonResource; focus: string[] }> = {
  1: {
    resource: { label: "Speak English Naturally With Me — Easy Vlog", url: youtube("DZP5ZL-JxSQ"), duration: "18:58", source: "Volka English", views: "510 mil" },
    focus: ["Ouça os primeiros 3 minutos com legenda em inglês e repita cinco frases.", "Ouça de 3:00 a 6:00, anote cinco palavras reconhecidas e faça shadowing.", "Ouça de 6:00 a 9:00 sem pausar; depois repita com legenda.", "Ouça de 9:00 a 12:00 e imite o ritmo de três frases.", "Ouça de 12:00 a 15:00 e registre a ideia principal.", "Reassista aos 5 minutos mais difíceis com legenda em inglês.", "Assista a 5 minutos sem legenda e conte oralmente o que entendeu."],
  },
  2: {
    resource: { label: "My Daily Routine — Comprehensible Input Vlog", url: youtube("md8u7i__omo"), duration: "27:02", source: "Volka English", views: "126 mil" },
    focus: ["Ouça de 0:00 a 4:00 e identifique ações da rotina.", "Ouça de 4:00 a 8:00 e repita cinco frases completas.", "Ouça de 8:00 a 12:00; anote pessoas e lugares mencionados.", "Ouça de 12:00 a 16:00 com legenda em inglês e faça shadowing.", "Ouça de 16:00 a 20:00 sem traduzir; use as imagens para compreender.", "Reassista ao trecho mais difícil e repita em velocidade normal.", "Assista a 6 minutos sem legenda e resuma usando frases simples."],
  },
  3: {
    resource: { label: "A Day Shopping in English — Easy Vlog", url: youtube("X3DKySerzZQ"), duration: "17:59", source: "Volka English", views: "46 mil" },
    focus: ["Ouça de 0:00 a 3:00 e identifique lugares e objetos.", "Ouça de 3:00 a 6:00 e repita cinco palavras de compras.", "Ouça de 6:00 a 9:00 com legenda em inglês e copie duas frases.", "Ouça de 9:00 a 12:00 e imite duas perguntas.", "Ouça de 12:00 a 15:00 sem pausar e registre o contexto.", "Reassista ao trecho mais difícil fazendo shadowing.", "Assista a 5 minutos sem legenda e descreva o que viu."],
  },
  4: {
    resource: { label: "Real English Listening Practice in Vietnam", url: youtube("zx6lF1TL_xI"), duration: "15:56", source: "Volka English", views: "76 mil" },
    focus: ["Ouça de 0:00 a 3:00 e identifique palavras conhecidas.", "Ouça de 3:00 a 6:00 e repita quatro frases.", "Ouça de 6:00 a 9:00 usando apenas legenda em inglês.", "Ouça de 9:00 a 12:00 e anote lugares ou objetos.", "Ouça de 12:00 ao final sem pausar e registre a ideia central.", "Reassista a três minutos fazendo shadowing.", "Assista ao trecho favorito sem legenda e faça um resumo oral."],
  },
  5: {
    resource: { label: "Natural Street Conversation — Comprehensible Input", url: youtube("mworzi0jO_Y"), duration: "21:34", source: "Volka English", views: "96 mil" },
    focus: ["Ouça de 0:00 a 4:00 e identifique quem conversa.", "Ouça de 4:00 a 8:00 e repita três perguntas.", "Ouça de 8:00 a 12:00 com legenda em inglês e faça shadowing.", "Ouça de 12:00 a 16:00 sem traduzir palavra por palavra.", "Ouça de 16:00 a 20:00 e registre cinco expressões.", "Reassista ao diálogo mais claro e imite os dois participantes.", "Assista a 6 minutos sem legenda e reconte a conversa em dupla."],
  },
};

function immersionActivity(day: number, week: number, weekdayIndex: number): RoadmapActivity {
  const immersion = IMMERSION_BY_WEEK[week];
  const segmentStart = weekdayIndex < 5 ? weekdayIndex * 180 : 0;
  const segmentEnd = weekdayIndex < 5 ? segmentStart + 180 : 360;
  return {
    id: `day-${day}-listening`,
    kind: "listening",
    title: "2. Escutar e imitar",
    description: immersion.focus[weekdayIndex],
    duration: "20–30 min",
    resources: [{ ...immersion.resource, startSeconds: segmentStart, endSeconds: segmentEnd }],
  };
}

const CURATED_LESSONS: CuratedLesson[] = [
  {
    id: "alphabet",
    title: "Alfabeto e soletração",
    level: "A0",
    resources: [{ label: "Alfabeto em inglês — Aula 01", url: youtube("X5TdMsc4YCg"), duration: "8:08", source: "Professor Kenny", views: "12 mi" }],
    practice: "Soletrar Carlos, Júlia, Salvador e dez palavras simples; depois gravar e conferir.",
  },
  {
    id: "greetings",
    title: "Cumprimentos essenciais",
    level: "A0",
    resources: [
      { label: "Hello / Hi", url: youtube("ayr3d5q9Fuc"), duration: "1:19", source: "Você Aprende Agora", views: "2,1 mi" },
      { label: "How are you?", url: youtube("iKhDK6Nro1U"), duration: "1:30", source: "Você Aprende Agora", views: "1,5 mi" },
      { label: "Goodbye / See you", url: youtube("tS015kP2njY"), duration: "1:53", source: "Você Aprende Agora", views: "1,1 mi" },
    ],
    practice: "Fazer cinco diálogos curtos alternando saudação, resposta e despedida.",
  },
  {
    id: "abc-zero-1",
    title: "Primeiras estruturas do inglês",
    level: "A0",
    resources: [{ label: "Nível 0 — Aula 1", url: youtube("S45kHeWnT0M"), duration: "9:56", source: "ABC Fluent", views: "28 mi" }],
    practice: "Repetir os exemplos em voz alta e criar dez cartões de revisão.",
  },
  {
    id: "introductions",
    title: "Como se apresentar",
    level: "A0",
    resources: [{ label: "Como se apresentar em inglês?", url: youtube("nlwvT88kTiM"), duration: "28:07", source: "Curso em Vídeo", views: "176 mil" }],
    practice: "Gravar uma apresentação com nome, cidade, formação e objetivo de estudo.",
  },
  {
    id: "personal-info",
    title: "Idade, sobrenome e ocupação",
    level: "A0",
    resources: [{ label: "Idade, sobrenome e ocupação", url: youtube("ukv_PaJ2yLQ"), duration: "22:25", source: "Curso em Vídeo", views: "77 mil" }],
    practice: "Montar e responder uma ficha com dez perguntas pessoais.",
  },
  {
    id: "abc-zero-2",
    title: "Reforço do nível zero",
    level: "A0",
    resources: [{ label: "Nível 0 — Aula 2", url: youtube("fVZhgNAXMd0"), duration: "8:21", source: "ABC Fluent", views: "4,4 mi" }],
    practice: "Fazer shadowing: pausar após cada frase e imitar ritmo e pronúncia.",
  },
  {
    id: "conversation",
    title: "Desenvolvendo uma conversa",
    level: "A0",
    resources: [{ label: "Como desenvolver uma conversa", url: youtube("MuKsMgOkTuw"), duration: "20:16", source: "Curso em Vídeo", views: "49 mil" }],
    practice: "Criar um diálogo de oito falas e praticar em dupla trocando os papéis.",
  },
  {
    id: "verb-to-be",
    title: "Primeiro contato com o verbo to be",
    level: "A0",
    resources: [{ label: "Verb to be", url: youtube("wG8auqDqFRA"), duration: "2:33", source: "Você Aprende Agora", views: "983 mil" }],
    practice: "Escrever dez frases com am, is e are e transformar cinco em perguntas.",
  },
  {
    id: "verb-to-be-exercises",
    title: "Exercícios com verbo to be",
    level: "A0",
    resources: [{ label: "Exercícios com verbo To Be", url: youtube("EyoZc0-3Kuk"), duration: "17:15", source: "Curso em Vídeo", views: "32 mil" }],
    practice: "Refazer os exercícios sem consultar as anotações e explicar cada resposta.",
  },
  {
    id: "family",
    title: "Família e relações",
    level: "A0",
    resources: [{ label: "Talk about family", url: youtube("Ap1pn4Ri_lg"), duration: "26:48", source: "Curso em Vídeo", views: "30 mil" }],
    practice: "Desenhar uma árvore familiar simples e apresentar cinco pessoas em inglês.",
  },
  {
    id: "abc-zero-3",
    title: "Consolidação do nível zero",
    level: "A0",
    resources: [{ label: "Nível 0 — Aula 3", url: youtube("H2xHm2I5Yio"), duration: "8:47", source: "ABC Fluent", views: "2,5 mi" }],
    practice: "Ouvir novamente sem legenda e anotar tudo que conseguir reconhecer.",
  },
  {
    id: "whats-its",
    title: "What’s e it’s",
    level: "A0",
    resources: [{ label: "Exercícios com what’s and it’s", url: youtube("WwNhqqnoYaA"), duration: "14:37", source: "Curso em Vídeo", views: "26 mil" }],
    practice: "Apontar dez objetos e alternar perguntas com what’s e respostas com it’s.",
  },
  {
    id: "describe-people",
    title: "Descrevendo pessoas",
    level: "A0 → A1",
    resources: [{ label: "Descreva pessoas em inglês", url: youtube("RfBehdHMepU"), duration: "24:50", source: "Curso em Vídeo", views: "28 mil" }],
    practice: "Descrever duas pessoas em cinco frases cada, sem traduzir palavra por palavra.",
  },
  {
    id: "is-are-questions",
    title: "Perguntas com is e are",
    level: "A0 → A1",
    resources: [{ label: "Perguntas com is and are", url: youtube("iz4GUSwDNKg"), duration: "21:42", source: "Curso em Vídeo", views: "21 mil" }],
    practice: "Criar dez perguntas e responder cinco afirmativamente e cinco negativamente.",
  },
  {
    id: "dates",
    title: "Aniversários e datas",
    level: "A1",
    resources: [{ label: "Birthdays and dates", url: youtube("-cIYn3gZEFM"), duration: "21:50", source: "Curso em Vídeo", views: "20 mil" }],
    practice: "Falar dez datas importantes e perguntar aniversários em um diálogo.",
  },
  {
    id: "ages-two",
    title: "Idades e datas — parte 2",
    level: "A1",
    resources: [{ label: "Birthdays and ages — Part II", url: youtube("Eb_u5ZFDOjo"), duration: "28:19", source: "Curso em Vídeo", views: "14 mil" }],
    practice: "Fazer um ditado de números e datas com o parceiro e corrigir juntos.",
  },
  {
    id: "negative-to-be",
    title: "Verbo to be na negativa",
    level: "A1",
    resources: [{ label: "Verb to be na negativa", url: youtube("HO8Nijsra4M"), duration: "20:16", source: "Curso em Vídeo", views: "17 mil" }],
    practice: "Transformar quinze frases afirmativas em negativas, incluindo contrações.",
  },
  {
    id: "ask-questions",
    title: "Como fazer perguntas",
    level: "A1",
    resources: [{ label: "Ask questions", url: youtube("61sih140zLo"), duration: "22:51", source: "Curso em Vídeo", views: "15 mil" }],
    practice: "Preparar uma entrevista de dez perguntas e praticar em dupla.",
  },
  {
    id: "places",
    title: "Preposições de lugar",
    level: "A1",
    resources: [{ label: "Prepositions of places", url: youtube("uT_dPkL2J1E"), duration: "18:18", source: "Curso em Vídeo", views: "14 mil" }],
    practice: "Descrever a posição de dez objetos usando in, on, under, next to e between.",
  },
  {
    id: "comparisons",
    title: "Comparando pessoas",
    level: "A1",
    resources: [{ label: "Compare people", url: youtube("B540EMXToBU"), duration: "13:58", source: "Curso em Vídeo", views: "12 mil" }],
    practice: "Criar dez comparações respeitosas usando pessoas ou personagens conhecidos.",
  },
  {
    id: "do-does",
    title: "Do, don’t, does e doesn’t",
    level: "A1",
    resources: [{ label: "Do, don't, does and doesn't", url: youtube("qIO7Wzo6jQ8"), duration: "10:18", source: "Curso em Vídeo", views: "15 mil" }],
    practice: "Montar cinco perguntas para do e cinco para does, com respostas completas.",
  },
  {
    id: "devices",
    title: "Falando sobre dispositivos",
    level: "A1",
    resources: [{ label: "Talk about your devices", url: youtube("9EePDou0uWk"), duration: "18:29", source: "Curso em Vídeo", views: "12 mil" }],
    practice: "Apresentar o celular ou computador em oito frases simples.",
  },
  {
    id: "articles",
    title: "Artigos a, an e the",
    level: "A1",
    resources: [{ label: "Articles A — AN — THE", url: youtube("ZM3w3c8_wsY"), duration: "21:25", source: "Curso em Vídeo", views: "13 mil" }],
    practice: "Completar vinte frases com o artigo adequado e justificar cinco escolhas.",
  },
  {
    id: "using-technology",
    title: "Tecnologia no dia a dia",
    level: "A1",
    resources: [{ label: "Using technology", url: youtube("TGio4whDuGk"), duration: "14:40", source: "Curso em Vídeo", views: "12 mil" }],
    practice: "Explicar em inglês uma tarefa simples que você faz no celular.",
  },
  {
    id: "describe-tech",
    title: "Descrevendo tecnologia",
    level: "A1",
    resources: [{ label: "Describe your tech", url: youtube("EYBoJ19jEAg"), duration: "18:47", source: "Curso em Vídeo", views: "13 mil" }],
    practice: "Gravar uma apresentação de 90 segundos descrevendo um aparelho e sua utilidade.",
  },
];

const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export const ROADMAP_DAYS: RoadmapDay[] = Array.from({ length: 35 }, (_, index) => {
  const day = index + 1;
  const week = Math.floor(index / 7) + 1;
  const weekdayIndex = index % 7;
  const lessonIndex = (week - 1) * 5 + weekdayIndex;

  if (weekdayIndex < 5) {
    const lesson = CURATED_LESSONS[lessonIndex];
    return {
      id: `day-${day}`,
      day,
      week,
      weekday: WEEKDAYS[weekdayIndex],
      title: lesson.title,
      level: lesson.level,
      activities: [
        {
          id: `day-${day}-lesson`,
          kind: "lesson",
          title: "1. Aprender",
          description: "Assistir sem acelerar, anotar as estruturas novas e repetir os exemplos em voz alta.",
          duration: "25–35 min",
          resources: lesson.resources,
        },
        immersionActivity(day, week, weekdayIndex),
        {
          id: `day-${day}-practice`,
          kind: "practice",
          title: "3. Responder no site",
          description: `Exercícios prontos no site: ${lesson.practice}`,
          duration: "20–25 min",
        },
        {
          id: `day-${day}-speaking`,
          kind: "speaking",
          title: "4. Falar em dupla",
          description: "Seguir o roteiro pronto com Carlos e Júlia, trocar os papéis e registrar o resultado.",
          duration: "20–30 min",
        },
      ],
    };
  }

  const saturday = weekdayIndex === 5;
  return {
    id: `day-${day}`,
    day,
    week,
    weekday: WEEKDAYS[weekdayIndex],
    title: saturday ? `Revisão da semana ${week}` : `Prática em dupla — semana ${week}`,
    level: week <= 2 ? "A0" : "A0 → A1",
    activities: saturday ? [
      { id: `day-${day}-review`, kind: "review", title: "1. Aprender e revisar", description: "Rever os cartões da semana e repetir apenas os trechos em que houve dificuldade.", duration: "25 min" },
      immersionActivity(day, week, weekdayIndex),
      { id: `day-${day}-quiz`, kind: "practice", title: "3. Responder sem consulta", description: "Responder ao teste pronto da semana e fazer a produção final diretamente no site.", duration: "25 min" },
      { id: `day-${day}-speaking`, kind: "speaking", title: "4. Falar e revisar", description: "Usar o roteiro da semana em uma conversa progressivamente mais livre.", duration: "25 min" },
    ] : [
      { id: `day-${day}-review`, kind: "review", title: "1. Revisão leve", description: "Revisar apenas os erros da semana e cinco frases úteis antes da imersão.", duration: "15 min" },
      immersionActivity(day, week, weekdayIndex),
      { id: `day-${day}-mission`, kind: "practice", title: "3. Missão na vida real", description: "Levar o inglês para o celular, a casa ou uma situação cotidiana e registrar no site.", duration: "20 min" },
      { id: `day-${day}-pair`, kind: "speaking", title: "4. Conversar em dupla", description: "Seguir o roteiro pronto, trocar os papéis e registrar a resposta diretamente no site.", duration: "30 min" },
    ],
  };
});
