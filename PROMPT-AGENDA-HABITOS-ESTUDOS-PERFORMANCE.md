# Prompt de implementação — Agenda, Hábitos e Estudos do Performance

Você é um agente de engenharia de software trabalhando diretamente no repositório RankFTV. Implemente de ponta a ponta as melhorias descritas neste documento na área pessoal:

```text
/admin/performance
```

Não entregue apenas análise, plano, mockup ou trechos soltos. Faça a implementação funcional completa, integrada ao Supabase e ao comportamento atual, com migrações aditivas, regras de domínio centralizadas, segurança, testes, documentação e validação visual.

## Objetivo

Entregar quatro resultados coerentes entre si:

1. A Agenda deve permitir eventos recorrentes com os presets comuns de calendário e uma opção realmente personalizável.
2. Hábitos devem poder ocorrer apenas em dias escolhidos, sem punir o usuário nos dias em que o hábito não foi planejado.
3. As listas com ícone de check nas aulas de Estudos devem virar checkboxes reais e persistentes. Uma aula só fica concluída quando todos os checks obrigatórios estiverem marcados e todas as perguntas tiverem sido respondidas; a quantidade de acertos não pode impedir a conclusão.
4. Todo card/aula deve informar exatamente em qual pasta da estrutura automática os seus arquivos ou evidências devem ser salvos. Cards rotulados como “Videoaula” não podem prometer um vídeo inexistente.

## Regras de execução

1. Antes de escrever código:
   - leia integralmente o `AGENTS.md`;
   - verifique `git status` e preserve todas as alterações existentes do usuário;
   - inspecione os arquivos citados neste prompt;
   - escreva um plano curto e mantenha o trabalho restrito ao módulo Performance;
   - leia a documentação local do Next.js 16 relevante, pois esta versão possui APIs e convenções incompatíveis com versões anteriores.

