# Performance

## Limite do projeto atual

Performance e um modulo pessoal de desenvolvimento e organizacao hospedado temporariamente dentro do repositorio e do dominio do RankFTV. Ele nao faz parte da plataforma Rank Futevolei e nao deve ser apresentado, vendido ou liberado para atletas, organizadores, arenas ou outros usuarios.

Estado atual:

- Rota principal: `/admin/performance`.
- Acesso exclusivo da conta identificada por `ADMIN_EMAIL` e confirmada com `profiles.role = 'ceo'`. O e-mail sozinho nunca ignora a autorização persistida; ao trocar o e-mail da conta, `ADMIN_EMAIL` também precisa ser atualizado.
- Dados associados ao `user_id` do proprietario e protegidos por RLS.
- Sem planos, assinatura, checkout, gateway ou webhook proprio.
- Sem limite comercial mensal de roadmaps.
- Limite tecnico atual de 3 geracoes de roadmap por dia para evitar chamadas acidentais em sequencia.
- Analise diaria automatica as 05:00 em `America/Bahia`, somente para o proprietario.
- O proprietario pode usar o botao manual de atualizar a analise.
- OpenAI e Supabase sao usados apenas no servidor; nenhuma chave pode chegar ao navegador.

As paginas `/admin/gastos` e `/admin/gasto-mensal` tambem sao pessoais, mas nao pertencem automaticamente ao futuro produto Performance. A decisao de leva-las para o novo projeto deve ser tomada na extracao.

## Areas atuais

- **Dashboard:** tarefas, eventos, habitos, widgets de academia, estudos, investimentos e leitura diaria com IA.
- **Agenda:** calendario completo e criacao, edicao e exclusao de eventos.
- **Habitos:** registro diario, progresso, historico, arquivamento e graficos de constancia.
- **Academia:** treinos, duracao, peso, meta e mapa dos grupos musculares.
- **Estudos:** roadmaps manuais, importados e gerados por IA, modulos, etapas, avaliacoes, Pomodoro e sessoes.
- **Investimentos / Carteira em Rota:** meta patrimonial principal, plano versionado, check-ins do valor total, aportes, retiradas, trajetória realizada e projeções por cenários.
- **Perfil:** nome, sobrenome, foto, e-mail, WhatsApp e nascimento.

Revisoes e Insights nao existem mais como abas separadas. A leitura inteligente fica no Dashboard.

## Visao diaria das 05:00

O job diario roda pelo cron `0 8 * * *`, equivalente a 05:00 em
`America/Bahia`. A analise fecha os dados ate ontem: registros do novo dia
servem apenas para sugerir a proxima acao e nunca reduzem a nota da manha.

A versao `daily-life-review-v4` le, com paginacao e ordem deterministica:

- compromissos e logs de habitos e tarefas, inclusive a vigencia historica de
  itens arquivados;
- treinos, duracao, tipo, titulo, grupos musculares, meta semanal e peso;
- roadmap, etapas, prazo, estimativas, sessoes, aprendizados e tentativas de
  avaliacao de estudos;
- eventos e metas;
- snapshots, aportes, retiradas, plano e todas as revisoes da Carteira em Rota.

Investimentos reutilizam a mesma engine da Carteira em Rota, com data de corte
em ontem. A leitura distingue saldo observado de saldo estimado por fluxos,
desconta aportes e retiradas ao decompor o resultado e nunca recomenda ativos.
Uma fonte com erro, schema ausente ou leitura parcial fica indisponivel e nao e
convertida em desempenho zero. Se a chamada da OpenAI falhar, a leitura local e
salva com o motivo do fallback para diagnostico no Dashboard.

## Carteira em Rota

A área de investimentos funciona como um GPS patrimonial pessoal. Ela compara o patrimônio observado nos check-ins, o ritmo real dos aportes e o plano vigente para explicar se a meta continua na rota e qual ação controlável merece atenção no mês.

Fontes canonicas:

- `perf_portfolio_snapshot`: valor total observado nos check-ins;
- `perf_investment_contribution`: aportes manuais ou preservados do controle financeiro;
- `perf_investment_withdrawal`: retiradas;
- `perf_investment_plan` e `perf_investment_plan_revision`: identidade do plano e histórico imutável das premissas.

O plano aceita valores reais ou nominais. No modo real, valor-alvo, aporte e taxas representam poder de compra da data-base informada. No modo nominal, os valores permanecem nominais. As linhas conservadora, base e favorável são cenários determinísticos configurados pelo proprietário; não representam probabilidade, garantia de retorno nem recomendação de investimento.

O CDI usado em `/admin/gastos` não é extrapolado automaticamente para o horizonte de longo prazo. A Carteira em Rota possui uma engine mensal independente, pura e testada. Resultado inferido entre dois check-ins é chamado de resultado residual da carteira, pois também pode incluir taxas, impostos, ativos não cadastrados ou ajustes no valor informado.

A primeira versão do plano nunca é reescrita. Alterações de alvo, prazo, aporte ou premissas criam revisões, permitindo reconstruir o plano aplicável a cada período e formar o diário de bordo.

Concluir e arquivar possuem contratos diferentes. O arquivamento é uma decisão voluntária. A conclusão é validada atomicamente no banco: usa o alvo da revisão vigente hoje, o check-in mais recente e os aportes e retiradas posteriores até hoje. No modo real, cada valor observado é convertido pela própria data para a data de referência do plano. Revisões futuras não podem antecipar a conclusão.

