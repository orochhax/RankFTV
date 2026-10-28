export type StudyProject = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  scenario: string;
  objective: string;
  tools: string[];
  downloads: Array<{ label: string; description: string; href: string }>;
  steps: Array<{ title: string; items: string[] }>;
  deliverables: string[];
  acceptance: string[];
  linkedin: string[];
};

export const studyProjects: StudyProject[] = [
  {
    slug: "painel-vendas",
    date: "30/11/2026",
    title: "Painel de vendas para pequena empresa",
    summary: "Limpar e reconciliar pedidos, clientes e pagamentos antes de construir um painel útil no Power BI.",
    scenario: "Uma pequena empresa registra vendas em arquivos separados e não confia nos totais. A base contém datas em formatos diferentes, chaves sem correspondência, categorias inconsistentes, duplicidades e pagamentos incompletos.",
    objective: "Entregar uma visão confiável de receita, pedidos, ticket, inadimplência, canais e categorias, mantendo a origem preservada e todas as regras documentadas.",
    tools: ["Excel", "Power Query", "Power BI Desktop", "README em Markdown"],
    downloads: [{ label: "Baixar base fictícia completa (.xlsx)", description: "Pedidos, clientes, pagamentos e dicionário de dados em abas separadas e propositalmente bagunçadas.", href: "/evolution/datascience-projects/painel-vendas/base-ficticia-completa.xlsx" }],
    steps: [
      { title: "1. Diagnosticar", items: ["Preservar as abas raw e criar uma cópia de trabalho.", "Definir o que representa cada linha e cada chave.", "Listar problemas de qualidade sem corrigir silenciosamente."] },
      { title: "2. Tratar e reconciliar", items: ["Padronizar texto, datas, categorias e valores.", "Separar rejeitados e justificar duplicidades.", "Conferir contagens e totais antes e depois de cada transformação."] },
      { title: "3. Modelar e medir", items: ["Criar fato e dimensões sem multiplicar pagamentos.", "Criar medidas de vendas válidas, pedidos, ticket e valores recebidos.", "Testar medidas com casos calculados manualmente."] },
      { title: "4. Construir e entregar", items: ["Montar uma página executiva e uma de detalhe.", "Atualizar o painel após alterar a base e registrar o procedimento.", "Escrever README com problema, método, achados e limites."] },
    ],
    deliverables: ["Arquivo PBIX", "Planilha de reconciliação", "Tabela de rejeitados", "README do projeto", "PDF ou imagens do painel"],
    acceptance: ["Totais do painel batem com a reconciliação.", "Base original permanece intacta.", "Filtros não alteram indevidamente o denominador.", "Uma segunda carga é processada sem refazer tudo manualmente."],
    linkedin: ["Problema da empresa fictícia", "Duas falhas encontradas na base", "Uma decisão apoiada pelo painel", "Captura do antes/depois", "Link do repositório e aviso de dados sintéticos"],
  },
  {
    slug: "pipeline-sql-python",
    date: "31/12/2026",
    title: "Pipeline de análise de vendas com SQL e Python",
    summary: "Unificar arquivos com schema diferente, validar os dados, consultar com SQL e gerar saídas reproduzíveis.",
    scenario: "A empresa recebe um arquivo mensal de vendas. Em novembro, os nomes das colunas mudaram e alguns registros chegaram inválidos. O processo precisa falhar com clareza, preservar o bruto e continuar reproduzível.",
    objective: "Criar um pipeline local que lê os arquivos, padroniza o schema, registra rejeições, carrega uma base SQL e exporta indicadores conferidos.",
    tools: ["Python", "Pandas", "SQLite ou BigQuery gratuito", "SQL", "Git"],
    downloads: [{ label: "Baixar base fictícia completa (.xlsx)", description: "Três meses de vendas, clientes, produtos, mudança de schema e critérios de aceite.", href: "/evolution/datascience-projects/pipeline-sql-python/base-ficticia-completa.xlsx" }],
    steps: [
      { title: "1. Definir contrato", items: ["Documentar colunas, tipos, chaves e regras de negócio.", "Criar pastas raw, staging, output e logs.", "Definir quais erros rejeitam a linha e quais apenas geram alerta."] },
      { title: "2. Construir em Python", items: ["Ler todos os meses sem alterar os arquivos originais.", "Normalizar o schema de novembro.", "Validar datas, números, chaves e status; exportar rejeitados."] },
      { title: "3. Consultar com SQL", items: ["Carregar tabelas tratadas em banco local ou ambiente gratuito.", "Criar consultas de receita, recorrência, cancelamento e desempenho mensal.", "Usar contagens de controle antes e depois dos JOINs."] },
      { title: "4. Testar e documentar", items: ["Executar o pipeline em uma pasta nova.", "Criar casos conhecidos que passam e falham.", "Documentar um comando de execução e as saídas geradas."] },
    ],
    deliverables: ["Código Python organizado", "Scripts SQL", "Banco ou tabelas processadas", "Arquivo de rejeitados", "Resultados CSV/XLSX", "README de execução"],
    acceptance: ["Uma execução limpa não depende de passos manuais ocultos.", "Arquivos brutos ficam intactos.", "Mudança de schema é identificada e tratada.", "Junções preservam a granularidade e os totais.", "Erro deliberado faz o teste falhar."],
    linkedin: ["Arquitetura simples do pipeline", "Problema de schema resolvido", "Teste que evitou um resultado errado", "Indicador final", "Link do código e declaração de dados fictícios"],
  },
  {
    slug: "consultoria-dados",
    date: "25/01/2027",
    title: "Consultoria completa de dados para empresa fictícia",
    summary: "Executar o ciclo inteiro: diagnóstico, preparação, SQL, Python, Power BI, relatório executivo e proposta.",
    scenario: "A Casa Aurora percebe crescimento da receita, mas caixa e estoque não acompanham. Os dados de pedidos, itens, pagamentos, estoque e marketing têm inconsistências e não sustentam uma decisão sem tratamento.",
    objective: "Simular um atendimento profissional e honesto, escolhendo uma decisão prioritária, construindo a análise necessária e entregando uma recomendação com evidências e limites.",
    tools: ["Excel", "SQL", "Python/Pandas", "Power BI", "Git", "Documento ou PDF executivo"],
    downloads: [{ label: "Baixar caso fictício completo (.xlsx)", description: "Briefing, pedidos, itens, pagamentos, estoque e marketing com problemas intencionais.", href: "/evolution/datascience-projects/consultoria-dados/base-ficticia-completa.xlsx" }],
    steps: [
      { title: "1. Descoberta e escopo", items: ["Ler o briefing e escolher uma decisão principal.", "Escrever perguntas, hipóteses, entregas, fora de escopo e critérios de aceite.", "Avaliar a amostra antes de prometer solução."] },
      { title: "2. Diagnóstico e preparação", items: ["Criar dicionário e relatório de qualidade.", "Tratar os dados preservando original, rejeitados e trilha de regras.", "Reconciliar pedidos, itens, pagamentos e estoque."] },
      { title: "3. Análise integrada", items: ["Usar SQL para consultas verificáveis.", "Usar Python para rotina reproduzível e testes.", "Construir painel apenas com métricas conferidas."] },
      { title: "4. Recomendação e entrega", items: ["Separar fato observado, hipótese e recomendação.", "Produzir relatório executivo com próximos passos.", "Simular reunião, mudança de requisito, proposta e suporte."] },
    ],
    deliverables: ["Briefing preenchido", "Diagnóstico de qualidade", "Base tratada e rejeitados", "SQL e código Python", "Painel PBIX", "Relatório executivo", "Proposta com escopo e aceite"],
    acceptance: ["Toda recomendação aponta para uma evidência reproduzível.", "Custos, limitações e simulação estão explícitos.", "A solução pode receber nova entrada.", "Outra pessoa consegue executar pelo manual.", "O projeto não inventa cliente, faturamento ou resultado real."],
    linkedin: ["Contexto da Casa Aurora como empresa fictícia", "Decisão escolhida", "Método e ferramentas", "Achado principal e limite", "Capturas das entregas", "O que você faria em uma próxima versão"],
  },
];

export function getStudyProject(slug: string) {
  return studyProjects.find((project) => project.slug === slug);
}