2. Leia no mínimo:
   - `node_modules/next/dist/docs/01-app/02-guides/forms.md`;
   - `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`;
   - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`;
   - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`;
   - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`;
   - `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`.

3. O projeto usa Next.js 16.3.0, React 19.2.4, TypeScript, Tailwind CSS 4, Supabase, Zod, `node:test` e Playwright. Não assuma comportamento do Next.js com base em versões antigas.

4. Toda Server Action é uma superfície pública:
   - autentique e autorize novamente dentro de cada action;
   - mantenha a restrição do módulo ao proprietário por `isPerformanceOwner`/`requireCeo` ou proteção equivalente;
   - nunca aceite `user_id` do navegador;
   - valide todo `FormData` e todo objeto recebido;
   - em updates/deletes, filtre sempre por `id` e `user_id`;
   - não envie segredos nem respostas corretas de avaliações para o cliente antes da submissão.

5. Não faça deploy, não aplique migração em banco remoto e não altere dados de produção sem autorização explícita. Crie as migrações no repositório. Se não houver banco local seguro, documente a aplicação manual.

6. Migrações devem ser aditivas, idempotentes e preservar os dados existentes. Não reescreva migrations históricas para fingir que a estrutura sempre existiu.

7. Use português brasileiro correto e UTF-8. Não introduza textos sem acentos ou mojibake.

8. Não refatore áreas não relacionadas, não adicione billing, não abra o módulo para outros usuários e não misture Performance com campeonato, arena, atleta ou público do RankFTV.

9. Não instale uma nova biblioteca de calendário ou design sem demonstrar necessidade. Prefira funções puras e os recursos já instalados.

10. A imagem do Google Agenda enviada pelo usuário é referência de comportamento do seletor de repetição. Ela não é uma solicitação para clonar todo o Google Agenda nem para criar as abas “Evento”, “Tarefa” e “Agendamento de horários”.

## Contexto atual obrigatório

Leia e considere, no mínimo:

- `app/admin/performance/page.tsx`;
- `app/admin/performance/actions.ts`;
- `app/admin/performance/life-os-actions.ts`;
- `app/admin/performance/calendario/page.tsx`;
- `components/performance/LifeOSDashboard.tsx`;
- `components/performance/CalendarClient.tsx`;
- `components/performance/MetasDoDia.tsx`;
- `components/performance/HabitAnalytics.tsx`;
- `components/performance/StudiesWorkspace.tsx`;
- `components/performance/StudyOrganizationGuide.tsx`;
- `components/performance/RoadmapAiWizard.tsx`;
- `lib/performance.ts`;
- `lib/performance-life-os.ts`;
- `lib/performance-dashboard.ts`;
- `lib/performance-analytics.ts`;
- `lib/performance-widgets.ts`;
- `lib/daily-life-analysis.ts`;
- `lib/daily-life-analysis-service.ts`;
- `lib/study-assessment.ts`;
- `lib/study-organization.ts`;
- `lib/study-roadmap-ai.ts`;
- `supabase/performance-life-os.sql`;
- `supabase/performance-dashboard.sql`;
- `supabase/performance-widgets.sql`;
- `supabase/performance-study-modules.sql`;
- `supabase/performance-study-question-types.sql`;
- `supabase/performance-study-reference-standard.sql`;
- `PERFORMANCE.md`.

Estado atual relevante:

- `app/admin/performance/page.tsx` é um Server Component que carrega os dados e os entrega ao `LifeOSDashboard`.
- Agenda, Hábitos e Estudos são views do mesmo painel.
- Existem dois formulários diferentes de evento: o modal de `CalendarClient` e o formulário rápido/timeline em `LifeOSDashboard`. Não deixe os dois com comportamentos divergentes.
- `perf_event` já possui `all_day`, `recurrence_rule jsonb` e `recurrence_group_id`, mas a aplicação descarta e não usa a recorrência.
- `perf_habit` já possui `frequency_type`, `weekdays`, `start_date` e `end_date`, mas o tipo, o mapeamento, os formulários e várias métricas ignoram esses campos.
- `preparation_steps` e `completion_checklist` guardam apenas o conteúdo das listas. Os checks atuais são ícones decorativos sem estado.
- As tentativas de avaliação já guardam respostas e nota em `perf_study_assessment_attempt`.
- A conclusão de uma avaliação usa hoje `score >= 70`, o que precisa mudar.
- A organização de estudos já cria uma pasta raiz determinística e uma subpasta por módulo para Windows, Mac/Linux, Chromebook e celular.
- O roadmap de inglês visto na interface é dado persistido no Supabase, não um seed ou conteúdo hardcoded encontrado no repositório.

## 1. Agenda — repetição de eventos

### Experiência obrigatória

Em todos os pontos de criação e edição de evento, adicione um seletor “Repetição” com os presets abaixo. Os rótulos devem ser calculados a partir da data inicial do evento:

1. `Não se repete`;
2. `Todos os dias`;
3. `Semanal: toda <dia da semana>`;
4. `Mensal no(a) <ordinal> <dia da semana>`;
5. `Anual em <mês> <dia>`;
6. `Todos os dias da semana (segunda a sexta-feira)`;
7. `Personalizar…`.

Exemplos para segunda-feira, 10 de agosto:

- `Semanal: toda segunda-feira`;
- `Mensal no(a) segundo(a) segunda-feira`;
- `Anual em 10 de agosto`.

O fluxo “Personalizar…” deve permitir:

- repetir a cada `N` dias, semanas, meses ou anos;
- escolher um ou mais dias da semana para repetição semanal;
- para repetição mensal, escolher entre dia do mês e posição do dia da semana, quando aplicável;
- terminar:
  - nunca;
  - em uma data;
  - após `N` ocorrências;
- revisar um resumo humano da regra antes de salvar.

Também torne funcional o campo `Dia inteiro`:

- ao marcar, esconda/desabilite horários;
- persista `all_day`;
- use intervalo de datas coerente e fim exclusivo no armazenamento, se essa for a estratégia adotada;
- mostre `Dia inteiro` nos cards, nunca `00:00 - 00:00`.

Preserve os demais campos atuais: título, data inicial/final, horários, descrição, local e link quando já suportados.

### Formulário compartilhado

Extraia ou componha campos compartilhados de evento para que o comportamento seja idêntico em:

- `/admin/performance?view=agenda`;
- `/admin/performance/calendario`;
- criação rápida no Dashboard;
- edição pela timeline.

Não mantenha duas implementações independentes da regra de recorrência.

### Modelo da regra

Use `perf_event.recurrence_rule` como a definição canônica da série. Não crie centenas de linhas futuras e nunca tente materializar uma série infinita.

Defina um contrato versionado, serializável e validado no servidor, equivalente a:

```ts
type EventRecurrenceRuleV1 = {
  version: 1;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byWeekdays?: number[];
  monthlyMode?: "day_of_month" | "nth_weekday";
  monthDay?: number;
  weekdayOrdinal?: 1 | 2 | 3 | 4 | 5 | -1;
  end:
    | { type: "never" }
    | { type: "until"; date: string }
    | { type: "count"; count: number };
  timezone: "America/Bahia";
};
```

O formato pode ser refinado após a inspeção, mas deve permanecer:

- explícito e versionado;
- validado por uma única fonte de verdade;
- compatível com eventos antigos, cujo `recurrence_rule` é `null`;
- seguro contra intervalos, contagens e arrays abusivos;
- documentado e testado.

Use a convenção de dia da semana já presente no projeto: `0 = domingo`, `1 = segunda`, ..., `6 = sábado`.

Defina a semântica sem ambiguidades:

- `startAt` é a âncora civil da série e fornece os valores padrão de dia do mês, ordinal, dia da semana, mês e horário; grave na regra qualquer valor que o modo personalizado permitir alterar;
- `weekdayOrdinal = -1` significa o último dia da semana correspondente no mês;
- `until` é inclusivo;
- `count` inclui a primeira ocorrência;
- uma recorrência mensal por dia `29`, `30` ou `31` pula os meses que não possuem essa data, em vez de deslocar silenciosamente para outro dia;
- uma recorrência pelo quinto dia da semana pula o mês em que o quinto dia não existe;
- uma recorrência anual em 29 de fevereiro ocorre apenas em anos bissextos;
- use a mesma política na engine, nos resumos e nos testes.

Estenda `LifeEvent`/`CalendarEvent` e os mapeamentos de dados para transportar a regra e o identificador da série. Faça isso nos dois carregamentos atuais:

- `app/admin/performance/page.tsx`;
- `app/admin/performance/calendario/page.tsx`.

Persistir `recurrence_rule` sem fazê-la chegar novamente ao cliente após reload não atende ao requisito.

### Expansão de ocorrências

Crie uma engine pura, separada da UI, que expanda uma série apenas dentro da janela solicitada.

Requisitos:

- dia: apenas a data visível;
- semana: apenas os sete dias visíveis;
- mês: cubra toda a grade mostrada, inclusive dias adjacentes renderizados;
- ano: apenas o ano visível;
- dashboard/timeline: apenas a faixa necessária para aquela tela;
- aplicar um limite defensivo de ocorrências por expansão;
- dimensionar esse limite para cobrir integralmente uma série diária legítima na visão anual; se dados inválidos excederem o limite, retorne um erro/estado explícito em vez de truncar silenciosamente o calendário;
- não gerar duplicatas;
- usar identificador estável de ocorrência, por exemplo `seriesId + data/hora da ocorrência`;
- preservar a duração e o horário civil em `America/Bahia`;
- não usar `startAt.slice(0, 10)` como conversão de data civil;
- eventos de vários dias devem aparecer em todos os dias com os quais o intervalo se cruza;
- respeitar término por data e por quantidade;
- tratar corretamente meses de 28, 29, 30 e 31 dias, anos bissextos e ocorrências mensais por ordinal.

Agenda, timeline, cards de hoje e qualquer leitura que conta próximos eventos devem consumir ocorrências expandidas, não apenas o evento-base.

### Criar, editar e excluir

As Server Actions de evento devem:

- validar a regra completa novamente;
- persistir `recurrence_rule`, `all_day` e os campos atuais;
- limpar a regra ao selecionar `Não se repete`;
- revalidar `/admin/performance` e `/admin/performance/calendario`;
- manter soft-delete quando apropriado;
- preservar eventos antigos.

Edição/exclusão de apenas uma ocorrência não é obrigatória nesta entrega. Se não implementar exceções, seja totalmente explícito:

- use os textos `Editar série` e `Excluir série`;
- confirme que todas as ocorrências são afetadas;
- não apresente uma ação como se alterasse apenas o card selecionado.

Não confunda recorrência de `perf_event` com `perf_task`, que é uma entidade separada.

## 2. Hábitos — dias personalizados

### Tipo e persistência

Normalize o tipo de domínio em camelCase, sem espalhar nomes de coluna do banco pela UI. Use um contrato equivalente a:

```ts
type HabitFrequency =
  | "daily"
  | "weekdays"
  | "weekends"
  | "custom_weekdays";

