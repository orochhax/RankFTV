export type StudyProject = {
  slug: string;
  code: string;
  date: string;
  title: string;
  summary: string;
  scenario: string;
  objective: string;
  tools: string[];
  skills: string[];
  downloads: Array<{ label: string; description: string; href: string }>;
  steps: Array<{ title: string; items: string[] }>;
  deliverables: string[];
  acceptance: string[];
  linkedin: string[];
};

const download = (slug: string, label: string, description: string) => ({
  label,
  description,
  href: `/evolution/datascience-projects/${slug}/${label}`,
});

export const studyProjects: StudyProject[] = [
  {
    slug: "gateway-webhooks",
    code: "1A",
    date: "Marco 1 · APIs & Backend",
    title: "AI-Ready Gateway & Webhook Router Assíncrono",
    summary: "Microsserviço assíncrono em FastAPI com validação Pydantic estrita, processamento paralelo e streaming SSE para interfaces de IA.",
    scenario: "Uma aplicação precisa receber dezenas de webhooks por segundo de CRMs e provedores de pagamento sem travar o processamento nem perder requisições, devolvendo eventos em tempo real para o frontend.",
    objective: "Construir uma API assíncrona robusta com validação de schemas, fila de tarefas em background e endpoints de streaming via Server-Sent Events (SSE).",
    tools: ["Python", "FastAPI", "Pydantic v2", "Asyncio", "Pytest"],
    skills: ["Async Python", "Pydantic", "FastAPI", "Webhooks", "SSE Streaming"],
    downloads: [
      download("gateway-webhooks", "webhooks_stripe.json", "Payloads sintéticos de eventos de pagamento e assinaturas."),
      download("gateway-webhooks", "webhooks_crm.json", "Eventos de leads e contatos com formatos variados."),
      download("gateway-webhooks", "contrato_pydantic.json", "Definições de schema estrito e validação Pydantic."),
      download("gateway-webhooks", "casos_teste_sse.json", "Cenários de teste para streaming e concorrência."),
      download("gateway-webhooks", "dicionario.json", "Dicionário de dados, tipos e regras de validação.")
    ],
    steps: [
      { title: "1. Estruturar schemas", items: ["Definir modelos Pydantic v2 para cada evento.", "Validar tipos, regras de formato e campos opcionais.", "Configurar tratamento uniforme de erros 422."] },
      { title: "2. Implementar endpoints", items: ["Criar rotas assíncronas para recebimento de webhooks.", "Enfileirar processamento em background tasks.", "Garantir idempotência com deduplicação de eventos."] },
      { title: "3. Streaming em tempo real", items: ["Implementar rota SSE (Server-Sent Events) com StreamingResponse.", "Emitir eventos token a token sem buffering.", "Testar desconexão graciosa do cliente."] },
      { title: "4. Testar e documentar", items: ["Criar suíte de testes assíncronos com pytest e httpx.", "Documentar rotas no Swagger/OpenAPI automático.", "Publicar README com guia de integração."] }
    ],
    deliverables: ["Código da API FastAPI", "Schemas Pydantic", "Suíte de testes", "Especificação OpenAPI", "README técnico"],
    acceptance: ["Payloads inválidos são rejeitados com erro 422 descritivo.", "Chamadas simultâneas não bloqueiam a thread principal.", "Streaming SSE funciona sem latência perceptível.", "Testes automatizados cobrem 100% das rotas."],
    linkedin: ["Problema de concorrência em APIs de IA", "Por que Pydantic v2 é indispensável", "Implementação de SSE token a token", "Aviso de dados sintéticos e código no GitHub"]
  },
  {
    slug: "orquestrador-n8n",
    code: "2A",
    date: "Marco 2 · Automação Low-Code",
    title: "Orquestrador de Processos B2B com n8n & Fallback Humano",
    summary: "Pipeline de automação empresarial que conecta webhooks, CRM, WhatsApp e validação de regras com escalonamento para atendente humano.",
    scenario: "Uma média empresa perde leads e atrasa chamados de suporte por falta de integração entre o formulário do site, o banco de dados e a equipe de atendimento.",
    objective: "Criar um workflow auditável no n8n que extrai dados de webhooks, consulta o banco relacional, despacha notificações e direciona mensagens ambíguas para revisão humana.",
    tools: ["n8n", "PostgreSQL", "Evolution API / WhatsApp", "JavaScript Code Node"],
    skills: ["Workflows n8n", "Webhooks", "Integração B2B", "Human-in-the-Loop", "Logs & Retries"],
    downloads: [
      download("orquestrador-n8n", "workflow_n8n.json", "Workflow exportado pronto para importação no n8n."),
      download("orquestrador-n8n", "schema_clientes.sql", "Script SQL de criação das tabelas e índices."),
      download("orquestrador-n8n", "leads_sinteticos.csv", "Base mock de 300 leads com diferentes níveis de maturidade."),
      download("orquestrador-n8n", "regras_triagem.json", "Regras condicionais de roteamento e SLAs de atendimento."),
      download("orquestrador-n8n", "dicionario.json", "Dicionário de nós, campos e payloads do fluxo.")
    ],
    steps: [
      { title: "1. Mapear o processo", items: ["Desenhar o fluxo de estados: Entrada -> Validação -> Enriquecimento -> Despacho.", "Definir regras de pontuação de leads.", "Estabelecer critérios de fallback para atendimento humano."] },
      { title: "2. Construir o workflow", items: ["Configurar Webhook Trigger e nós de validação JSON.", "Conectar com PostgreSQL para leitura e gravação de histórico.", "Implementar nós de código em JavaScript para tratamento de arrays."] },
      { title: "3. Disparar notificações", items: ["Integrar com a API de WhatsApp para mensagens transacionais.", "Configurar canal de suporte para tickets escalonados.", "Criar Error Trigger global com alerta em caso de falha de nós."] },
      { title: "4. Auditoria e segurança", items: ["Mascarar dados sensíveis nos logs do n8n.", "Configurar retries automáticos com backoff exponencial.", "Exportar documentação de execução para clientes da agência."] }
    ],
    deliverables: ["Arquivo JSON do workflow n8n", "Script DDL do PostgreSQL", "Guia de implantação em VPS", "Vídeo de demonstração", "README"],
    acceptance: ["Workflow importa sem erros no n8n.", "Falha em API externa não derruba o fluxo principal.", "Fallback humano é acionado quando a confiança é baixa.", "Todas as etapas registram log no banco de dados."],
    linkedin: ["Como estruturar automações B2B robustas", "Diferença entre automação rasa e arquitetura com retries", "Critério de Human-in-the-loop na prática", "Estudo de caso e demonstração"]
  },
  {
    slug: "rag-multitenant",
    code: "3A",
    date: "Marco 3 · LLMs & RAG Corporativo",
    title: "Motor RAG Híbrido e Extração Estruturada Corporativa",
    summary: "Base de conhecimento corporativa com busca híbrida (semântica + léxica), isolamento multi-tenant e extração estrita de contratos e PDFs.",
    scenario: "Um escritório corporativo precisa consultar centenas de contratos e políticas internas privadas sem misturar dados entre clientes e garantindo citações exatas de página e cláusula.",
    objective: "Implementar pipeline de ingestão, chunking semântico, busca vetorial com Pinecone/pgvector, re-ranking contextual e saídas estruturadas em JSON Schema.",
    tools: ["Python", "LangChain", "OpenAI / Gemini SDK", "Pinecone", "Pydantic"],
    skills: ["Arquitetura RAG", "Embeddings", "Busca Vetorial", "Structured Outputs", "Prompt Engineering"],
    downloads: [
      download("rag-multitenant", "documentos_corporativos.json", "Base sintética de 30 documentos (contratos, políticas e manuais)."),
      download("rag-multitenant", "queries_benchmark.json", "Perguntas de teste com respostas gabarito para aferição."),
      download("rag-multitenant", "metadados_tenants.csv", "Mapeamento de empresas, departamentos e níveis de acesso."),
      download("rag-multitenant", "schema_extracao.json", "JSON Schema para extração forçada de cláusulas e valores."),
      download("rag-multitenant", "dicionario.json", "Metadados de embeddings, dimensões e parâmetros de busca.")
    ],
    steps: [
      { title: "1. Ingestão e chunking", items: ["Dividir documentos com RecursiveCharacterTextSplitter com overlap inteligente.", "Extrair metadados: tenant_id, documento, página e data.", "Gerar embeddings consistentes."] },
      { title: "2. Indexação multi-tenant", items: ["Criar índice no Pinecone ou pgvector com filtro rígido por tenant_id.", "Implementar busca híbrida (BM25 léxico + vetorial).", "Aplicar cross-encoder para re-ranking dos top-k chunks."] },
      { title: "3. Síntese e citações", items: ["Construir prompt com restrição estrita de alucinação.", "Obrigar citações literais da fonte e página consultada.", "Implementar Structured Outputs via Pydantic para respostas tabulares."] },
      { title: "4. Avaliação de precisão", items: ["Medir métrica de groundedness (aderência ao contexto).", "Testar isolamento entre tenants (garantir zero vazamento).", "Registrar consumo de tokens e custos médios por consulta."] }
    ],
    deliverables: ["Pipeline de ingestão RAG", "Mecanismo de busca híbrida", "Notebook de benchmarks", "API de consulta", "README técnico"],
    acceptance: ["Zero vazamento de contexto entre tenants diferentes.", "100% das respostas apontam documento e página de origem.", "Saídas estruturadas cumprem o schema JSON.", "Tempo médio de resposta < 2.5s."] ,
    linkedin: ["Por que RAG ingênuo falha em produção", "Isolamento multi-tenant seguro com bancos vetoriais", "Busca híbrida vs busca vetorial pura", "Demonstração e métricas de acurácia"]
  },
  {
    slug: "enxame-agentes",
    code: "4A",
    date: "Marco 4 · Sistemas Agênticos",
    title: "Enxame Multiagente Autônomo com LangGraph & Protocolo MCP",
    summary: "Equipe de agentes inteligentes autônomos com decomposição de tarefas, ferramentas expostas via MCP e aprovação humana para ações críticas.",
    scenario: "Um fluxo financeiro precisa auditar faturas digitalizadas, reconciliar dados com o ERP e gerar ordens de pagamento, exigindo dupla checagem antes de autorizar o envio de valores.",
    objective: "Construir um grafo de agentes com LangGraph utilizando padrão Supervisor, memória persistente com checkpointer, integração com servidores MCP e nós de aprovação Human-in-the-Loop.",
    tools: ["Python", "LangGraph", "Model Context Protocol (MCP)", "Streamlit", "Pydantic"],
    skills: ["LangGraph", "Protocolo MCP", "ReAct Loops", "Multi-Agent Coordination", "Human-in-the-Loop"],
    downloads: [
      download("enxame-agentes", "faturas_contratos_mock.json", "Faturas e notas fiscais sintéticas para auditoria."),
      download("enxame-agentes", "mcp_server_config.json", "Configuração de servidor MCP local com ferramentas expostas."),
      download("enxame-agentes", "estado_grafo_exemplo.json", "Exemplo de histórico de estado persistente do LangGraph."),
      download("enxame-agentes", "regras_aprovacao.json", "Políticas de alçada para aprovação e escalonamento humano."),
      download("enxame-agentes", "dicionario.json", "Estrutura do StateGraph, canais e mensagens.")
    ],
    steps: [
      { title: "1. Modelar o grafo de estado", items: ["Definir AgentState com histórico de mensagens e flags de auditoria.", "Implementar nós especialistas: Extrator, Conciliador e Auditor.", "Criar roteador condicional com base no veredito do Supervisor."] },
      { title: "2. Servidores e clientes MCP", items: ["Criar servidor MCP local expondo ferramentas de consulta a banco e ERP.", "Conectar os agentes às ferramentas via protocolo padrão MCP.", "Auditar chamadas de ferramentas e payloads."] },
      { title: "3. Interrupção Human-in-the-Loop", items: ["Configurar checkpoint persistente com SQLite/Postgres.", "Pausar o grafo antes do nó de despacho financeiro.", "Criar interface leve no Streamlit para operador aprovar ou rejeitar a ação."] },
      { title: "4. Resiliência de loop", items: ["Configurar limite máximo de passos (recursion_limit) para evitar loops infinitos.", "Tratar falhas de tool calling com retries amigáveis.", "Documentar diagrama de arquitetura do grafo em Mermaid."] }
    ],
    deliverables: ["Grafo LangGraph funcional", "Servidor MCP configurado", "App Streamlit de revisão", "Diagrama Mermaid da arquitetura", "README"],
    acceptance: ["Grafo conclui fluxo de ponta a ponta para casos válidos.", "Ações críticas nunca executam sem aprovação do operador.", "Ferramentas respondem via protocolo MCP padronizado.", "Loops infinitos são interrompidos com fallback seguro."],
    linkedin: ["Arquitetura de enxames de agentes com LangGraph", "O que é Model Context Protocol (MCP) e por que adotar", "Human-in-the-loop: o segredo para vender agentes para médias empresas", "Código aberto e arquitetura no GitHub"]
  },
  {
    slug: "evals-guardrails",
    code: "5A",
    date: "Marco 5 · LLMOps & Qualidade",
    title: "Pipeline Automatizado de Evals, Testes e Guardrails",
    summary: "Esteira contínua de qualidade de software para IA com testes unitários em Pytest, simulação de APIs por Mock e avaliação por LLM-as-a-judge.",
    scenario: "Uma empresa quer colocar um assistente de IA em produção, mas tem receio de alucinações, vazamento de dados internos e prompt injection após atualizações de versão.",
    objective: "Desenvolver suíte determinística com Pytest, benchmarking automatizado contra golden dataset, guardrails de entrada/saída e métricas de groundedness e latência.",
    tools: ["Python", "Pytest", "LLM-as-a-judge", "Guardrails AI", "Mock"],
    skills: ["Pytest", "Mocking de LLM", "Evals", "Defesa contra Injection", "Métricas de IA"],
    downloads: [
      download("evals-guardrails", "golden_dataset.json", "100 pares de perguntas, contexto e respostas padrão-ouro."),
      download("evals-guardrails", "rubricas_avaliacao.json", "Critérios objetivos de pontuação para o juiz LLM."),
      download("evals-guardrails", "prompt_injection_bench.json", "40 ataques de jailbreak e injeção de prompt para validação de segurança."),
      download("evals-guardrails", "test_fixtures.py", "Fixtures reutilizáveis do Pytest com mocks de resposta."),
      download("evals-guardrails", "dicionario.json", "Definições de métricas de qualidade, limites de erro e SLA.")
    ],
    steps: [
      { title: "1. Testes unitários com Mocks", items: ["Escrever testes em Pytest para funções que processam saídas de LLMs.", "Simular respostas de APIs sem gastar tokens com unittest.mock.", "Validar comportamento sob payloads corrompidos ou incompletos."] },
      { title: "2. Benchmark com LLM-as-a-Judge", items: ["Executar avaliação automática contra o Golden Dataset.", "Calcular acurácia, coerência e fidelidade contextual.", "Detectar regressões de qualidade entre versões de prompts."] },
      { title: "3. Guardrails de segurança", items: ["Implementar camada de sanitização contra Prompt Injection.", "Validar ausência de vazamento de segredos (DLP).", "Bloquear respostas fora do escopo ou com tom inadequado."] },
      { title: "4. Relatório executivo de qualidade", items: ["Gerar dashboard HTML de métricas com pytest-html.", "Definir threshold de aprovação para deploy.", "Apresentar matriz de riscos mitigados."] }
    ],
    deliverables: ["Suíte de testes Pytest", "Script avaliador LLM-as-a-judge", "Módulo de Guardrails", "Relatório de métricas", "README"],
    acceptance: ["Suíte de testes roda em < 10 segundos localmente com Mocks.", "Pipeline identifica 100% dos ataques do benchmark de injeção.", "Nota média do juiz LLM >= 4.5/5 no Golden Dataset.", "Zero exposição de chaves ou segredos em logs."],
    linkedin: ["Como testar software não determinístico com Pytest", "Implementando LLM-as-a-judge com rubricas rigorosas", "Protegendo aplicações de IA contra Prompt Injection", "Relatório de qualidade para clientes B2B"]
  },
  {
    slug: "enterprise-deploy-aws",
    code: "6A",
    date: "Marco 6 · Cloud & Infraestrutura",
    title: "Plataforma Enterprise de IA Conteinerizada & Deploy na AWS",
    summary: "Infraestrutura completa conteinerizada com Docker Compose, esteira de CI/CD via GitHub Actions e deploy de endpoints de IA na nuvem AWS.",
    scenario: "A aplicação de IA precisa rodar em produção de forma isolada, escalável, com suporte a múltiplos serviços (API + Banco + n8n) e esteira de deploy automatizado.",
    objective: "Criar Dockerfile multi-stage, orquestrar serviços com Docker Compose, configurar GitHub Actions para testes e deploy em instâncias AWS com endpoints documentados.",
    tools: ["Docker", "Docker Compose", "AWS (EC2/ECS, S3, IAM)", "GitHub Actions", "FastAPI"],
    skills: ["Docker", "Docker Compose", "AWS Cloud", "CI/CD", "Deploy em Produção"],
    downloads: [
      download("enterprise-deploy-aws", "Dockerfile", "Dockerfile multi-stage otimizado para produção Python."),
      download("enterprise-deploy-aws", "docker-compose.yml", "Orquestração completa: FastAPI, PostgreSQL pgvector e n8n."),
      download("enterprise-deploy-aws", "github_actions_ci.yml", "Pipeline de CI/CD com linter, testes e build de imagem."),
      download("enterprise-deploy-aws", "aws_infra_setup.sh", "Script de automação de provisionamento de infraestrutura AWS."),
      download("enterprise-deploy-aws", "dicionario.json", "Variáveis de ambiente, portas de rede e políticas IAM.")
    ],
    steps: [
      { title: "1. Otimizar containers", items: ["Construir Dockerfile multi-stage com imagem base slim.", "Garantir execução com usuário não-root por segurança.", "Reduzir tamanho final da imagem em mais de 60%."] },
      { title: "2. Orquestrar serviços locais", items: ["Configurar docker-compose.yml conectando API, banco e n8n.", "Definir volumes persistentes e redes internas isoladas.", "Configurar healthchecks em todos os serviços."] },
      { title: "3. Pipeline de CI/CD", items: ["Criar workflow no GitHub Actions disparado a cada Pull Request.", "Executar linters (ruff/flake8) e testes automatizados no Pytest.", "Realizar build da imagem Docker e enviar para registro privado (ECR)."] },
      { title: "4. Deploy e observabilidade na nuvem", items: ["Subir instâncias seguras com políticas de IAM restritas na AWS.", "Configurar proxy reverso com SSL/TLS.", "Validar endpoint público de inferência e monitorar métricas."] }
    ],
    deliverables: ["Dockerfile e docker-compose.yml", "Workflow GitHub Actions", "Script de deploy AWS", "Guia de operação e rollback", "README"],
    acceptance: ["Build e subida de todos os serviços via um único docker compose up.", "Pipeline de CI bloqueia merges com testes quebrados.", "Endpoint de inferência responde publicamente com HTTPS.", "Documentação permite reprodução do ambiente em qualquer nuvem."],
    linkedin: ["Da máquina local para a nuvem da AWS com Docker", "Construindo uma esteira de CI/CD para aplicações de IA", "Segurança e permissões IAM em projetos corporativos", "Arquitetura completa e lições aprendidas"]
  }
];

export const getStudyProject = (slug: string) => studyProjects.find((project) => project.slug === slug);

