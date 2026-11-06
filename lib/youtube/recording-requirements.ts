export type RecordingTool = {
  name: string;
  purpose: string;
  access: "grátis" | "assinatura existente" | "assinatura paga";
  monthlyCostBrl: number;
  monthlyCostLabel: string;
  required: boolean;
  note: string;
};

export type RecordingRequirements = {
  analysis: string;
  tools: RecordingTool[];
  monthlyTotalBrl: number;
  withinBudgetCeiling: boolean;
  totalLabel: string;
  priceNote: string;
};

type IdeaInput = { title: string; summary: string; angle: string; format: string; outline: unknown; hook: string };

const BUDGET_CEILING_BRL = 200;

const textOf = (idea: IdeaInput) =>
  [idea.title, idea.summary, idea.angle, idea.format, idea.hook, ...(Array.isArray(idea.outline) ? idea.outline : [])]
    .join(" ")
    .toLocaleLowerCase("pt-BR");

const baseStackTools: RecordingTool[] = [
  {
    name: "Google IA Pro (Gemini, Flow, NotebookLM, Antigravity)",
    purpose: "Modelos Gemini Pro, geração de vídeo no Flow, síntese no NotebookLM e codificação assistida",
    access: "assinatura existente",
    monthlyCostBrl: 0,
    monthlyCostLabel: "já contratado · R$ 0 adicional",
    required: true,
    note: "Parte da sua stack principal ativa (Google IA Pro com Gemini, Flow, YT Premium e benefícios).",
  },
  {
    name: "ChatGPT (sua assinatura atual)",
    purpose: "Pesquisa, roteiro, raciocínio, Canvas e comparação prática entre modelos",
    access: "assinatura existente",
    monthlyCostBrl: 0,
    monthlyCostLabel: "já contratado · R$ 0 adicional",
    required: true,
    note: "A assinatura que você já possui atende esta pauta sem custo extra.",
  },
  {
    name: "CapCut (plano gratuito)",
    purpose: "Edição, cortes, legendas e exportação",
    access: "grátis",
    monthlyCostBrl: 0,
    monthlyCostLabel: "R$ 0/mês",
    required: true,
    note: "O plano grátis cobre uma edição explicativa normal; o Pro só entra se você escolher recursos premium.",
  },
  {
    name: "Canva (plano gratuito)",
    purpose: "Thumbnail, cards e elementos visuais",
    access: "grátis",
    monthlyCostBrl: 0,
    monthlyCostLabel: "R$ 0/mês",
    required: true,
    note: "É suficiente para montar a thumbnail sem elementos premium.",
  },
];

export function getRecordingRequirements(idea: IdeaInput): RecordingRequirements {
  const content = textOf(idea);
  const tools = [...baseStackTools];
  if (/claude code|claude cowork|claude duet|anthropic|claude/.test(content)) {
    tools.push({
      name: "Claude Pro",
      purpose: "Demonstrações com Claude, Projects, Skills, Artifacts e Claude Code",
      access: "assinatura paga",
      monthlyCostBrl: 0,
      monthlyCostLabel: "viável na stack · ≈ R$ 110/mês (≤ R$ 200)",
      required: false,
      note: "Cabe dentro do seu teto aprovado de R$ 200/mês; testes leves também podem usar o plano gratuito.",
    });
  }
  if (/lovable|cursor|n8n/.test(content)) {
    tools.push({
      name: "Lovable / Cursor / n8n (camada gratuita ou inicial)",
      purpose: "Construção visual de apps, automação de fluxos e prototipagem rápida",
      access: "grátis",
      monthlyCostBrl: 0,
      monthlyCostLabel: "R$ 0/mês (tier gratuito / ≤ R$ 200)",
      required: false,
      note: "A demonstração prática da pauta cabe nos créditos gratuitos ou planos abaixo de R$ 200/mês.",
    });
  }
  if (/capcut pro|seedance|créditos de ia|recursos premium de edição/.test(content)) {
    tools.push({
      name: "CapCut Pro",
      purpose: "Recursos premium de edição e créditos de IA",
      access: "assinatura paga",
      monthlyCostBrl: 110,
      monthlyCostLabel: "≈ R$ 110/mês",
      required: true,
      note: "O preço oficial exibido é US$ 19,99/mês (dentro do limite de R$ 200/mês).",
    });
  }
  if (/canva pro|elementos premium|remoção de fundo|thumbnail premium/.test(content)) {
    tools.push({
      name: "Canva Pro",
      purpose: "Elementos premium, remoção de fundo e recursos avançados de IA",
      access: "assinatura paga",
      monthlyCostBrl: 35,
      monthlyCostLabel: "R$ 35/mês",
      required: true,
      note: "O preço de referência brasileiro do plano individual é R$ 35/mês; o plano grátis continua sendo alternativa.",
    });
  }
  if (/higgsfield pago|runway unlimited|sora pro|heygen pago|créditos pesados/.test(content)) {
    tools.push({
      name: "Gerador de vídeo por créditos pesados (Higgsfield / Runway / Sora Pro)",
      purpose: "Geração intensiva de vídeo por IA com consumo alto de créditos",
      access: "assinatura paga",
      monthlyCostBrl: 250,
      monthlyCostLabel: "≈ R$ 250+/mês (acima do teto de R$ 200)",
      required: true,
      note: "Ultrapassa o teto de R$ 200/mês em uso intensivo; prefira demonstrar com Google Flow da sua stack.",
    });
  }

  const requiredPaid = tools.filter((tool) => tool.required && tool.access === "assinatura paga");
  const monthlyTotalBrl = requiredPaid.reduce((total, tool) => total + tool.monthlyCostBrl, 0);
  const withinBudgetCeiling = monthlyTotalBrl <= BUDGET_CEILING_BRL;
  const hasOptionalPaid = tools.some((tool) => !tool.required && tool.access === "assinatura paga");
  const analysis = !withinBudgetCeiling
    ? "Atenção: esta pauta exige gastos acima do seu teto de R$ 200/mês. Recomendado substituir a demonstração pelo Google Flow/Gemini da sua stack."
    : requiredPaid.length
      ? "Esta pauta exige uma assinatura paga específica, mas permanece dentro do seu teto de R$ 200/mês."
      : hasOptionalPaid
        ? "100% compatível com sua stack (Google IA Pro + ChatGPT + Claude até R$ 200/mês), sem exigir gastos fora do orçamento."
        : "100% replicável com custo adicional R$ 0 usando sua stack atual (Google IA Pro + ChatGPT) e ferramentas gratuitas.";

  return {
    analysis,
    tools,
    monthlyTotalBrl,
    withinBudgetCeiling,
    totalLabel: monthlyTotalBrl ? `≈ R$ ${monthlyTotalBrl.toLocaleString("pt-BR")}/mês em novas assinaturas` : "R$ 0/mês em novas assinaturas",
    priceNote: "Valores de referência calibrados para a sua stack (Google IA Pro, ChatGPT e Claude com teto de até R$ 200/mês).",
  };
}