type Habit = {
  // campos atuais
  frequencyType: HabitFrequency;
  weekdays: number[];
  startDate: string | null;
  endDate: string | null;
};
```

Mapeie explicitamente:

- `frequency_type` para `frequencyType`;
- `weekdays` para `weekdays`;
- `start_date` para `startDate`;
- `end_date` para `endDate`.

Atualize criação e edição para persistirem esses campos. Não apague logs antigos ao mudar a programação.

### Histórico de programação

Uma alteração de dias não pode reinterpretar retroativamente o histórico do hábito. Implemente vigência/versionamento da programação, por exemplo em uma tabela `perf_habit_schedule_period` ou estrutura equivalente:

- cada período pertence a `user_id` e `habit_id`;
- guarda frequência, dias da semana, `effective_from` e `effective_to`;
- períodos do mesmo hábito não podem se sobrepor;
- editar a programação passa a valer a partir de hoje por padrão: encerra o período anterior em ontem e cria o novo período hoje;
- arquivar encerra a vigência sem apagar períodos ou logs;
- reativar cria um novo período, sem reabrir silenciosamente o antigo;
- analytics históricos usam a programação vigente em cada data;
- faça backfill da configuração atual de cada hábito usando seu `start_date`/data de criação como início;
- os campos atuais de `perf_habit` podem continuar como fotografia da configuração vigente para compatibilidade, mas documente qual fonte é canônica para o histórico.

Se houver uma escolha de data efetiva no formulário, ela não pode sobrepor períodos existentes nem alterar logs. Não é aceitável recalcular silenciosamente meses anteriores com a programação nova.

### Formulário

Nos dois fluxos existentes de gerenciamento de hábitos, ofereça:

1. `Todos os dias`;
2. `Segunda a sexta`;
3. `Fins de semana`;
4. `Dias personalizados`.

Ao escolher `Dias personalizados`:

- mostre botões/checkboxes `Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb`, `Dom`;
- exija pelo menos um dia;
- deduplique e ordene os valores;
- valide no servidor apenas inteiros de `0` a `6`;
- mostre um resumo legível, por exemplo `Ter e Qui` ou `Seg, Qua e Sex`.

Extraia um formulário compartilhado para `MetasDoDia` e `HabitManagerModal`, ou componha os mesmos campos e validações a partir de uma única fonte. O gerenciador deve listar todos os hábitos para permitir edição e arquivamento.

### Regra de elegibilidade

Um hábito só existe como compromisso nas datas em que foi programado.

Exemplo obrigatório:

> Um hábito “Futevôlei” configurado para terça e quinta deve aparecer em “Hábitos de hoje” e entrar nos percentuais apenas às terças e quintas.

Dias não programados são neutros. Eles não podem aparecer como atraso, pendência, zero ou falha e não podem reduzir:

- o progresso do dia;
- a taxa dos últimos 30 dias;
- a constância mensal;
- heatmaps;
- streak/sequência;
- gráficos semanais, mensais ou anuais;
- consistência geral;
- análise diária ou insights.

Use uma função de agendamento centralizada. Não mantenha versões divergentes em `performance-life-os.ts`, `performance-analytics.ts`, `performance-dashboard.ts`, `daily-life-analysis.ts` e componentes.

Revise todos os consumidores, incluindo:

- `MetasDoDia`;
- `HabitPanel` no Dashboard;
- `dayProgress`;
- `habitMonthStats`;
- `HabitAnalytics`;
- calendário/heatmap de constância;
- `habitCurrentStreak`;
- `habitChartData`;
- `consistencyStatus`;
- análise diária.

Regras adicionais:

- `startDate` e `endDate` são inclusivos;
- fora da vigência, o hábito é neutro;
- a sequência de um hábito personalizado representa ocorrências planejadas consecutivas concluídas, não dias civis consecutivos;
- não mostre o sufixo enganoso `d` para uma sequência baseada em ocorrências;
- em um dia sem hábitos programados, mostre `Nenhum hábito programado para hoje`, sem confundir isso com ausência total de hábitos;
- o calendário histórico não deve permitir registrar como pendente/concluído um dia no qual o hábito não estava programado.

## 3. Estudos — checkboxes e conclusão real

### Quais listas viram checkboxes

Transforme em checkboxes reais, interativos e persistentes todos os blocos que hoje são apresentados visualmente com um check, no mínimo:

- `Preparação` (`preparation_steps`);
- `Critérios objetivos` (`completion_checklist`).

Não considere o ícone atual como progresso. O estado inicial de uma etapa nova é desmarcado.

Os blocos numerados de passo a passo e prática continuam numerados, salvo se houver outra indicação explícita nos dados. Não transforme toda frase da aula em checkbox indiscriminadamente.

### Persistência do progresso

Crie uma migration aditiva e idempotente para persistir o progresso por:

- `user_id`;
- `item_id`;
- grupo do check (`preparation` ou `completion`);
- chave/índice estável do item;
- estado marcado/desmarcado;
- timestamps relevantes.

Uma tabela normalizada como `perf_study_check_progress` é recomendada. Uma solução equivalente é aceitável se:

- não misturar o texto autoritativo da aula com o estado do usuário;
- possuir FK com `ON DELETE CASCADE` para a etapa;
- impedir duplicatas;
- usar RLS por `user_id`;
- possuir índices, grants e `NOTIFY pgrst` seguindo as migrations atuais;
- continuar correta se uma lista for reordenada ou editada. Use chave estável ou hash do conteúdo, não confie cegamente apenas no índice.

Ao alternar um check, a Server Action deve:

1. autorizar o proprietário;
2. buscar a etapa pertencente ao usuário;
3. ler a lista autoritativa do banco;
4. validar grupo, chave/índice e conteúdo;
5. fazer upsert/delete seguro do progresso;
6. recalcular a elegibilidade da aula no servidor;
7. atualizar `status` e `completed_at` de forma coerente;
8. revalidar a página.

Os passos de persistência e sincronização de status devem ocorrer em uma única transação, preferencialmente por função SQL/RPC. O mesmo vale para inserir uma tentativa de avaliação e recalcular `status/completed_at`. Não aceite duas mutations independentes que possam deixar check/tentativa salvos com status antigo após uma falha intermediária.

Use estado pendente/otimista com rollback ou feedback claro em caso de erro. Uma falha não pode deixar a UI marcada apenas localmente.

### Única regra de conclusão

Centralize a política em uma função pura e reutilize-a no servidor e na apresentação.

Para uma etapa com gates, a conclusão deve ser:

```text
todos_os_checks_obrigatorios_marcados
E
(não_existem_perguntas OU todas_as_perguntas_atuais_foram_enviadas)
```

Regras obrigatórias:

- `100%` dos checks aplicáveis precisam estar marcados;
- se houver perguntas, deve existir ao menos uma tentativa válida que contenha resposta para todas as perguntas atuais;
- resposta certa ou errada conta como respondida;
- nota, quantidade de acertos e limite de 70% não participam da elegibilidade;
- a nota e a correção continuam visíveis como feedback de aprendizado;
- uma resposta errada deve mostrar explicação/correção, mas não bloquear a conclusão;
- desmarcar um check de uma etapa concluída deve retornar a etapa a `in_progress` e limpar `completed_at`;
- adicionar uma pergunta nova ou um check novo deve tornar a etapa incompleta até o novo requisito ser cumprido;
- a regra deve ser garantida no servidor. Desabilitar botão no cliente não é segurança.

Exemplo obrigatório de teste:

> Todos os checks marcados + todas as perguntas respondidas incorretamente = aula concluída, com nota e correções exibidas.

### Botão e progresso da aula

- Remova o bypass que hoje permite chamar `atualizarStatusEstudoLifeOS(..., "completed")` sem validar requisitos.
- Para etapas com checks ou perguntas, o status deve ser derivado automaticamente.
- Mostre progresso como `X de Y requisitos` e, quando houver avaliação, `Perguntas respondidas` ou `Perguntas pendentes`.
- O botão/cabeçalho só pode dizer `Concluída` quando a regra do servidor estiver satisfeita.
- Para etapa legada/manual sem nenhum check e sem nenhuma pergunta, preserve um botão manual `Concluir` como fallback.

### Tentativas e “Tentar novamente”

Enviar avaliação já exige todas as respostas; preserve essa validação.

Altere a semântica de tentativa:

- uma submissão completa pode concluir a parte de perguntas mesmo com nota baixa;
- remova ou renomeie o estado interno `passed` hoje derivado de `score >= 70`, para não existir a contradição “aula concluída, passed = false”;
- se a faixa de 70% continuar aparecendo como indicador de domínio, trate-a somente como feedback de desempenho com outro nome, nunca como conclusão ou status da aula;
- `Tentar novamente` deve iniciar uma nova tentativa opcional;
- não apague automaticamente todo o histórico de tentativas;
- não revogue uma conclusão apenas porque o usuário decidiu tentar melhorar a nota;
- continue guardando e exibindo feedback por tentativa.

Atualize `PERFORMANCE.md`, pois ele hoje documenta que as respostas são removidas ao tentar novamente.

### Compatibilidade com etapas já concluídas

Não destrua progresso histórico durante a migração.

Defina e teste um backfill explícito. Comportamento recomendado:

- etapas já concluídas recebem os checks atuais como concluídos no backfill;
- tentativas existentes são preservadas;
- etapas concluídas manualmente antes da migration e sem tentativa permanecem concluídas, mas recebem um marcador explícito de conclusão legada;
- o marcador legado não é um bypass permanente: se a etapa for reaberta ou receber qualquer check/pergunta nova, ele é invalidado e a regra atual passa a valer;
- nunca apague tentativas ou logs para “corrigir” o estado.

Implemente essa política de forma determinística e documente onde o marcador legado é persistido. Não deixe a decisão para comportamento implícito do componente.

## 4. Roadmap de inglês — cards “Videoaula” sem link

O comportamento atual permite `itemKind = "video"` com `resourceUrl = null`, por isso a tag “Videoaula” aparece sem botão. Isso é permitido de propósito pelo código atual, mas não é um estado final aceitável para a nova experiência.

### Regra obrigatória

Um card rotulado como `Videoaula` deve possuir:

- URL `https` direta e válida;
- título do recurso;
- CTA clicável e acessível;
- fonte/canal quando disponível.

Nunca invente uma URL.

Para roadmaps novos, a confirmação/ativação deve ser bloqueada enquanto existir um card rotulado `Videoaula` sem URL válida. A única exceção visual é dado legado ainda não reparado: ele pode manter temporariamente o rótulo original para diagnóstico, mas deve aparecer com alerta explícito de recurso ausente e sem fingir que existe um CTA. Esse estado transitório não conta como card corrigido nem como aceite da entrega.

“Bloquear confirmação” significa bloquear a aceitação do rascunho novo na prévia, não bloquear a abertura ou conclusão de todo roadmap antigo já persistido. Para o legado, derive o alerta de `itemKind = "video"` com `resourceUrl` nula/vazia; não crie uma nova coluna de estado apenas para representar essa combinação.

Se não houver um vídeo confiável:

- não silencie a ausência;
- reclassifique a etapa para um tipo honesto que possa ser executado sem vídeo, como `Prática` ou `Leitura`, quando o conteúdo permitir;
- se o conteúdo realmente depender do vídeo, marque a etapa como pendente de recurso e impeça a confirmação silenciosa do roadmap;
- na visualização de dados legados quebrados, mostre um alerta explícito `Videoaula sem link cadastrado` até a correção, em vez de uma tag enganosa sem ação.

Nos roadmaps de idioma, não trate todo conteúdo audiovisual como Videoaula. Filme, série, música, gravação própria, shadowing e ditado podem ser atividades válidas sem uma videoaula externa. Nesses casos:

- use um tipo/rótulo honesto, como `Atividade audiovisual`, `Shadowing` ou `Ditado`, conforme o exercício;
- informe exatamente onde obter ou produzir o áudio/vídeo;
- não force a classificação `Prática` ou `Leitura` se ela perder o significado didático;
- reserve o rótulo `Videoaula` para uma aula externa com recurso clicável.

### Geração e importação futuras

Revise `lib/study-roadmap-ai.ts`, o schema gerado, a normalização, a prévia no `RoadmapAiWizard` e a persistência para garantir:

- `video` com URL válida mantém a tag e o link;
- URL inválida ou URL de página de busca não é aceita;
- uma etapa sem recurso não é persistida silenciosamente como Videoaula;
- fontes oficiais diretas relevantes podem ser aceitas com validação segura, não apenas YouTube. Isso é importante para materiais como British Council;
- a instrução da IA continua proibindo links inventados;
- quando nenhuma fonte confiável for encontrada, a IA deve mudar o tipo da etapa ou sinalizar a pendência de forma explícita.

Não faça chamadas de rede de disponibilidade a cada renderização da página.

### Roadmap de inglês já salvo

Audite, em ambiente autorizado, os itens do roadmap de inglês com:

```text
item_kind = 'video'
e resource_url nulo ou vazio
```

Para cada item:

- associe um recurso público, direto e confiável realmente correspondente ao conteúdo; ou
- reclassifique a etapa de forma honesta; ou
- deixe-a explicitamente marcada como pendente de recurso.

Como esses registros estão no Supabase e não no repositório, não alegue que os cards atuais foram corrigidos se o banco não pôde ser inspecionado. Nesse caso, entregue uma consulta/rotina administrativa segura para auditoria e documente o passo manual restante. Não altere banco remoto sem autorização.

## 5. Estudos — informar a pasta de cada aula

O comando atual cria:

```text
Estudos/
  <pasta raiz estável do roadmap>/
    01 - <módulo>
    02 - <módulo>
    ...
