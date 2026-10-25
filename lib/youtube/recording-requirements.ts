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
  totalLabel: string;
  priceNote: string;
};

type IdeaInput = { title: string; summary: string; angle: string; format: string; outline: unknown; hook: string };

const textOf = (idea: IdeaInput) => [idea.title, idea.summary, idea.angle, idea.format, idea.hook, ...(Array.isArray(idea.outline) ? idea.outline : [])].join(" ").toLocaleLowerCase("pt-BR");

const freeTools: RecordingTool[] = [
  { name: "CapCut (plano gratuito)", purpose: "Edição, cortes, legendas e exportação", access: "grátis", monthlyCostBrl: 0, monthlyCostLabel: "R$ 0/mês", required: true, note: "O plano grátis cobre uma edição explicativa normal; o Pro só entra se você escolher recursos premium." },
  { name: "Canva (plano gratuito)", purpose: "Thumbnail, cards e elementos visuais", access: "grátis", monthlyCostBrl: 0, monthlyCostLabel: "R$ 0/mês", required: true, note: "É suficiente para montar a thumbnail sem elementos premium." },
  { name: "ChatGPT (sua assinatura atual)", purpose: "Pesquisa, roteiro, perguntas e organização dos exemplos", access: "assinatura existente", monthlyCostBrl: 0, monthlyCostLabel: "já contratado · R$ 0 adicional", required: true, note: "A assinatura que você já possui atende esta pauta; não é uma nova cobrança para o vídeo." },
];

export function getRecordingRequirements(idea: IdeaInput): RecordingRequirements {
  const content = textOf(idea);
  const tools = [...freeTools];
  if (/claude code|claude duet|anthropic|claude/.test(content)) tools.push({ name: "Claude Pro", purpose: "Testes com Claude, Projects e limites maiores", access: "assinatura paga", monthlyCostBrl: 0, monthlyCostLabel: "opcional · ≈ R$ 110/mês", required: false, note: "A explicação e o teste básico podem ser feitos no plano gratuito; Pro só é necessário para limites maiores." });
  if (/capcut pro|seedance|créditos de ia|recursos premium de edição/.test(content)) tools.push({ name: "CapCut Pro", purpose: "Recursos premium de edição e créditos de IA", access: "assinatura paga", monthlyCostBrl: 110, monthlyCostLabel: "≈ R$ 110/mês", required: true, note: "O preço oficial exibido é US$ 19,99/mês; o valor local depende da região, impostos e promoções." });
  if (/canva pro|elementos premium|remoção de fundo|thumbnail premium/.test(content)) tools.push({ name: "Canva Pro", purpose: "Elementos premium, remoção de fundo e recursos avançados de IA", access: "assinatura paga", monthlyCostBrl: 35, monthlyCostLabel: "R$ 35/mês", required: true, note: "O preço de referência brasileiro do plano individual é R$ 35/mês; o plano grátis continua sendo alternativa." });
  const requiredPaid = tools.filter((tool) => tool.required && tool.access === "assinatura paga");
  const monthlyTotalBrl = requiredPaid.reduce((total, tool) => total + tool.monthlyCostBrl, 0);
  const hasOptionalPaid = tools.some((tool) => !tool.required && tool.access === "assinatura paga");
  const analysis = requiredPaid.length ? "Esta pauta exige uma ferramenta paga específica para reproduzir o teste principal. Há uma rota gratuita, mas ela muda o nível da demonstração." : hasOptionalPaid ? "A pauta pode ser gravada sem nova assinatura. As ferramentas pagas aparecem apenas como opção para ampliar o teste." : "A pauta pode ser gravada usando somente ferramentas gratuitas e a assinatura que você já possui.";
  return { analysis, tools, monthlyTotalBrl, totalLabel: monthlyTotalBrl ? `≈ R$ ${monthlyTotalBrl.toLocaleString("pt-BR")}/mês em novas assinaturas` : "R$ 0/mês em novas assinaturas", priceNote: "Valores são referências consultadas em páginas oficiais e podem mudar por país, câmbio, impostos e promoções. O total considera somente novas assinaturas obrigatórias para esta pauta." };
}
