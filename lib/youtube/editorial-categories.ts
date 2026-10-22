export const editorialCategories = [
  {
    key: "negocios-dinheiro",
    label: "Negócios e dinheiro",
    terms: ["money", "dinheiro", "business", "negocio", "venda", "vendas", "renda", "price", "preco", "monetiz", "cliente", "clientes"],
  },
  {
    key: "ferramentas-praticas",
    label: "Ferramentas práticas",
    terms: ["como", "tutorial", "usei", "testei", "ferramenta", "tool", "app", "guia", "workflow", "passo a passo", "pratico", "pratica", "demonstracao"],
  },
  {
    key: "modelos-lancamentos",
    label: "Modelos e lançamentos",
    terms: ["openai", "anthropic", "claude", "gemini", "gpt", "modelo", "model", "lancamento", "release", "atualizacao", "opus", "haiku", "sonnet", "dots", "motion"],
  },
  {
    key: "agentes-automacao",
    label: "Agentes e automação",
    terms: ["agent", "agente", "agentes", "automacao", "automation", "workflow", "subagent", "mcp", "computer use", "trabalha sozinho"],
  },
  {
    key: "noticias-opiniao",
    label: "Notícias e opinião",
    terms: ["news", "noticia", "noticias", "why", "por que", "opiniao", "mercado", "guerra", "o que muda", "explicado", "analise"],
  },
] as const;

export type EditorialCategory = (typeof editorialCategories)[number];
export type EditorialCategoryKey = EditorialCategory["key"];

type EditorialText = {
  title?: string | null;
  summary?: string | null;
  angle?: string | null;
  rationale?: string | null;
  hook?: string | null;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

/** Classifica uma ideia de forma determinística, priorizando sinais no título. */
export function classifyEditorialCategory(input: EditorialText): EditorialCategory {
  const title = normalize(input.title ?? "");
  const body = normalize([input.summary, input.angle, input.rationale, input.hook].filter(Boolean).join(" "));
  const scores = editorialCategories.map((category, index) => ({
    category,
    index,
    score: category.terms.reduce((total, term) => {
      const normalizedTerm = normalize(term);
      return total + (title.includes(normalizedTerm) ? 4 : 0) + (body.includes(normalizedTerm) ? 1 : 0);
    }, 0),
  }));

  const best = scores.sort((a, b) => b.score - a.score || a.index - b.index)[0];
  return best.score > 0 ? best.category : editorialCategories[4];
}