```

Ele não cria uma pasta por dia. Portanto, nesta entrega, interprete “cada dia de estudo” como cada card/aula/etapa do roadmap. Não introduza datas fixas ou uma nova agenda de aulas sem necessidade.

### Destino por card

Dentro de cada `StudyStep`, exiba um bloco persistente:

```text
Salvar arquivos/evidências desta aula em:
<caminho completo da subpasta do módulo>
```

Exemplos:

```text
%USERPROFILE%\Estudos\Ingles - <sufixo>\02 - Conversacao basica
$HOME/Estudos/Ingles - <sufixo>/02 - Conversacao basica
Arquivos/Estudos/Ingles - <sufixo>/02 - Conversacao basica
```

Inclua botão `Copiar caminho` com feedback acessível.

### Uma única fonte de verdade

- Derive o caminho da mesma `createStudyOrganizationPlan` usada pelo comando automático.
- Não duplique sanitização, sufixo, numeração ou regra de separador dentro do componente.
- Crie um helper puro para obter o destino de um módulo/etapa a partir do plano.
- A pasta exibida deve coincidir literalmente com uma pasta criada pelo comando/lista.
- O caminho deve permanecer estável após refresh.
- Mapeie cada etapa por `moduleId` e ordem do módulo.
- Para módulos legados agrupados por `section`, use o mesmo grupo criado por `buildModuleViews`.
- Para uma etapa sem módulo identificável, use a pasta raiz e explique o fallback; não invente uma subpasta inexistente.

Hoje a escolha de dispositivo vive apenas dentro do `StudyOrganizationGuide`. Eleve o estado do dispositivo/plano para `StudiesWorkspace` ou use um contexto compartilhado equivalente:

- o guia e todos os cards devem consumir o mesmo plano;
- ao trocar Windows por celular, Mac, Linux ou Chromebook, todos os caminhos devem atualizar juntos;
- o comando copiado e os destinos exibidos nunca podem divergir.

Persista a escolha do dispositivo por roadmap, em estado local durável ou preferência segura equivalente, para que reload e um novo dia de estudo mantenham o mesmo comando e os mesmos caminhos. Valide a preferência salva contra os dispositivos ainda disponíveis e aplique o fallback recomendado quando ela deixar de ser válida.

Não faça o navegador prometer que moveu arquivos. O site apenas informa e copia o destino; o comando existente só cria as pastas.

## 6. Banco de dados e migrações

Crie uma ou mais migrations novas, aditivas e idempotentes, sem alterar o histórico das migrations existentes.

Elas devem contemplar, conforme necessário:

- tabela de progresso dos checks de estudo;
- RLS owner-only por `user_id`;
- FKs com cascade;
- índices e unicidade;
- grants para `authenticated`;
- `NOTIFY pgrst, 'reload schema'`;
- constraints para `perf_habit.frequency_type` nos quatro valores suportados;
- validação de `weekdays` apenas com inteiros `0..6`;
- `custom_weekdays` não vazio;
- `end_date >= start_date` quando ambas existirem;
- períodos versionados da programação de hábitos, sem sobreposição e com backfill da configuração atual;
- validação estrutural mínima de `perf_event.recurrence_rule` como objeto versionado, mantendo a validação detalhada também no servidor;
- backfill seguro para registros atuais.

Não remova colunas, eventos, hábitos, roadmaps, tentativas ou logs existentes.

Adicione o novo arquivo à ordem de instalação em `PERFORMANCE.md` e explique que a aplicação da migration é manual em ambiente autorizado.

O carregamento em `app/admin/performance/page.tsx` deve distinguir:

- recurso vazio porque o usuário ainda não tem dados;
- migration nova ainda não aplicada;
- erro real de consulta.

Uma migration ausente não pode derrubar toda a página.

## 7. Arquitetura sugerida

Ajuste após a inspeção, mas mantenha responsabilidades pequenas e regras puras. Estrutura possível:

```text
components/performance/events/
  EventForm.tsx
  EventRecurrenceFields.tsx
  CustomRecurrenceDialog.tsx