## Roadmaps com IA

O gerador deve produzir uma trilha pratica, realista e adequada a dois niveis diferentes:

1. conhecimento do usuario sobre o assunto estudado;
2. autonomia digital para instalar programas, abrir terminal, organizar arquivos e usar ferramentas.

Para iniciantes, cada etapa precisa dizer exatamente onde executar, qual ferramenta abrir, quais comandos usar, quais arquivos criar, o resultado esperado e como validar. Tempo estimado deve caber nos dias e minutos informados pelo usuario.

Uma geracao e persistida como rascunho antes de ser aceita. Ajustar a resposta nao pode apagar a versao anterior. Importacoes passam pela IA para normalizar o arquivo ao schema interno; o arquivo bruto nunca e renderizado diretamente.

Respostas de avaliacoes permanecem salvas depois da correcao. Elas so sao removidas quando o proprietario usa `Tentar novamente`.

## Pomodoro e sessoes

- O ciclo padrao pode ser alterado pelo proprietario.
- O cronometro continua depois da meta de ciclos, por exemplo `8 / 4`.
- Ao parar, a sessao pode ser salva ou descartada.
- O resumo separa foco, pausas rapidas, pausas longas e total.
- Antes de salvar, cada valor pode ser corrigido.
- Uma sessao pode apontar para um modulo inteiro, varios assuntos do roadmap ativo ou um nome livre.
- Sessoes manuais podem ser criadas, editadas e excluidas sem Pomodoro.

## Banco de dados atual

As tabelas do modulo usam principalmente o prefixo `perf_`. Para uma instalacao nova, revisar e aplicar em backup nesta ordem:

1. `supabase/add-performance.sql`
2. `supabase/performance-life-os.sql`
3. `supabase/performance-dashboard.sql`
4. `supabase/performance-widgets.sql`
5. `supabase/performance-roadmap-ai.sql`
6. `supabase/performance-study-modules.sql`
7. `supabase/performance-roadmap-drafts.sql`
8. `supabase/performance-study-question-types.sql`
9. `supabase/performance-daily-life-analysis.sql`
10. `supabase/performance-investment-route.sql`

As migrações são aplicadas manualmente somente em um ambiente autorizado e com backup. A aplicação não executa `performance-investment-route.sql` automaticamente.

`supabase/performance-product.sql` nao faz parte do projeto atual e nao deve ser aplicado.

Dependencias que precisam ser desacopladas antes da extracao:

- identidade em `auth.users`, `profiles` e `profiles_private`;
- foto no bucket `avatars`;
- investimentos lidos de `personal_finance_entries`;
- plano e revisões da Carteira em Rota em `perf_investment_plan` e `perf_investment_plan_revision`;
- configuracao global `ADMIN_EMAIL`;
- cron dentro do deploy do RankFTV;
- componentes, actions e bibliotecas dentro dos diretorios compartilhados do RankFTV.

## Variaveis atuais

- `ADMIN_EMAIL`
- `OPENAI_API_KEY`
- `OPENAI_ROADMAP_MODEL`
- `OPENAI_LIFE_OS_MODEL`
- `CRON_SECRET`
- variaveis privadas e publicas do Supabase usadas pelo projeto

## Extracao futura

Quando Performance virar um produto, criar primeiro uma infraestrutura independente:

1. novo repositorio e aplicacao;
2. novo dominio;
3. novo projeto Supabase e novos buckets;
4. nova chave OpenAI com budget e alertas exclusivos;
5. novo cron e observabilidade;
6. Auth, termos, privacidade e suporte proprios;
7. migracao seletiva das tabelas `perf_*` e dos arquivos do proprietario;
8. remocao das dependencias de `profiles`, `profiles_private` e `personal_finance_entries` do RankFTV;
9. testes de exportacao/importacao para comprovar que nenhum dado pessoal foi perdido;
10. somente depois disso, remover os arquivos do RankFTV.

## Hipotese de produto futuro

Estas regras sao apenas referencia de produto e nao devem ser implementadas no RankFTV:

- plano mensal sugerido: R$ 39,90;
- plano anual sugerido: R$ 358,80, exibido como 12x de R$ 29,90;
- mesmos recursos nos dois planos;
- ate 2 roadmaps com IA por mes por assinante;
- analise automatica diaria as 05:00;
- assinantes comuns sem botao de atualizacao manual;
- proprietario com acesso administrativo e ferramentas de suporte.

Antes de vender, o novo projeto precisara de multi-tenancy revisada, RLS por usuario, quotas atomicas, fila para IA, controle de custos, billing recorrente, webhook idempotente, cancelamento, inadimplencia, observabilidade, LGPD e E2E. Nenhuma dessas camadas deve ser antecipada dentro do RankFTV atual.

## Regra para proximas alteracoes

Ao trabalhar no Performance dentro deste repositorio:

- construir para o uso pessoal atual;
- manter os dados tecnicamente isolados por prefixo e modulos;
- documentar decisoes que facilitem a extracao;
- nao adicionar planos, checkout, assinatura ou acesso de outros usuarios;
- nao misturar regras de campeonato, atleta, plateia ou arena com regras do Performance;
- preservar compatibilidade com os dados pessoais existentes.
