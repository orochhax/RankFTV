export type StudyProject = {
  slug: string; code: string; date: string; title: string; summary: string;
  scenario: string; objective: string; tools: string[]; skills: string[];
  downloads: Array<{ label: string; description: string; href: string }>;
  steps: Array<{ title: string; items: string[] }>;
  deliverables: string[]; acceptance: string[]; linkedin: string[];
};

const download = (slug: string, label: string, description: string) => ({
  label, description, href: `/evolution/datascience-projects/${slug}/${label}`,
});

export const studyProjects: StudyProject[] = [
  {
    slug: "diagnostico-atendimento", code: "1C", date: "Marco 1 · Fundamentos", title: "Diagnóstico de atendimento ao cliente",
    summary: "Transforme tickets bagunçados em um diagnóstico confiável de volume, tempo, satisfação e retrabalho.",
    scenario: "Uma empresa recebe reclamações por vários canais e não sabe por que o tempo de resolução aumentou. As bases têm duplicidades, categorias inconsistentes, horários ausentes e avaliações sem vínculo.",
    objective: "Preservar os dados brutos, documentar qualidade, criar indicadores auditáveis e recomendar uma próxima decisão sem inventar causalidade.",
    tools: ["Python/Pandas", "SQL", "Excel ou Power BI", "Git e Markdown"], skills: ["Limpeza", "JOINs", "EDA", "Indicadores", "Comunicação"],
    downloads: [download("diagnostico-atendimento", "tickets.csv", "Chamados com erros intencionais."), download("diagnostico-atendimento", "clientes.csv", "Clientes e segmentos."), download("diagnostico-atendimento", "agentes.csv", "Equipe, turno e experiência."), download("diagnostico-atendimento", "avaliacoes.csv", "Satisfação vinculada aos chamados."), download("diagnostico-atendimento", "dicionario.csv", "Campos, tipos e regras.")],
    steps: [
      { title: "1. Entender e preservar", items: ["Guardar arquivos raw sem edição.", "Definir granularidade e chaves.", "Registrar perguntas e aceite."] },
      { title: "2. Diagnosticar", items: ["Medir nulos, duplicidades e chaves órfãs.", "Criar rejeitados.", "Documentar cada regra."] },
      { title: "3. Analisar", items: ["Calcular volume, primeira resposta, resolução e satisfação.", "Comparar canal e categoria.", "Separar fato de hipótese."] },
      { title: "4. Entregar", items: ["Criar relatório curto.", "Mostrar limitações.", "Publicar números reconciliados."] },
    ],
    deliverables: ["Script reproduzível", "Base tratada e rejeitados", "Dicionário", "Painel ou relatório", "README"],
    acceptance: ["Originais intactos.", "Indicadores definidos.", "JOINs não multiplicam chamados.", "Recomendações apontam para evidências."],
    linkedin: ["Problema fictício", "Erros que mudavam a leitura", "Indicador e decisão", "Aviso de dados sintéticos"],
  },
  {
    slug: "painel-estoque", code: "2B", date: "Marco 2 · BI", title: "Painel de estoque e risco de ruptura",
    summary: "Unifique vendas, movimentos e compras para encontrar risco de falta e capital parado.",
    scenario: "Uma distribuidora controla estoque em arquivos separados. Saldos não batem e pedidos atrasam.",
    objective: "Construir modelo dimensional e painel que reconciliem saldo, giro, cobertura, ruptura e compras em trânsito.",
    tools: ["Power Query", "Power BI", "SQL", "Excel"], skills: ["ETL", "Modelagem dimensional", "DAX", "Reconciliação"],
    downloads: [download("painel-estoque", "produtos.csv", "SKUs, custos e lead time."), download("painel-estoque", "movimentacoes.csv", "Entradas, saídas e ajustes."), download("painel-estoque", "vendas.csv", "Demanda diária."), download("painel-estoque", "pedidos_compra.csv", "Pedidos e previsão de chegada."), download("painel-estoque", "filiais.csv", "Filiais e regiões.")],
    steps: [
      { title: "1. Reconciliar", items: ["Calcular saldo por movimentos.", "Separar ajustes inválidos.", "Validar chaves."] },
      { title: "2. Modelar", items: ["Criar fatos e dimensões.", "Definir calendário.", "Evitar relações ambíguas."] },
      { title: "3. Medir", items: ["Calcular giro, cobertura e ruptura.", "Definir risco com demanda e lead time.", "Testar manualmente."] },
      { title: "4. Entregar", items: ["Criar visão executiva e operacional.", "Documentar atualização.", "Apontar prioridades."] },
    ],
    deliverables: ["PBIX", "Modelo documentado", "Reconciliação", "Dicionário de medidas", "README"],
    acceptance: ["Saldo fecha.", "Filtros preservam denominadores.", "Risco é reproduzível.", "Nova carga atualiza sem retrabalho."],
    linkedin: ["Pergunta de negócio", "Saldo versus disponibilidade", "SKU fictício e ação", "Modelo e painel"],
  },
  {
    slug: "risco-credito", code: "3B", date: "Marco 3 · Machine Learning", title: "Previsão de inadimplência e risco de crédito",
    summary: "Compare baselines e modelos sem esconder desbalanceamento, custo de erro ou risco de discriminação.",
    scenario: "Uma fintech fictícia quer priorizar análise manual. O alvo é desbalanceado e alguns atributos podem criar decisões injustas.",
    objective: "Criar modelo explicável, escolher limiar conforme custo e documentar limites, vieses e uso permitido.",
    tools: ["Python", "Pandas", "scikit-learn", "SQL"], skills: ["Classificação", "Validação", "Feature engineering", "Explicabilidade"],
    downloads: [download("risco-credito", "solicitantes.csv", "Perfil sintético."), download("risco-credito", "contratos.csv", "Valores, prazo e produto."), download("risco-credito", "historico_pagamentos.csv", "Pagamentos e atrasos."), download("risco-credito", "alvo_inadimplencia.csv", "Rótulo futuro separado."), download("risco-credito", "dicionario.csv", "Campos e alertas de leakage.")],
    steps: [
      { title: "1. Definir", items: ["Fixar janelas de observação e alvo.", "Definir custo de erros.", "Remover vazamento futuro."] },
      { title: "2. Criar baseline", items: ["Separar treino, validação e teste por tempo.", "Construir regra simples.", "Medir desbalanceamento."] },
      { title: "3. Modelar", items: ["Comparar logística e árvore.", "Escolher limiar por custo.", "Analisar erros por grupo."] },
      { title: "4. Documentar", items: ["Criar model card.", "Explicar revisão humana.", "Registrar drift esperado."] },
    ],
    deliverables: ["Pipeline", "Relatório de validação", "Matriz de custo", "Model card", "README"],
    acceptance: ["Teste isolado.", "Sem leakage.", "Limiar justificado.", "Limites éticos explícitos."],
    linkedin: ["Baseline versus modelo", "Por que acurácia engana", "Escolha do limiar", "Uso responsável"],
  },
  {
    slug: "previsao-atendimento", code: "4C", date: "Marco 4 · Séries temporais", title: "Previsão de volume e dimensionamento de atendimento",
    summary: "Preveja demanda diária e converta intervalos em uma recomendação operacional de equipe.",
    scenario: "O atendimento oscila por dia, campanhas e feriados. A liderança escala pessoas pela média.",
    objective: "Validar forecast temporal, quantificar incerteza e sugerir capacidade por cenário.",
    tools: ["Python", "Pandas", "statsmodels ou Prophet", "Power BI opcional"], skills: ["Séries temporais", "Backtesting", "Forecast", "Capacidade"],
    downloads: [download("previsao-atendimento", "volume_diario.csv", "Histórico diário."), download("previsao-atendimento", "calendario_eventos.csv", "Feriados e campanhas."), download("previsao-atendimento", "capacidade_equipe.csv", "Escala e produtividade.")],
    steps: [
      { title: "1. Explorar", items: ["Verificar lacunas e frequência.", "Analisar tendência e sazonalidade.", "Criar baseline sazonal."] },
      { title: "2. Validar", items: ["Usar janelas temporais.", "Comparar erro por período.", "Guardar teste final."] },
      { title: "3. Dimensionar", items: ["Converter volume em carga.", "Criar cenários.", "Explicitar produtividade."] },
      { title: "4. Entregar", items: ["Mostrar previsão e intervalo.", "Definir reavaliação.", "Separar previsão de decisão."] },
    ],
    deliverables: ["Notebook", "Backtesting", "Previsão", "Cenários de capacidade", "README"],
    acceptance: ["Validação temporal.", "Baseline comparado.", "Intervalos presentes.", "Premissas auditáveis."],
    linkedin: ["Por que a média falha", "Baseline versus modelo", "Incerteza", "Decisão operacional"],
  },
  {
    slug: "api-churn", code: "5A", date: "Marco 5 · API e produção", title: "API de decisão para risco de churn",
    summary: "Transforme um modelo de churn em API testável, documentada e segura.",
    scenario: "Uma empresa de assinatura quer priorizar contato sem executar notebooks nem receber uma caixa-preta instável.",
    objective: "Treinar modelo simples, publicar inferência via FastAPI e criar contrato, testes, logs e limites.",
    tools: ["Python", "scikit-learn", "FastAPI", "Pytest", "Docker"], skills: ["API", "Contrato", "Testes", "Empacotamento"],
    downloads: [download("api-churn", "clientes.csv", "Clientes sintéticos."), download("api-churn", "assinaturas.csv", "Planos e status."), download("api-churn", "uso_mensal.csv", "Atividade mensal."), download("api-churn", "alvo_churn.csv", "Cancelamento futuro."), download("api-churn", "contrato_api.json", "Tipos e respostas."), download("api-churn", "casos_teste.json", "Entradas e erros esperados.")],
    steps: [
      { title: "1. Modelar", items: ["Definir alvo temporal.", "Criar pipeline e baseline.", "Versionar artefato."] },
      { title: "2. Criar API", items: ["Implementar health e predict.", "Validar schemas.", "Retornar risco e versão."] },
      { title: "3. Testar", items: ["Testar contrato e bordas.", "Testar modelo.", "Não expor dados sensíveis."] },
      { title: "4. Operar", items: ["Criar Dockerfile.", "Registrar latência e erros.", "Definir drift e rollback."] },
    ],
    deliverables: ["API", "Modelo versionado", "Testes", "Dockerfile", "OpenAPI", "README"],
    acceptance: ["Entradas inválidas são rejeitadas.", "Testes rodam limpos.", "Versão é registrada.", "Documentação permite consumo."],
    linkedin: ["Notebook para serviço", "Contrato e testes", "O que a API não decide", "Chamada fictícia"],
  },
  {
    slug: "inteligencia-avaliacoes", code: "6B", date: "Marco 6 · IA aplicada", title: "Inteligência de avaliações de clientes",
    summary: "Classifique reclamações, descubra temas e produza relatório verificável sem entregar decisões a um LLM.",
    scenario: "Uma empresa recebe milhares de avaliações. Resumos genéricos escondem frequência, exemplos e mudança no tempo.",
    objective: "Criar pipeline híbrido de NLP/LLM que categorize temas, avalie qualidade e preserve rastreabilidade.",
    tools: ["Python", "Pandas", "NLP/embeddings", "LLM opcional", "FastAPI opcional"], skills: ["NLP", "Taxonomia", "Avaliação", "RAG"],
    downloads: [download("inteligencia-avaliacoes", "avaliacoes.csv", "Notas e textos sintéticos."), download("inteligencia-avaliacoes", "produtos.csv", "Catálogo."), download("inteligencia-avaliacoes", "taxonomia.csv", "Temas e critérios."), download("inteligencia-avaliacoes", "amostra_anotada.csv", "Referência para avaliação."), download("inteligencia-avaliacoes", "casos_avaliacao.json", "Casos difíceis.")],
    steps: [
      { title: "1. Taxonomia", items: ["Criar temas úteis.", "Permitir múltiplos temas e desconhecido.", "Escrever critérios."] },
      { title: "2. Baseline", items: ["Criar regra ou classificador simples.", "Medir qualidade por tema.", "Mapear ambiguidades."] },
      { title: "3. IA controlada", items: ["Usar embeddings ou LLM onde agregam.", "Versionar prompt e modelo.", "Medir custo e latência."] },
      { title: "4. Relatar", items: ["Mostrar frequência e exemplos.", "Impedir evidência inventada.", "Documentar revisão humana."] },
    ],
    deliverables: ["Pipeline", "Taxonomia", "Avaliação", "Relatório rastreável", "README e model card"],
    acceptance: ["Relatório aponta para textos.", "Existe desconhecido.", "Teste separado.", "Custos e versões registrados."],
    linkedin: ["Problema de escala", "Baseline versus IA", "Falha encontrada", "Rastreabilidade"],
  },
];

export function getStudyProject(slug: string) { return studyProjects.find((project) => project.slug === slug); }