components/performance/habits/
  HabitForm.tsx
  HabitScheduleFields.tsx

components/performance/studies/
  StudyChecklist.tsx
  StudyDestinationPath.tsx

lib/event-recurrence.ts
lib/event-recurrence.test.ts
lib/habit-schedule.ts
lib/habit-schedule.test.ts
lib/study-progress.ts
lib/study-progress.test.ts
```

Não é obrigatório usar exatamente esses caminhos. É obrigatório:

- evitar regras de recorrência dentro do JSX;
- não duplicar formulários e validações;
- manter tipos serializáveis entre Server e Client Components;
- manter a política de conclusão testável fora do componente;
- não transformar `LifeOSDashboard.tsx` ou `StudiesWorkspace.tsx` em arquivos ainda mais monolíticos.

## 8. Segurança e consistência

- Reutilize a autorização do proprietário em todas as novas actions.
- A página `/admin/performance/calendario` deve usar a mesma regra forte de proprietário da rota principal, não apenas confiar no e-mail isoladamente.
- Nunca confie em regra de recorrência, dias da semana, índice de check, status de conclusão ou respostas vindas do cliente.
- Leia a etapa e seus requisitos atuais no servidor antes de aceitar progresso.
- Não permita marcar uma aula como concluída por chamada direta se faltarem requisitos.
- Não retorne gabarito antes da submissão.
- Não registre dados pessoais de Performance ou respostas de estudo em logs de aplicação.
- Limite tamanhos de strings, arrays, intervalos, contagens e faixas de expansão.
- Use função SQL/RPC transacional para impedir condições de corrida: toggle de check + recálculo de conclusão e inserção de tentativa + recálculo de conclusão devem ser atômicos.

## 9. Interface, acessibilidade e responsividade

Preserve o tema atual do Life OS:

- fundo principal `#0b0d10`;
- cards `#15191f`;
- campos `#0f1318` ou `#11151a`;
- bordas `white/10`;
- azul para ações;
- esmeralda para concluído;
- âmbar para atenção;
- vermelho para erro.

