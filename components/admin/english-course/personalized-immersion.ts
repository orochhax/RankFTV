import type { LearnerId, LessonResource } from "./roadmap";

type ImmersionPlan = {
  resources: LessonResource[];
  focus: string[];
};

const youtube = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const GUIDED_FOCUS = [
  "Assista ao trecho com legenda em inglês e anote cinco palavras que reconhecer.",
  "Repita cinco frases curtas, imitando ritmo e pronúncia sem traduzir palavra por palavra.",
  "Escolha três palavras do tema e escreva uma frase simples com cada uma.",
  "Assista novamente e identifique pessoas, objetos ou ideias mencionadas.",
  "Conte em voz alta o que entendeu usando três frases simples.",
  "Reveja o trecho mais difícil, pause após cada frase e faça shadowing.",
  "Assista sem legenda e converse em dupla sobre uma ideia do vídeo.",
];

export const LEARNER_INTERESTS: Record<LearnerId, string[]> = {
  carlos: [
    "Tecnologia, software e ciência de dados",
    "Futevôlei, futebol e Hyrox",
    "Carros",
    "Documentários sobre conflitos atuais",
    "Desenvolvimento pessoal",
  ],
  julia: [
    "Desenvolvimento da mente humana",
    "Planetas e vida animal",
    "Moda",
    "Direito e previdência",
    "Psicologia de psicopatia e sociopatia",
  ],
};

export const IMMERSION_BY_LEARNER: Record<LearnerId, Record<number, ImmersionPlan>> = {
  carlos: {
    1: { resources: [{ label: "Artificial intelligence: what can and can't it do?", url: youtube("tyvMjvvrq74"), duration: "6 min", source: "BBC Learning English" }], focus: GUIDED_FOCUS },
    2: { resources: [{ label: "Sport English: football, training and competition", url: youtube("-p1gn1lMVqw"), duration: "trecho guiado", source: "BBC Learning English", views: "251 mil" }], focus: GUIDED_FOCUS },
    3: { resources: [{ label: "Sharing the road with driverless cars", url: youtube("SC_opiKLohg"), duration: "6 min", source: "BBC Learning English", views: "120 mil" }], focus: GUIDED_FOCUS },
    4: { resources: [{ label: "Conflict: vocabulary for documentaries and current events", url: youtube("VxQNOXpoLC8"), duration: "trecho guiado", source: "BBC Learning English", views: "386 mil" }], focus: GUIDED_FOCUS },
    5: { resources: [{ label: "Talk about your habits", url: youtube("gCs4knrlnD4"), duration: "conversa guiada", source: "BBC Learning English", views: "200 mil" }], focus: GUIDED_FOCUS },
  },
  julia: {
    1: { resources: [{ label: "Psychology: how the human mind works", url: youtube("qhlkMyJHvmA"), duration: "trecho guiado", source: "BBC Learning English", views: "64 mil" }], focus: GUIDED_FOCUS },
    2: {
      resources: [
        { label: "Searching for life on another planet", url: youtube("hhmNNs47PMo"), duration: "6 min", source: "BBC Learning English" },
        { label: "Animals: 10 easy English words", url: youtube("Mmuiq4E7od4"), duration: "6 min", source: "BBC Learning English", views: "105 mil" },
      ],
      focus: GUIDED_FOCUS,
    },
    3: { resources: [{ label: "Fashion English: clothes, style and vocabulary", url: youtube("fVjPCCeSp6o"), duration: "trecho guiado", source: "BBC Learning English", views: "148 mil" }], focus: GUIDED_FOCUS },
    4: { resources: [{ label: "Practical ways to learn legal English", url: youtube("Ps3rfMlhIv0"), duration: "trecho guiado", source: "Law Giri", views: "537 mil" }], focus: GUIDED_FOCUS },
    5: {
      resources: [
        { label: "Psychopath vs sociopath: what's the difference?", url: youtube("6mZjY96E7rM"), duration: "trecho guiado", source: "TopThink", views: "1,3 mi" },
        { label: "Psychology: persuasion, fear and behaviour", url: youtube("qhlkMyJHvmA"), duration: "trecho guiado", source: "BBC Learning English", views: "64 mil" },
      ],
      focus: GUIDED_FOCUS,
    },
  },
};
