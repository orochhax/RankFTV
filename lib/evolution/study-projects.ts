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
    date: "Marco 1 · Backend, Filas & Multi-LLM Router",
    title: "Enterprise AI Gateway, Filas Assíncronas & Multi-LLM Fallback Router",
    summary: "Gateway full-stack em FastAPI + React/Next.js com roteamento inteligente entre LLMs (OpenAI, Claude, Groq), filas RabbitMQ/Redis com DLQ, streaming SSE e suíte Pytest.",
    scenario: "Grandes operações (como nos cases das vagas da Claro, NXT, BIX e FullStack) sofrem com quedas de provedores de LLM, estouro de orçamento de tokens e perda de webhooks críticos sob picos de tráfego.",
    objective: "Construir um AI Gateway resiliente que valida contratos via Pydantic v2, enfileira tarefas pesadas no RabbitMQ com retries exponenciais e Dead-Letter Queue (DLQ), faz fallback automático entre provedores de IA, transmite respostas via SSE e exibe telemetria em um painel React/TypeScript.",
    tools: ["Python", "FastAPI", "Pydantic v2", "RabbitMQ / Redis", "TypeScript & Next.js", "Pytest"],
    skills: ["FastAPI & Asyncio", "RabbitMQ & Filas DLQ", "Multi-LLM Routing", "TypeScript & React", "Pytest & Mocking"],
    downloads: [
      download("gateway-webhooks", "webhooks_stripe.json", "Payloads sintéticos de eventos financeiros e assinaturas para teste de idempotência."),
      download("gateway-webhooks", "webhooks_crm.json", "Eventos corporativos de CRM e chamados com variações de schema e falhas injetadas."),
      download("gateway-webhooks", "contrato_pydantic.json", "JSON Schema estrito para validação de entrada, roteamento de modelos e cotas de tokens."),
      download("gateway-webhooks", "casos_teste_sse.json", "Cenários de carga, queda de provedor primário (fallback) e desconexão de streaming SSE."),
      download("gateway-webhooks", "dicionario.json", "Arquitetura do gateway, regras de rate-limit por tenant e especificação das filas AMQP.")
    ],
    steps: [
      { title: "1. Contratos Pydantic v2 & Idempotência", items: ["Modelar schemas estritos de requisição, resposta e orçamento de tokens.", "Implementar chave de idempotência no Redis para impedir processamento duplicado de webhooks.", "Padronizar tratamento de erros 422, 429 (Rate Limit) e 503."] },
      { title: "2. Mensageria RabbitMQ & Dead-Letter Queue", items: ["Configurar producer e consumer assíncronos conectados ao RabbitMQ via Docker.", "Implementar exponential backoff retry (3 tentativas) para falhas transitórias.", "Rotear cargas corrompidas ou esgotadas para uma Dead-Letter Queue (DLQ) auditável."] },
      { title: "3. Multi-LLM Router & Streaming SSE", items: ["Construir camada de roteamento por custo/complexidade e fallback automático (OpenAI -> Anthropic Claude -> Groq/Local).", "Expor endpoint Server-Sent Events (SSE) para streaming token a token sem bloqueio de thread.", "Construir dashboard em React/Next.js + TypeScript para monitorar filas, latência e custo por requisição."] },
      { title: "4. Suíte Pytest & ADR Executivo", items: ["Escrever testes determinísticos com Pytest e mocks simulando timeout da OpenAI e acionamento do fallback.", "Documentar Architecture Decision Record (ADR-001) justificando a escolha de filas assíncronas e roteamento multi-modelo.", "Publicar estudo de caso técnico no GitHub e LinkedIn."] }
    ],
    deliverables: ["API FastAPI + Worker RabbitMQ", "Painel Operacional Next.js/TypeScript", "Suíte completa Pytest", "ADR-001 (Architecture Decision Record)", "README com cálculo de ROI e latência"],
    acceptance: ["Queda simulada do provedor primário aciona o modelo de fallback em < 400ms sem erro para o usuário.", "Mensagens com falha permanente vão para a DLQ após 3 retries sem travar o worker.", "Eventos duplicados com mesmo event_id são ignorados com retorno 200 idempotente.", "100% da suíte Pytest passa localmente sem consumir créditos reais de API."],
    linkedin: ["Por que sistemas de IA em produção precisam de Multi-LLM Fallback e filas DLQ", "Arquitetura do Gateway FastAPI + RabbitMQ + Next.js", "Demonstração de resiliência: derrubando o provedor primário ao vivo", "Link do repositório com ADR e código-fonte"]
  },
  {
    slug: "orquestrador-n8n",
    code: "2A",
    date: "Marco 2 · Discovery FDE, Dados & Automação Omnichannel",
    title: "Motor FDE de Automação B2B, Triagem WhatsApp, Databricks/SQL & Escalonamento Humano",
    summary: "Solução híbrida de rápido deploy (n8n + API Django REST Framework + PostgreSQL + Databricks Lakehouse) com atendimento via WhatsApp, cálculo de SLA e transbordo humano.",
    scenario: "Empresas de médio e grande porte (como nos cases da Builder Accelerator, Stellarby.ai, fonio.ai, Wilco e YUPII) têm operações travadas entre planilhas, ERPs legados, bancos SQL e atendimento manual no WhatsApp.",
    objective: "Executar o ciclo completo de um Forward Deployed Engineer: mapear o processo desorganizado, construir uma API corporativa em Django REST Framework + PostgreSQL, sincronizar dados analíticos com camadas Bronze/Silver/Gold (padrão Databricks/Delta) e orquestrar o atendimento ativo no WhatsApp via n8n com Redis e escalonamento humano.",
    tools: ["Django REST Framework", "PostgreSQL", "Databricks / PySpark & SQL", "n8n & Redis", "Evolution API (WhatsApp)"],
    skills: ["Discovery & Requisitos FDE", "Django REST Framework", "PostgreSQL & Window Functions", "Databricks & Delta Lake", "Orquestração n8n & WhatsApp"],
    downloads: [
      download("orquestrador-n8n", "workflow_n8n.json", "Workflow n8n com memória Redis, integração WhatsApp, chamada à API Django e fallback humano."),
      download("orquestrador-n8n", "schema_clientes.sql", "DDL completo do PostgreSQL com tabelas transacionais, histórico de SLA, views e Window Functions."),
      download("orquestrador-n8n", "leads_sinteticos.csv", "Base bruta com 500 registros operacionais e anomalias reais para limpeza e ingestão Bronze/Silver/Gold."),
      download("orquestrador-n8n", "regras_triagem.json", "Matriz de decisão determinística vs. probabilística e políticas de escalonamento por risco."),
      download("orquestrador-n8n", "dicionario.json", "Documento de Discovery FDE, especificação de requisitos e cálculo de ROI (horas poupadas/mês).")
    ],
    steps: [
      { title: "1. Discovery FDE & Modelagem PostgreSQL", items: ["Mapear o processo atual (AS-IS) e desenhar o fluxo otimizado (TO-BE) separando regras determinísticas de decisões de IA.", "Criar schema relacional no PostgreSQL e consultas analíticas com CTEs e Window Functions.", "Desenvolver endpoints seguros no Django REST Framework (DRF) com paginação, filtros e permissões."] },
      { title: "2. Pipeline Lakehouse (Bronze / Silver / Gold)", items: ["Ingerir a base bruta de operações tratando duplicidades, nulos e inconsistências de tipos.", "Estruturar as tabelas analíticas no padrão Medallion (Databricks / PySpark / SQL) para alimentar indicadores executivos.", "Validar integridade referencial entre o banco transacional e a camada analítica."] },
      { title: "3. Orquestração Omnichannel n8n + Redis + WhatsApp", items: ["Conectar o n8n self-hosted à API do Django DRF, ao Redis (controle de sessão/memória) e ao WhatsApp.", "Implementar triagem inteligente que resolve casos padrão automaticamente e transfere casos críticos/ambíguos para um operador humano com resumo contextual.", "Configurar Error Workflow global para alertar falhas de integração em tempo real."] },
      { title: "4. Homologação (UAT) & Relatório de ROI", items: ["Definir critérios de aceite e plano de homologação junto às áreas de negócio (como exigido na vaga da VUNOX e Getnet).", "Quantificar o impacto: redução do tempo de ciclo (SLA), horas humanas economizadas e custo operacional.", "Documentar o playbook de operação e handoff para o cliente."] }
    ],
    deliverables: ["API Django REST Framework + PostgreSQL", "Notebooks/Scripts Lakehouse (Bronze/Silver/Gold)", "Workflow n8n exportado", "Documento de Discovery & ROI Executivo", "README técnico"],
    acceptance: ["API Django DRF valida autenticação, permissões e responde às consultas do orquestrador em < 150ms.", "Camada Gold reflete 100% das métricas de SLA conferidas via Window Functions no PostgreSQL.", "Conversas fora da política de confiança são pausadas no bot e entregues à fila humana sem perda de histórico.", "Estudo de caso apresenta cálculo claro de ROI antes vs. depois da automação."],
    linkedin: ["O trabalho real de um Forward Deployed Engineer: do Discovery ao sistema em produção", "Quando usar regra determinística (SQL/Python) vs. Low-Code (n8n) vs. LLM", "Integrando Django REST Framework, PostgreSQL, Databricks e WhatsApp", "Resultados mensuráveis de ROI e link do projeto"]
  },
  {
    slug: "rag-multitenant",
    code: "3A",
    date: "Marco 3 · IDP & RAG Híbrido com Segurança RBAC",
    title: "Plataforma IDP (Intelligent Document Processing) & RAG Híbrido Multi-Tenant com RBAC",
    summary: "Motor corporativo de processamento de documentos complexos (PDFs, tabelas, apólices) com chunking parent-child, busca híbrida (BM25 + pgvector/Qdrant), reranking e controle de acesso RBAC.",
    scenario: "Bancos, seguradoras e grandes empresas (como nas vagas da YUPII, Semantix, BIX Tecnologia, TextYess, Volkswagen e Claro) precisam consultar milhares de apólices, contratos e catálogos técnicos sem que a busca erre códigos exatos e garantindo que um usuário jamais acesse dados restritos a outro cargo ou empresa.",
    objective: "Construir um pipeline completo de IDP e RAG de nível produção: extrair texto, tabelas e estrutura de documentos complexos, testar estratégias avançadas de chunking, combinar busca lexical (BM25) com busca vetorial (pgvector/Qdrant), aplicar Cross-Encoder Reranking e impor filtragem de segurança RBAC/ABAC antes da geração da resposta.",
    tools: ["Python", "FastAPI", "LangChain & LlamaIndex", "PostgreSQL (pgvector) / Qdrant", "Cross-Encoder Reranker", "Pydantic"],
    skills: ["IDP & Parsing Documental", "Chunking Avançado (Parent-Child)", "Hybrid Search (BM25 + Vector)", "Cross-Encoder Reranking", "Segurança RBAC Multi-Tenant"],
    downloads: [
      download("rag-multitenant", "documentos_corporativos.json", "Corpus sintético de apólices de seguro, contratos financeiros, tabelas de preços e normas internas com metadados de acesso."),
      download("rag-multitenant", "queries_benchmark.json", "Conjunto de perguntas difíceis (códigos exatos de cláusulas, tabelas numéricas e tentativas de acesso cruzado não autorizado)."),
      download("rag-multitenant", "metadados_tenants.csv", "Matriz RBAC/ABAC de empresas (tenants), departamentos, cargos (analista, jurídico, diretoria) e níveis de sigilo."),
      download("rag-multitenant", "schema_extracao.json", "Contrato Pydantic / JSON Schema para extração estruturada de tabelas, coberturas, multas e citações obrigatórias."),
      download("rag-multitenant", "dicionario.json", "Especificação das estratégias de chunking e métricas de recuperação (Recall@k, MRR e nDCG).")
    ],
    steps: [
      { title: "1. Pipeline IDP (Extração de Layout e Tabelas)", items: ["Implementar parser documental que preserva hierarquia de títulos, cláusulas e tabelas de PDFs e relatórios.", "Extrair entidades estruturadas (valores, datas, partes, coberturas) forçando saída validada em Pydantic.", "Anexar metadados obrigatórios de governança a cada bloco: tenant_id, allowed_roles, doc_id, page_number e valid_from."] },
      { title: "2. Chunking Parent-Child & Indexação Híbrida", items: ["Comparar chunking de tamanho fixo, recursivo e Parent-Child (indexando trechos menores para busca exata e recuperando o bloco-pai para contexto completo).", "Indexar embeddings no PostgreSQL (pgvector) / Qdrant em conjunto com índice lexical BM25.", "Implementar fusão de rankings (Reciprocal Rank Fusion - RRF) combinando busca exata por SKU/cláusula e busca semântica."] },
      { title: "3. Segurança RBAC/ABAC & Cross-Encoder Reranking", items: ["Aplicar filtro obrigatório de permissão (tenant_id + user_role IN allowed_roles) diretamente na query do banco vetorial antes do retrieval.", "Reordenar os top-20 candidatos para top-5 usando modelo Cross-Encoder de Reranking.", "Forçar citação estrita [doc_id, página, cláusula] e recusa determinística quando a evidência não estiver no contexto autorizado."] },
      { title: "4. Benchmark Quantitativo de Recuperação", items: ["Avaliar o pipeline contra o benchmark medindo Recall@5, MRR (Mean Reciprocal Rank) e nDCG (como exigido na vaga da BIX Tecnologia).", "Executar bateria de testes de penetração tentando acessar documentos de diretoria com token de perfil analista (garantindo 0% de vazamento).", "Documentar o comparativo de latência e precisão entre Vetorial Puro vs. Híbrido + Reranking."] }
    ],
    deliverables: ["Motor IDP + RAG Híbrido em Python/FastAPI", "Módulo de Segurança RBAC/ABAC Multi-Tenant", "Script de Benchmark (Recall@k, MRR, nDCG)", "Interface de Consulta com Visualização de Fontes", "README & Estudo de Caso"],
    acceptance: ["Zero vazamento de documentos entre tenants ou cargos inferiores em 100% dos testes de segurança RBAC.", "Busca Híbrida + Reranking supera a busca vetorial pura em códigos exatos, cláusulas e dados tabulares.", "100% das respostas geradas contêm citações verificáveis de documento e página.", "Métricas de Recall@5 e MRR documentadas com código reproduzível."],
    linkedin: ["Por que busca vetorial pura falha em códigos, tabelas e contratos (e como resolver com Hybrid Search + Reranking)", "Implementando controle de acesso RBAC/ABAC na camada vetorial para conformidade LGPD", "Medindo RAG como engenheiro: Recall@k, MRR e nDCG na prática", "Repositório completo e estudo comparativo"]
  },
  {
    slug: "enxame-agentes",
    code: "4A",
    date: "Marco 4 · Harness Multiagente, MCP, NL2SQL & Human-in-the-Loop",
    title: "Agent Harness Corporativo: LangGraph, Servidores MCP, NL2SQL & Human-in-the-Loop",
    summary: "Runtime multiagente com LangGraph e Model Context Protocol (MCP) que combina consultas Text-to-SQL seguras, RAG, voz/texto e aprovação humana para ações críticas.",
    scenario: "Consultorias globais e empresas de tecnologia (FullStack FDE, Extractta, Sierra Studio, Volkswagen, Itaú, NXT e Faber AI) precisam de agentes que operem sobre bancos SQL e APIs reais dentro de trilhos determinísticos (Agent Harness), sabendo quando executar uma query SQL em vez de busca vetorial e exigindo aprovação humana antes de alterar registros críticos.",
    objective: "Construir um Agent Harness completo em LangGraph com estado persistente, servidores MCP próprios expondo ferramentas de banco de dados (NL2SQL read-only) e APIs de negócio, controle rígido de loop/custo de tokens, canal multimodal (texto e voz) e checkpoint Human-in-the-Loop com trilha de auditoria.",
    tools: ["Python", "LangGraph", "Model Context Protocol (MCP)", "PostgreSQL (NL2SQL)", "OpenAI / Claude / Ollama", "React / Streamlit"],
    skills: ["Agent Harness & Agent Loops", "LangGraph State Machines", "Servidores & Clientes MCP", "Text-to-SQL (NL2SQL) Seguro", "Human-in-the-Loop & Audit Trail"],
    downloads: [
      download("enxame-agentes", "faturas_contratos_mock.json", "Base transacional de pedidos, faturas, contratos e divergências financeiras para auditoria pelos agentes."),
      download("enxame-agentes", "mcp_server_config.json", "Especificação dos servidores MCP locais (banco SQL analítico, buscador documental e executor de ERP)."),
      download("enxame-agentes", "estado_grafo_exemplo.json", "Snapshot de StateGraph com checkpoints, memória de curto/longo prazo e pausa para aprovação humana."),
      download("enxame-agentes", "regras_aprovacao.json", "Políticas determinísticas de alçada (limites financeiros, bloqueio de SQL destrutivo e orçamento máximo de tokens por loop)."),
      download("enxame-agentes", "dicionario.json", "Arquitetura do Agent Harness, contrato de ferramentas MCP e guia de execução.")
    ],
    steps: [
      { title: "1. Arquitetura do Agent Harness em LangGraph", items: ["Modelar StateGraph tipado com controle de passos máximos (recursion_limit), orçamento de tokens (token budget) e critérios determinísticos de parada.", "Implementar roteador de intenção que decide quando o problema exige uma consulta SQL exata (NL2SQL), uma busca documental (RAG) ou ambos.", "Garantir recuperação graciosa de falhas quando uma ferramenta retorna erro ou schema inválido."] },
      { title: "2. Criação de Servidores e Clientes MCP", items: ["Desenvolver servidor MCP padronizado expondo ferramentas de consulta SQL (read-only com validação de AST/keywords para impedir DROP/DELETE/UPDATE), busca de contratos e abertura de ordens no ERP.", "Documentar descrições de tools e JSON Schemas otimizados para alta precisão em Tool/Function Calling.", "Registrar log estruturado de cada chamada MCP (entradas, saídas, duração e agente solicitante)."] },
      { title: "3. Checkpoint Human-in-the-Loop & Canal de Voz/Texto", items: ["Configurar persistência de estado (PostgresSaver/SqliteSaver) permitindo pausar uma execução por horas ou dias.", "Interceptar ações de alto impacto (ex.: aprovação de estorno ou pagamento acima da alçada) pausando o grafo e exibindo painel para decisão humana (Aprovar / Editar / Rejeitar).", "Integrar entrada e saída opcional de áudio (STT/TTS) para operação por voz."] },
      { title: "4. Auditoria de Trajetória & Custo Operacional", items: ["Avaliar se o agente escolheu a sequência ótima de ferramentas (Trajectory Evaluation) sem chamadas redundantes.", "Calcular o custo exato em dólares e o tempo economizado por caso resolvido.", "Documentar o diagrama completo da máquina de estados do LangGraph."] }
    ],
    deliverables: ["Agent Harness em LangGraph", "Servidor MCP Customizado (NL2SQL + ERP Tools)", "Interface de Supervisão Human-in-the-Loop", "Módulo de Validação SQL Read-Only", "README & Diagrama de Arquitetura"],
    acceptance: ["Agente responde perguntas quantitativas via NL2SQL com 100% de exatidão numérica e bloqueia qualquer tentativa de comando SQL de escrita.", "Ações fora da alçada automática pausam obrigatoriamente no nó Human-in-the-Loop e só retomam após assinatura do supervisor.", "Orçamento de tokens e limite de iterações impedem loops infinitos em 100% dos casos de borda.", "Ferramentas são consumidas via protocolo MCP desacoplado."],
    linkedin: ["Harness Engineering na prática: construindo trilhos determinísticos ao redor de agentes probabilísticos", "Como criar seus próprios servidores MCP e combinar NL2SQL + RAG no LangGraph", "Human-in-the-Loop e trilha de auditoria para setores regulados (Bancos e Seguradoras)", "Demonstração em vídeo e código no GitHub"]
  },
  {
    slug: "evals-guardrails",
    code: "5A",
    date: "Marco 5 · LLMOps, Evals, Observabilidade & Segurança OWASP",
    title: "Suite LLMOps: Evals Automatizados, Guardrails OWASP/LGPD & Observabilidade (Langfuse)",
    summary: "Plataforma de engenharia de avaliação (Golden Datasets, LLM-as-a-Judge), defesa ativa contra Prompt Injection, mascaramento de PII (LGPD/GDPR) e tracing com Langfuse/OpenTelemetry.",
    scenario: "O maior gargalo citado pelas vagas da FullStack FDE, TextYess, Claro Brasil, Google, Volkswagen e Faber AI é a operação de Dia 2: colocar IA em produção sem que mudanças de prompt degradem a qualidade silenciosamente e sem expor dados sensíveis ou sofrer ataques de Prompt Injection.",
    objective: "Construir uma suíte profissional de LLMOps e Segurança: instrumentar tracing completo (Langfuse / OpenTelemetry), implementar Guardrails de entrada e saída alinhados ao OWASP LLM Top 10 e LGPD/GDPR (mascaramento de CPF, cartão, e-mail e bloqueio de jailbreak) e criar um harness de avaliação automatizada com Golden Dataset e LLM-as-a-Judge.",
    tools: ["Python", "Pytest", "Langfuse / OpenTelemetry", "LLM-as-a-Judge (DeepEval / RAGAS pattern)", "OWASP LLM Guardrails"],
    skills: ["Evaluation Engineering (Evals)", "LLM-as-a-Judge & Golden Sets", "Langfuse & OpenTelemetry Tracing", "Guardrails OWASP LLM Top 10", "LGPD / GDPR PII Masking"],
    downloads: [
      download("evals-guardrails", "golden_dataset.json", "Golden Dataset com 100 casos reais anotados (perguntas, contexto esperado, SQL/tool esperada e resposta padrão-ouro)."),
      download("evals-guardrails", "rubricas_avaliacao.json", "Rubricas determinísticas e de LLM-as-a-Judge para Faithfulness (Groundedness), Answer Relevance, Tool Accuracy e Latência."),
      download("evals-guardrails", "prompt_injection_bench.json", "Bateria Red-Team com 50 ataques baseados no OWASP LLM Top 10 (Prompt Injection direto/indireto, vazamento de system prompt e exfiltração de PII)."),
      download("evals-guardrails", "test_fixtures.py", "Fixtures Pytest para simulação determinística, cálculo de métricas e verificação de regressão de prompts."),
      download("evals-guardrails", "dicionario.json", "Matriz de governança (NIST AI RMF / OWASP LLM / LGPD) e guia de leitura de traces.")
    ],
    steps: [
      { title: "1. Guardrails OWASP LLM & Mascaramento LGPD/GDPR", items: ["Implementar pipeline de pré-processamento que detecta e mascara dados pessoais (CPF, CNPJ, cartões, telefones, e-mails) antes de enviar o payload para provedores externos de LLM.", "Construir detector de Prompt Injection, Jailbreak e tentativa de extração de System Prompt.", "Validar a saída do modelo (Output Guardrail) bloqueando alucinações de URLs, códigos maliciosos ou vazamento de PII."] },
      { title: "2. Observabilidade & Tracing (Langfuse / OpenTelemetry)", items: ["Instrumentar cada etapa da aplicação (retrieval, reranking, prompt, tool call, resposta final) com spans estruturados.", "Registrar versão do prompt, modelo utilizado, contagem exata de tokens (input/output/cached), custo em USD e latência P50/P95/P99.", "Criar painel de diagnóstico para identificar rapidamente se uma resposta ruim foi falha de Retrieval, de Prompt ou de Tool."] },
      { title: "3. Harness de Avaliação Automatizada (Golden Set + LLM-as-a-Judge)", items: ["Implementar avaliador automatizado que roda os 100 casos do Golden Dataset a cada alteração de prompt ou modelo.", "Calcular métricas de Fidelidade ao Contexto (Groundedness/Faithfulness), Relevância, Acurácia de Tool Calling e Custo Médio.", "Comparar objetivamente 3 modelos (ex.: GPT vs. Claude vs. Modelo Open-Weight) em uma matriz Qualidade x Latência x Custo."] },
      { title: "4. Testes de Regressão com Pytest", items: ["Integrar os testes de segurança e qualidade em uma suíte Pytest executável via linha de comando.", "Gerar relatório executivo de conformidade e scorecard de aprovação para produção.", "Documentar o playbook de resposta a incidentes e drift de modelo."] }
    ],
    deliverables: ["Engine de Guardrails OWASP + PII Masking (LGPD)", "Harness de Avaliação (Golden Dataset + LLM-as-a-Judge)", "Instrumentação de Tracing (Langfuse / OpenTelemetry)", "Relatório Benchmark Multi-Modelo (Qualidade x Custo x Latência)", "README & Matriz de Segurança"],
    acceptance: ["100% dos ataques de Prompt Injection e vazamento de System Prompt do benchmark Red-Team são bloqueados.", "Zero dados sensíveis (CPF, cartão, e-mail real) chegam em texto aberto à API externa da LLM.", "Cada execução gera trace completo auditável com custo, tokens, latência e versão de prompt.", "Relatório automatizado comprova Groundedness >= 90% no Golden Dataset."],
    linkedin: ["O Dia 2 da Engenharia de IA: como evitar que seus agentes alucinem em produção com Evals e Langfuse", "Segurança para IA Corporativa: bloqueando Prompt Injection (OWASP LLM) e protegendo dados sob a LGPD", "Como comparar GPT, Claude e modelos open-weight com números reais (Golden Datasets + LLM-as-a-Judge)", "Código-fonte e benchmark completo no GitHub"]
  },
  {
    slug: "enterprise-deploy-aws",
    code: "6A",
    date: "Marco 6 · CI/CD com Gate de Evals, Docker, Kubernetes & AWS ECS",
    title: "Plataforma Cloud-Native FDE: CI/CD com Gate de Evals, Docker, K8s & Deploy AWS ECS",
    summary: "Infraestrutura completa de produção: containers multi-stage, Docker Compose, manifestos Kubernetes, pipeline GitHub Actions que bloqueia deploys com queda de Evals e deploy na AWS (ECR, ECS Fargate, S3, IAM, WAF e CloudWatch).",
    scenario: "Para fechar o ciclo exigido pelas vagas da FullStack, ByteDance, Google, Itaú, Volkswagen, G4F e Portera, o engenheiro precisa provar que sabe empacotar toda a plataforma de IA, automatizar o deploy com bloqueio automático de regressão (CI/CD para IA) e sustentar a operação na nuvem AWS com segurança e monitoramento de custos.",
    objective: "Conteinerizar o ecossistema completo de IA, estruturar manifestos de orquestração (Docker Compose e Kubernetes), construir uma pipeline de CI/CD no GitHub Actions que executa Linters, Scan de Segurança (Bandit/Safety), Pytest e Gate de Avaliação de IA, e realizar o deploy na AWS utilizando ECR, ECS Fargate, ALB, S3, IAM Roles, WAF e CloudWatch.",
    tools: ["Docker & Docker Compose", "Kubernetes", "GitHub Actions (CI/CD)", "AWS (ECS Fargate, ECR, S3, IAM, ALB, WAF, CloudWatch)", "Python / FastAPI"],
    skills: ["CI/CD para IA (GitHub Actions)", "Docker Multi-Stage & Compose", "Kubernetes & Orquestração", "AWS ECS Fargate & ECR", "CloudWatch, IAM, WAF & FinOps"],
    downloads: [
      download("enterprise-deploy-aws", "Dockerfile", "Dockerfile multi-stage endurecido (non-root, slim, cache otimizado) para APIs e Agentes Python."),
      download("enterprise-deploy-aws", "docker-compose.yml", "Orquestração completa de produção: API FastAPI, Worker RabbitMQ, PostgreSQL pgvector, Redis e Observabilidade."),
      download("enterprise-deploy-aws", "github_actions_ci.yml", "Pipeline GitHub Actions completa: Ruff/Flake8, Bandit Security Scan, Pytest, AI Eval Gate e Push para Amazon ECR / Deploy ECS."),
      download("enterprise-deploy-aws", "aws_infra_setup.sh", "Scripts e definições de infraestrutura AWS (ECR, ECS Fargate Task Definition, IAM Least-Privilege Role, S3, CloudWatch Alarms e WAF Rate Limit)."),
      download("enterprise-deploy-aws", "dicionario.json", "Guia de arquitetura Cloud-Native, manifesto Kubernetes (Deployment/Service/ConfigMap) e checklist de Go-Live FDE.")
    ],
    steps: [
      { title: "1. Containerização Hardened & Kubernetes", items: ["Construir Dockerfile multi-stage com usuário não-root, healthcheck nativo e redução drástica de superfície de ataque.", "Orquestrar todos os microsserviços (API, Worker, Postgres pgvector, Redis, RabbitMQ) no Docker Compose com redes isoladas e volumes.", "Escrever manifestos declarativos Kubernetes (Deployment, Service, ConfigMap, Secret e HorizontalPodAutoscaler)."] },
      { title: "2. Pipeline CI/CD Estendida para IA (GitHub Actions)", items: ["Configurar workflow no GitHub Actions com separação de ambientes (dev / staging / prod) e proteção de GitHub Secrets.", "Automatizar etapas de qualidade e DevSecOps: formatação/linting, auditoria de vulnerabilidades (Bandit/Safety) e testes unitários/integração (Pytest).", "Implementar o AI Eval Quality Gate na pipeline: o deploy é automaticamente abortado se a nota de Groundedness ou Segurança cair abaixo do corte."] },
      { title: "3. Arquitetura e Deploy na AWS (ECR + ECS Fargate + S3 + IAM)", items: ["Publicar imagens Docker verificadas no Amazon ECR e configurar Task Definitions serverless no Amazon ECS com AWS Fargate.", "Aplicar políticas IAM de privilégio mínimo (Least Privilege), VPC com subnets privadas, Application Load Balancer (ALB) com HTTPS e proteção AWS WAF (Rate Limit & Bot Control).", "Configurar variáveis sensíveis com segurança e buckets Amazon S3 para documentos e artefatos."] },
      { title: "4. Observabilidade CloudWatch, FinOps & Handoff FDE", items: ["Configurar grupos de logs estruturados, filtros de métricas e alarmes operacionais no Amazon CloudWatch.", "Criar alarme de Billing/FinOps para controle rigoroso de gastos de nuvem e inferência.", "Consolidar a documentação final de Handoff FDE (arquitetura, runbook de incidentes, rollback e apresentação executiva em português e inglês)."] }
    ],
    deliverables: ["Dockerfile Multi-Stage + Docker Compose + Manifestos K8s", "Pipeline CI/CD GitHub Actions com AI Eval Gate", "Arquitetura e Task Definitions AWS ECS Fargate", "Runbook de Operação, FinOps e Rollback", "Portfólio Capstone FDE Completo (PT-BR & EN)"],
    acceptance: ["Subida completa do ecossistema local com healthchecks verdes via um único comando docker compose up.", "Pipeline GitHub Actions executa lint, scan de segurança, Pytest, Eval Gate e build Docker sem erros.", "Containers rodam sem privilégio root e sem nenhuma credencial hardcoded na imagem.", "Runbook documenta procedimento completo de deploy, monitoramento no CloudWatch e rollback em menos de 5 minutos."],
    linkedin: ["CI/CD para Engenharia de IA: como bloquear deploys automaticamente quando um prompt ou agente perde qualidade", "Arquitetura Cloud-Native para Sistemas Agênticos na AWS (ECS Fargate, ECR, WAF, IAM e CloudWatch)", "Retrospectiva dos 6 grandes sistemas de produção construídos para o perfil Forward Deployed Engineer (FDE)", "Portfólio completo disponível no GitHub"]
  }
];

export const getStudyProject = (slug: string) => studyProjects.find((project) => project.slug === slug);