Requisitos:

- mobile desde 320 px sem overflow horizontal;
- alvos de toque de pelo menos 44 × 44 px nos novos seletores/checks;
- labels persistentes;
- foco visível;
- operação completa por teclado;
- checkboxes nativos ou semântica `role="checkbox"`/`aria-checked` correta;
- estado não comunicado apenas por cor;
- mensagens de erro com `role="alert"` quando apropriado;
- atualizações de cópia/salvamento em `aria-live="polite"`;
- dialogs com título acessível, Escape, contenção/gestão de foco e retorno ao gatilho;
- pending state real e prevenção de envio duplicado;
- erros de action preservam os dados digitados;
- respeitar `prefers-reduced-motion`.

## 10. Testes obrigatórios

Use `node:test` e `node:assert/strict` para as engines puras, seguindo o padrão atual.

### Agenda

Cubra:

- cada preset;
- resumo humano de cada regra;
- personalização diária, semanal, mensal e anual;
- múltiplos dias semanais;
- término nunca, por data e por quantidade;
- início e fim inclusivos quando aplicável;
- meses de 28, 29, 30 e 31 dias;
- ano bissexto;
- segundo/último dia da semana no mês;
- série iniciada antes da janela visível;
- expansão limitada à janela e ao limite defensivo;
- ausência de duplicatas;
- eventos de vários dias;
- horário perto da meia-noite em `America/Bahia`;
- dia inteiro;
- evento antigo com regra `null`.

### Hábitos

Cubra:

- todos os dias;
- segunda a sexta;
- fins de semana;
- dias personalizados;
- personalizado vazio rejeitado;
- dias inválidos e duplicados rejeitados/normalizados;
- vigência inicial/final inclusiva;
- futevôlei terça/quinta fora do denominador nos outros dias;
- dia não planejado não quebra sequência;
- percentual, mês, heatmap, gráfico e consistência usam apenas ocorrências elegíveis;
- dia sem hábito programado.

### Estudos

Cubra a política de conclusão:

1. checks incompletos + perguntas respondidas = não concluída;
2. todos os checks + pergunta faltando = não concluída;
3. todos os checks + todas as respostas erradas = concluída;
4. todos os checks + todas as respostas certas = concluída;
5. desmarcar depois de concluir = `in_progress`;
6. chamada direta para `completed` sem requisitos = rejeitada;
7. etapa sem gates mantém conclusão manual;
8. nova pergunta/check invalida a elegibilidade até ser cumprido;
9. retry cria nova tentativa e preserva a anterior;
10. backfill preserva etapas concluídas e tentativas.

### Vídeos e pastas

Cubra:

- Videoaula com URL válida mantém tag e CTA;
- URL inválida não vira Videoaula silenciosamente;
- Videoaula sem URL é reclassificada ou sinalizada;
- URL oficial direta permitida;
- URL de busca rejeitada;
- destino Windows por módulo;
- destino POSIX por módulo;
- destino de celular/Chromebook;
- troca de dispositivo atualiza guia e cards;
- trocar dispositivo, recarregar e continuar com o mesmo dispositivo/caminho;
- módulo legado;
- etapa sem módulo usa fallback explícito;
- caminho coincide com o comando/lista;
- nomes sanitizados e caminho estável.

Estenda os testes existentes quando fizer sentido:

- `lib/performance-life-os.test.ts`;
- `lib/performance-dashboard.test.ts`;
- `lib/performance-analytics.test.ts`;
- `lib/study-assessment.test.ts`;
- `lib/study-organization.test.ts`;
- `lib/study-roadmap-ai.test.ts`;
- `lib/performance-widgets.test.ts`.

Adicione E2E autenticado para os fluxos críticos se a infraestrutura e as credenciais descartáveis estiverem disponíveis:

- criar evento recorrente personalizado e vê-lo em outra ocorrência;
- criar hábito de terça/quinta e confirmar neutralidade em outro dia;
- marcar checks, responder tudo errado, recarregar e ver a aula concluída;
- desmarcar um check e ver a aula reabrir;
- conferir destino da pasta e copiar caminho;
- verificar o estado explícito de Videoaula sem link.

Não reduza autenticação/RLS para facilitar testes.

## 11. Critérios de aceitação

### Agenda

- [ ] Todos os presets solicitados aparecem com rótulo calculado pela data escolhida.
- [ ] “Personalizar…” permite intervalo, dias e término.
- [ ] A regra persiste após reload.
- [ ] Ocorrências aparecem corretamente em dia, semana, mês, ano, dashboard e timeline.
- [ ] Séries infinitas não são materializadas no banco.
- [ ] Eventos antigos continuam funcionando.
- [ ] Dia inteiro funciona de ponta a ponta.
- [ ] Se não há exceção individual, editar/excluir deixa claro que afeta a série.
- [ ] Todos os formulários de evento apresentam o mesmo comportamento.

### Hábitos

- [ ] Criar e editar hábito permite dias personalizados.
- [ ] A programação persiste após reload.
- [ ] Futevôlei em terça/quinta só aparece e conta nesses dias.
- [ ] Dias não planejados são neutros em todas as métricas.
- [ ] Sequência usa ocorrências programadas, não dias civis.
- [ ] Os dois gerenciadores usam a mesma regra/formulário.
- [ ] O histórico de logs é preservado.

### Estudos

- [ ] Checks de Preparação e Critérios são interativos, acessíveis e persistentes.
- [ ] Refresh não perde checks.
- [ ] Aula com check pendente não conclui.
- [ ] Aula com pergunta não respondida não conclui.
- [ ] Aula com tudo respondido conclui mesmo com 0% de acerto.
- [ ] Nota e correções continuam visíveis.
- [ ] Desmarcar um requisito reabre a aula.
- [ ] Não existe bypass pela Server Action.
- [ ] Retry preserva histórico.
- [ ] Progresso antigo não é destruído.

### Vídeos e pastas

- [ ] Todo card final de roadmap novo rotulado Videoaula possui link direto válido.
- [ ] Videoaula legada sem link aparece apenas como estado transitório alertado, nunca como item corrigido ou CTA funcional.
- [ ] Nenhuma URL é inventada.
- [ ] Geração futura não salva Videoaula sem recurso silenciosamente.
- [ ] O roadmap de inglês persistido é auditado quando houver ambiente autorizado.
- [ ] Cada card informa a pasta exata do seu módulo.
- [ ] O caminho é produzido pela mesma engine do comando automático.
- [ ] Trocar o dispositivo mantém comando e cards sincronizados.
- [ ] O botão de copiar caminho fornece feedback acessível.

### Segurança e qualidade

- [ ] Toda mutation autentica, autoriza e valida no servidor.
- [ ] RLS protege a nova tabela.
- [ ] Migração é aditiva e idempotente.
- [ ] Migration ausente não derruba todo o Performance.
- [ ] Nenhum segredo ou gabarito vaza para o cliente.
- [ ] Não há overflow horizontal entre 320 e 1440 px.
- [ ] Fluxos novos funcionam por teclado.
- [ ] Textos estão em português correto e UTF-8.

## 12. Documentação

Atualize `PERFORMANCE.md` com:

- semântica das recorrências de evento;
- frequências de hábitos e neutralidade dos dias não planejados;
- fonte de verdade do progresso de checklists;
- regra de conclusão independente da nota;
- nova semântica de `Tentar novamente`;
- contrato de Videoaula com recurso;
- mapeamento de cada aula para a pasta do módulo;
- nova migration e sua posição na ordem de instalação;
- confirmação de que migrations só são aplicadas manualmente em ambiente autorizado.

## 13. Verificação final

Execute e corrija os problemas relacionados à implementação:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Execute os E2E relevantes quando o ambiente estiver configurado:

```bash
npm run test:e2e
```

Faça validação manual, no mínimo, em:

- 320 px;
- 390 px;
- 768 px;
- 1024 px;
- 1440 px;
- teclado;
- reload após cada persistência;
- evento sem repetição e cada preset;
- hábito diário e terça/quinta;
- avaliação com respostas erradas;
- Videoaula com e sem link;
- Windows e ao menos um destino não Windows.

Se um comando falhar, diferencie claramente:

- regressão causada pela implementação;
- falha preexistente comprovada;
- verificação bloqueada por credencial, migration ou serviço externo.

Não declare sucesso com testes obrigatórios falhando.

## Entrega final esperada do agente

Ao terminar, responda objetivamente com:

1. resultado funcional entregue em Agenda, Hábitos e Estudos;
2. arquivos principais alterados;
3. migrations criadas e se foram ou não aplicadas;
4. formato adotado para recorrência;
5. regra final de conclusão das aulas;
6. resultado da auditoria de Videoaulas sem link, distinguindo código de dados remotos;
7. testes/comandos executados e resultados;
8. passos manuais restantes;
9. limitações reais.

Não encerre com apenas um plano ou mockup. A tarefa só está concluída quando UI, persistência, regras de domínio, segurança, testes e documentação estiverem coerentes entre si.
