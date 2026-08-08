# Prompt de implementação — Carteira em Rota

Você é um agente de engenharia de software trabalhando diretamente no repositório RankFTV. Implemente, de ponta a ponta, a nova experiência de investimentos descrita neste documento.

Não entregue apenas uma proposta, um protótipo estático ou uma explicação. Faça a implementação funcional, integrada aos dados atuais, com migração aditiva, regras financeiras centralizadas, testes e documentação.

## Missão

Transforme a página:

    /admin/performance?view=investments

em uma experiência chamada “Carteira em Rota”: um GPS patrimonial que conecta as atitudes financeiras atuais do proprietário a um destino futuro.

A página precisa responder rapidamente:

1. Onde estou hoje?
2. Mantendo meu ritmo real de aportes, onde posso chegar?
3. Estou no caminho do objetivo definido?
4. O que mudou desde o último check-in?
5. Qual atitude controlável tem maior impacto neste mês?
6. O que aconteceria se eu mudasse aporte, prazo, meta ou premissas?

A experiência não deve parecer Investidor10, agregador de ativos ou planilha. O centro do produto é a trajetória em direção a uma meta, não ticker, cotação, dividendo, notícia ou ranking.

## Resultado esperado

Ao final, a aba de investimentos deve oferecer:

- configuração de uma meta patrimonial principal;
- preservação do plano original e histórico de revisões;
- check-in do valor total atual da carteira;
- histórico real de snapshots;
- gráfico de trajetória com passado, plano, rota atual e faixa de cenários;
- status determinístico e explicado da rota;
- comparação “Mantendo seu ritmo” versus “Seguindo o plano”;
- ação concreta do mês, comparando aporte planejado e realizado;
- laboratório “E se?” inteiramente temporário até confirmação explícita;
- decomposição de aportes, retiradas e resultado residual da carteira;
- diário de bordo reunindo check-ins, aportes, retiradas e mudanças de plano;
- CRUD já existente de aportes preservado;
- fluxo visível de retiradas, incluindo edição e exclusão seguras se ainda não existirem;
- responsividade, acessibilidade, estados vazios, erros parciais e dados desatualizados;
- funções financeiras puras e bem testadas;
- documentação da nova migração e da semântica financeira.

## Regras de execução

1. Antes de escrever código:
   - leia integralmente o AGENTS.md do repositório;
   - inspecione os arquivos atuais citados neste prompt;
   - leia a documentação local relevante do Next.js 16 em node_modules/next/dist/docs;
   - verifique o git status e preserve qualquer alteração do usuário;
   - escreva um plano curto de implementação.

2. Este projeto usa Next.js 16.3.0 e possui mudanças incompatíveis com versões anteriores. Leia, no mínimo:
   - node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
   - node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md
   - node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
   - node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md
   - node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md

3. Não assuma APIs do Next.js com base em conhecimento antigo:
   - searchParams é assíncrono neste projeto;
   - props de Server Component para Client Component devem ser serializáveis;
   - Server Actions importadas por Client Components devem permanecer em módulo apropriado com “use server”;
   - toda Server Action é uma superfície pública e deve repetir autenticação, autorização e validação.

4. Não faça deploy, não altere dados de produção e não aplique uma migração em banco remoto sem autorização explícita. Crie a migração SQL no repositório. Se não houver um ambiente local seguro para aplicá-la, documente o passo manual.

5. Não apague, renomeie nem regrave dados existentes. A mudança de banco deve ser aditiva e idempotente.

6. Não refatore áreas não relacionadas. Separe os novos componentes e a nova engine sem transformar o trabalho em uma reescrita do módulo Performance.

7. Não adicione dependências visuais ou financeiras sem necessidade comprovada. O projeto já possui React, Tailwind, Recharts e Lucide.

8. Não use IA generativa para produzir o status ou a recomendação mensal. As explicações devem ser determinísticas, auditáveis e derivadas das fórmulas.

9. Não invente integração automática com Investidor10. Hoje o valor é informado manualmente por snapshot. Remova a dependência narrativa do Investidor10, mas preserve a entrada manual.

10. Use português brasileiro correto e arquivos UTF-8. Novos textos devem ter acentos corretamente.

## Contexto obrigatório do repositório

Tecnologias existentes:

- Next.js 16.3.0 com App Router;
- React 19.2.4;
- TypeScript;
- Tailwind CSS 4;
- Supabase SSR e Supabase JS;
- Recharts 3.9.1;
- Lucide React;
- Zod 4;
- testes unitários com node:test;
- Playwright para E2E.

Arquivos principais que devem ser lidos antes da implementação:

- app/admin/performance/page.tsx
- app/admin/performance/life-os-actions.ts
- components/performance/LifeOSDashboard.tsx
- components/performance/InvestmentsWorkspace.tsx
- components/performance/PerformanceConfirmDialog.tsx
- components/performance/DashboardMetricWidgets.tsx
- lib/performance-widgets.ts
- lib/performance-analytics.ts
- lib/performance-life-os.ts
- lib/personal-finance-investments.ts
- lib/personal-finance-investments.test.ts
- lib/bcb-cdi.ts
- app/globals.css
- supabase/performance-life-os.sql
- supabase/performance-widgets.sql
- supabase/personal-finance.sql
- PERFORMANCE.md

Estado atual relevante:

- app/admin/performance/page.tsx é um Server Component.
- O acesso é privado, autenticado pelo Supabase e restrito por isPerformanceOwner.
- LifeOSDashboard lê o parâmetro view e renderiza InvestmentsWorkspace.
- InvestmentsWorkspace é hoje um Client Component único com:
  - Total aportado;
  - Carteira atual;
  - Resultado;
  - Rentabilidade simples;
  - gráfico mensal da carteira;
  - gráfico mensal de aportes;
  - lista e CRUD de aportes;
  - modal de atualização da carteira.
- A função salvarRetiradaLifeOS já existe, mas a interface atual não expõe adequadamente retiradas.
- O tema Performance usa:
  - fundo principal #0b0d10;
  - cards #15191f;
  - campos #0f1318 ou #11151a;
  - bordas white/10;
  - azul para plano e ações;
  - esmeralda para trajetória saudável;
  - âmbar para atenção;
  - vermelho apenas para erro, perda ou estado crítico.

Dados existentes que devem ser preservados:

1. perf_portfolio_snapshot
   - date;
   - total_value;
   - previous_value;
   - variation_amount;
   - variation_percentage;
   - movement;
   - notes;
   - um snapshot por user_id e data.

2. perf_investment_contribution
   - date;
   - amount;
   - institution;
   - notes;
   - source;
   - source_entry_id.

3. perf_investment_withdrawal
   - date;
   - amount;
   - institution;
   - notes.

Observações técnicas importantes:

- perf_investment_contribution deve ser a fonte canônica de aportes da nova experiência.
- O fallback atual para personal_finance_entries só acontece quando a consulta da tabela de aportes falha.
- O backfill existente não é uma sincronização contínua.
- Não crie um novo acoplamento da Carteira em Rota com /admin/gastos.
- Não confie nos campos previous_value e variation_* persistidos para refazer histórico: editar um snapshot antigo não recalcula os posteriores.
- Calcule as variações usando snapshots ordenados e fluxos do intervalo.
- Os limites atuais de 90 snapshots, 100 retiradas e outros limits não podem produzir totais incorretos. Consulte ou pagine todo o conjunto necessário para os cálculos, mantendo uma faixa razoável para renderização.

## Limites de produto

O módulo Performance continua sendo uma ferramenta pessoal do proprietário dentro do RankFTV.

Respeite PERFORMANCE.md:

- acesso somente do proprietário atual;
- dados isolados em tabelas perf_*;
- RLS por user_id;
- nenhuma assinatura, checkout, billing ou liberação para outros usuários;
- nenhuma mistura com regras de atleta, campeonato, arena ou plateia;
- preservar compatibilidade com os dados pessoais atuais;
- documentar decisões que facilitem uma futura extração do módulo.

Não implementar:

- carteira por ativo ou ticker;
- cotações em tempo real;
- notícias financeiras;
- dividendos por ativo;
- ranking de investimentos;
- recomendações de compra ou venda;
- rebalanceamento sem dados reais de alocação;
- comparação social;
- score opaco;
- probabilidade de sucesso sem modelo probabilístico;
- Monte Carlo apresentado como ciência exata;
- integração nova com corretora, Open Finance ou Investidor10;
- projeção longa baseada automaticamente no CDI atual;
- aparência de planilha com uma grade principal de células;
- gamificação que premie rentabilidade especulativa;
- afirmações como “você terá” ou “retorno garantido”.

## Princípios de produto e conteúdo

- A página deve ser um GPS patrimonial: destino, posição, rota e correção.
- O que o usuário controla deve ficar separado do movimento residual da carteira.
- Aporte, regularidade, retirada, prazo e mudança de plano são atitudes controláveis.
- Valorização, desvalorização, juros, taxas, impostos e diferenças não registradas fazem parte do resultado residual da carteira.
- Uma queda de mercado nunca deve ser descrita automaticamente como falha de disciplina.
- Projeções são cenários, não promessas.
- Dados ausentes são “indisponíveis”, nunca R$ 0.
- Um erro de consulta não equivale a mês sem aporte.
- Status sempre deve ter explicação numérica.
- Use divulgação progressiva: destino e próxima ação primeiro; premissas, detalhes e histórico depois.
- Não sobrecarregue o topo com muitos KPIs pequenos.

## Arquitetura visual obrigatória

### 1. Cabeçalho

Exibir:

- título “Carteira em Rota”;
- subtítulo “Veja para onde seu ritmo atual está levando você — e qual ação de hoje mantém seu plano vivo.”;
- data do último check-in;
- qualidade ou desatualização do dado, quando aplicável;
- botão primário “Fazer check-in”;
- botão secundário “Ajustar plano”.

Se o último snapshot tiver mais de 35 dias:

> Sua carteira não é atualizada há 42 dias. Faça um check-in para recalcular a rota.

Não usar a frase atual que apresenta o Investidor10 como centro da experiência.

### 2. Card principal do destino

Esse deve ser o primeiro bloco de conteúdo relevante.

Mostrar:

- nome do destino;
- valor-alvo;
- data-alvo;
- valor observado ou estimado atual;
- percentual simples do patrimônio atual sobre o alvo;
- faixa projetada no prazo;
- status da rota;
- explicação do status;
- aporte mensal necessário, quando calculável;
- diferença para o plano;
- informação se os valores são reais ou nominais.

Estados possíveis:

- Concluída;
- Adiantada;
- No caminho;
- Atenção;
- Fora da rota;
- Calculando sua rota;
- Atualização necessária;
- Dados insuficientes.

Nunca mostrar “No caminho” durante erro, ausência de snapshot ou qualidade insuficiente.

### 3. Gráfico principal de trajetória

O gráfico deve ser o elemento dominante da página.

Usar Recharts já instalado. Considere um ComposedChart com Area, Line, ReferenceLine e marcadores, sem adicionar nova biblioteca.

Exibir:

1. histórico real de snapshots, sem inventar pontos;
2. linha do plano original;
3. rota atual no cenário-base;
4. faixa entre os cenários conservador e favorável;
5. linha do plano vigente, caso seja necessária para tornar a comparação clara;
6. linha vertical “Hoje”;
7. marcador da meta na data-alvo;
8. linha fantasma da simulação, quando o laboratório estiver ativo.

Requisitos:

- passado e futuro visualmente distintos;
- nenhuma projeção pode parecer dado realizado;
- legenda visível e simples;
- tooltip com data, valor, tipo do ponto e cenário;
- linhas diferenciadas por traço ou marcador, não apenas por cor;
- faixa descrita como sensibilidade a premissas, não intervalo de confiança;
- resumo textual acessível;
- alternativa em lista ou tabela semântica recolhida, acessível por botão;
- BRL em pt-BR;
- datas em pt-BR;
- reduzir marcas do eixo no mobile;
- nenhum scroll horizontal da página.

Microcopy:

> Projeções são estimativas baseadas nos seus dados e premissas. Elas não garantem resultados futuros.

Adicionar ação discreta “Ver premissas da projeção”.

### 4. Ação deste mês

Mostrar:

- aporte planejado no mês;
- aporte já registrado;
- valor restante;
- valor excedente, se houver;
- barra de progresso;
- impacto estimado de completar o mês;
- CTA “Registrar aporte”;
- CTA “Ver movimentações”.

Exemplos:

> Faltam R$ 600 para completar o aporte planejado de agosto.

> Completar este aporte mantém sua projeção dentro da rota atual.

> Você aportou R$ 180 acima do planejado neste mês.

Não classificar o mês corrente como falha antes do encerramento.

### 5. Dois futuros

Comparar de forma narrativa, sem tabela extensa:

- “Mantendo seu ritmo”;
- “Seguindo o plano”.

Cada lado mostra:

- aporte mensal usado;
- valor projetado na data-alvo;
- diferença para a meta;
- data estimada de alcance;
- diferença em meses;
- qualidade da leitura.

Se ainda não houver histórico suficiente para medir ritmo:

> Ainda estamos formando seu ritmo real. São necessários pelo menos três meses encerrados.

Nesse estado, o plano pode ser projetado, mas não atribua um status comportamental definitivo.

### 6. Laboratório “E se?”

O laboratório deve permitir experimentar sem escrever no banco.

Controles:

- aporte mensal;
- aporte extra único;
- pausa de aportes por N meses;
- retirada futura opcional;
- data-alvo;
- valor-alvo;
- cenário ou taxas avançadas.

Atalhos:

- “+ R$ 200 por mês”;
- “+ R$ 500 por mês”;
- “Pausar por 3 meses”;
- “Antecipar a meta em 2 anos”;
- “Cenário mais conservador”.

Enquanto a simulação muda:

- recalcular localmente, sem recarregar a página;
- mostrar “Simulação não salva”;
- atualizar linha fantasma no gráfico;
- mostrar delta de valor, data e aporte;
- manter o plano salvo visível para comparação;
- usar aria-live="polite" com debounce, sem anunciar cada pixel de um slider.

Ações:

- “Descartar simulação”;
- “Aplicar ao plano”.

Não é obrigatório persistir cenários independentes. Evite criar uma nova entidade se ela não agregar valor. “Aplicar ao plano” deve:

1. abrir confirmação com resumo antes/depois;
2. persistir uma nova revisão, sem apagar a anterior;
3. registrar a mudança no diário de bordo;
4. recalcular a rota após sucesso.

Nada deve ser persistido enquanto o usuário apenas simula.

### 7. O que moveu sua rota

Exibir para um intervalo selecionado, preferencialmente desde o último check-in ou no último mês completo:

- valor inicial;
- aportes;
- retiradas;
- resultado residual da carteira;
- variação total;
- mudança relevante de plano.

Organizar visualmente em:

- “Suas ações”;
- “Movimento da carteira”.

Microcopy obrigatória para valores inferidos:

> Resultado estimado entre seus check-ins. Ele também pode incluir juros, taxas, impostos, ativos não cadastrados ou ajustes no valor informado.

Não chamar o residual de “rendimento puro”.

### 8. Diário de bordo

Criar uma timeline, não uma planilha.

Reunir, em ordem cronológica:

- snapshots/check-ins;
- aportes;
- retiradas;
- criação do plano;
- revisões de meta, prazo, aporte ou premissas;
- observações do proprietário;
- mudanças de status apenas quando puderem ser calculadas com segurança.

Exemplos:

> 07 ago. 2026 · Check-in da carteira
> Valor atualizado para R$ 184.250. A rota foi recalculada.

> 01 ago. 2026 · Plano ajustado
> Aporte mensal alterado de R$ 2.200 para R$ 2.400.

Prefira derivar a timeline das fontes canônicas existentes e das revisões do plano. Não crie um log genérico duplicado sem necessidade.

Permita expandir itens para detalhes. Preserve edição e exclusão de aportes. Exponha retiradas na interface e implemente as ações de manutenção que estiverem faltando, sempre com confirmação.

### 9. Movimentações e histórico detalhado

Mantenha abaixo da experiência principal:

- aportes;
- retiradas;
- check-ins;
- instituição;
- data;
- observação;
- origem, quando útil;
- edição;
- exclusão segura.

Não obrigue o usuário a cadastrar ativos individuais.

## Fluxo de configuração inicial

Se existir histórico, mas não existir plano:

> Você já acompanha sua carteira. Agora defina um destino para saber se seu ritmo está levando você até lá.

CTA: “Criar meu plano”.

O histórico e as movimentações existentes devem continuar acessíveis abaixo do estado vazio.

Use um wizard de no máximo três etapas.

### Etapa 1 — Destino

Campos:

- nome do objetivo, opcional;
- valor desejado;
- data desejada;
- modo monetário:
  - valor real, em poder de compra da data-base;
  - valor nominal na data-alvo.

O modo recomendado na interface é valor real, mas a escolha deve ser explícita.

Microcopy:

> Valor real representa poder de compra. A tela identificará a data-base usada.

### Etapa 2 — Ritmo

Campos:

- valor atual da carteira, preenchido pelo snapshot mais recente quando existir;
- aporte mensal planejado;
- data de início;
- data-base dos valores.

Se não houver snapshot, peça o valor atual. Não use a soma dos aportes como se fosse o patrimônio.

### Etapa 3 — Cenários e revisão

Mostrar:

- taxa anual conservadora;
- taxa anual base;
- taxa anual favorável;
- inflação anual, quando necessária;
- indicação clara se as taxas são reais ou nominais e líquidas;
- prévia da faixa;
- resumo final;
- aviso de estimativa.

As premissas avançadas ficam recolhidas por padrão.

Validar:

    conservadora <= base <= favorável

Se fornecer valores inicialmente preenchidos, identifique-os como premissas ilustrativas e editáveis. Nunca apresente esses valores como recomendação ou expectativa do sistema. O usuário precisa confirmar antes de salvar.

Ações:

- “Voltar”;
- “Salvar plano e ver minha rota”.

## Fluxo de check-in

Ao clicar em “Fazer check-in”:

1. informar data;
2. informar valor total da carteira;
3. mostrar aportes e retiradas já registrados desde o check-in anterior;
4. permitir registrar movimentação ausente;
5. aceitar observação opcional;
6. mostrar prévia curta do recálculo;
7. salvar;
8. atualizar status, gráfico e data de atualização.

Sucesso:

> Check-in salvo. Sua rota foi recalculada.

Se já houver snapshot na data:

- avisar que existe um check-in;
- mostrar o valor atual;
- permitir editar/substituir somente após confirmação;
- nunca duplicar silenciosamente.

Se o salvamento falhar:

- manter todos os dados digitados;
- mostrar erro próximo ao formulário com role="alert";
- não fechar o modal.

## Modelo de dados

Crie uma migração incremental, preferencialmente:

    supabase/performance-investment-route.sql

Não modifique destrutivamente as tabelas atuais.

### Meta principal

O sistema terá uma única meta patrimonial principal ativa por usuário nesta versão.

Crie uma estrutura que represente a identidade do plano e preserve revisões. Uma organização recomendada é:

1. perf_investment_plan
   - id;
   - user_id;
   - name;
   - active;
   - completed_at, se aplicável;
   - created_at;
   - updated_at.

2. perf_investment_plan_revision
   - id;
   - plan_id;
   - user_id;
   - version;
   - effective_from;
   - baseline_date;
   - baseline_value;
   - target_value;
   - target_date;
   - value_mode: real ou nominal;
   - value_reference_date;
   - planned_monthly_contribution;
   - annual_return_conservative;
   - annual_return_base;
   - annual_return_favorable;
   - annual_inflation;
   - change_note;
   - created_at.

Você pode ajustar nomes e normalização se encontrar uma solução mais simples e igualmente segura, mas deve preservar obrigatoriamente:

- primeira versão imutável;
- versão vigente;
- effective_from;
- valores completos de cada revisão;
- uma única meta principal ativa;
- reconstrução do plano aplicável a cada mês passado;
- diário de mudanças;
- RLS.

Uma revisão não pode reescrever o plano original. Por padrão, mudanças mensais passam a valer no primeiro dia do mês seguinte. Se a interface oferecer vigência imediata, isso precisa ser uma escolha explícita e registrada.

### Regras SQL

- prefixo perf_;
- tipos numeric apropriados para dinheiro e percentuais;
- checks para valores não negativos ou positivos conforme o campo;
- taxa anual sempre maior que -100%;
- ordem conservadora <= base <= favorável;
- target_date posterior ao baseline_date para uma nova meta ainda não concluída;
- índices por user_id, plano, versão e effective_from;
- unique para uma única meta ativa por user_id;
- unique para plan_id e version;
- RLS habilitado;
- policies owner_all equivalentes ao padrão atual;
- grants mínimos ao role authenticated;
- referências com ON DELETE coerente;
- updated_at atualizado de maneira consistente com o projeto;
- NOTIFY pgrst, 'reload schema' ao final, se esse continuar sendo o padrão;
- migração idempotente;
- nenhuma remoção ou backfill destrutivo.

Se a criação do plano e da primeira revisão exigir atomicidade, implemente uma função/RPC transacional segura ou outro mecanismo realmente atômico. Não deixe um plano sem primeira revisão em caso de falha parcial. Funções security definer, se usadas, devem fixar search_path, validar auth.uid e limitar permissões.

### Fonte canônica

- snapshot: perf_portfolio_snapshot;
- aporte: perf_investment_contribution;
- retirada: perf_investment_withdrawal;
- plano e revisões: novas tabelas perf_*.

Não duplique aportes de personal_finance. Respeite source_entry_id. Não crie sincronização nova neste trabalho.

## Engine financeira central

Crie um módulo puro e neutro, por exemplo:

    lib/investment-route.ts

e testes em:

    lib/investment-route.test.ts

O módulo não pode importar:

- React;
- Supabase;
- fetch;
- lib/bcb-cdi.ts;
- componentes;
- Server Actions.

Todos os cards, gráfico, servidor e simulador devem consumir a mesma engine. Não replique fórmulas na interface.

Todas as funções dependentes do tempo devem receber asOfDate explicitamente. Não chame new Date() dentro da engine.

Datas financeiras são datas civis YYYY-MM-DD em America/Bahia. Evite conversão UTC que mude o dia.

Não arredonde o saldo a cada mês. Arredonde para centavos somente nas saídas e na apresentação.

Rejeite ou retorne erro tipado para:

- NaN;
- Infinity;
- data inválida;
- taxa anual menor ou igual a -100%;
- cenário fora de ordem;
- alvo inválido;
- horizonte inválido.

Não mutar arrays ou objetos de entrada.

## Semântica de valores reais e nominais

Nunca misture valores reais e nominais no mesmo eixo sem conversão explícita e rótulo.

### Modo real

- valor-alvo e aporte são expressos em poder de compra da value_reference_date;
- taxas dos cenários são reais líquidas;
- exibir “Valores em reais de ago/2026”, por exemplo;
- se houver conversão de snapshots usando apenas inflação configurada, rotular como aproximação;
- equivalente nominal futuro:

    valor_nominal = valor_real × (1 + inflacao_anual) ^ (meses / 12)

### Modo nominal

- valor-alvo é o número nominal esperado na data futura;
- taxas dos cenários são nominais líquidas;
- aporte é fixo nominal, salvo se houver uma regra explícita de reajuste;
- inflação aparece como contexto, sem ser subtraída incorretamente do saldo nominal.

Conversão correta:

    taxa_real = (1 + taxa_nominal) / (1 + inflacao) - 1

Nunca calcule taxa real apenas subtraindo inflação da taxa nominal.

## Cenários

Existem três cenários determinísticos:

- conservador;
- base;
- favorável.

Eles não representam probabilidades nem intervalo de confiança.

Microcopy:

> A faixa compara três premissas configuradas. Ela não representa garantia nem probabilidade estatística.

A projeção “Mantendo seu ritmo” usa o mesmo aporte comportamental nos três cenários e varia a taxa.

A linha “Seguindo o plano” usa o aporte planejado e a taxa-base da revisão vigente.

Não use o CDI corrente como premissa automática de longo prazo. A engine existente em lib/personal-finance-investments.ts é específica de /admin/gastos, Carlos/Julia, Mercado Pago e projeção bruta pelo CDI. Não a acople como engine principal da Carteira em Rota.

Pode reutilizar ou extrair somente matemática realmente genérica, sem duplicação e sem importar regras específicas de bancos ou pessoas.

## Fórmulas obrigatórias

### Taxa anual para mensal

Taxas anuais são efetivas:

    taxa_mensal = (1 + taxa_anual) ^ (1 / 12) - 1

Não use taxa_anual / 12.

### Projeção mensal

Convencione aporte e retirada no fim do mês:

    saldo_mes = saldo_anterior × (1 + taxa_mensal) + aporte_mes - retirada_mes

Documente essa convenção na ajuda de premissas e use a mesma regra em todos os testes.

Regras:

- normalizar a meta para o fim do mês escolhido;
- o primeiro ponto futuro deve coincidir exatamente com o saldo âncora;
- aportes recorrentes completos começam no próximo mês;
- o restante do mês atual é tratado como ação separada;
- pausa significa aporte zero nos meses afetados;
- aporte extra entra somente na data simulada;
- se retirada esgotar a carteira, retornar depletedAt e manter zero depois;
- não esconder saldo negativo com clamp silencioso;
- limitar busca de alcance a 1.200 meses;
- após esse limite, retornar unreachable.

### Valor observado e valor estimado atual

O valor observado é o snapshot mais recente com data menor ou igual a asOfDate.

Se houver fluxos posteriores:

    valor_estimado_atual =
      ultimo_snapshot
      + aportes_apos_snapshot
      - retiradas_apos_snapshot

Esse valor precisa ser rotulado:

> Estimado desde o último check-in; não inclui o movimento da carteira após essa data.

No gráfico, a ligação do snapshot observado ao valor estimado deve ser pontilhada.

Sem snapshot:

- não inferir patrimônio atual pela soma de aportes;
- mostrar aportes líquidos apenas como histórico;
- bloquear status definitivo e projeção;
- pedir o primeiro check-in.

Qualidade do snapshot:

- até 35 dias: atual;
- de 36 a 60 dias: desatualizado, projeção permitida com alerta;
- acima de 60 dias: atualização necessária, sem status definitivo.

Snapshots futuros devem ser rejeitados.

### Ritmo atual

O ritmo não é o último aporte isolado.

Calcule a média aritmética dos últimos seis meses civis encerrados:

- excluir o mês atual incompleto;
- incluir meses sem aporte como zero;
- usar somente meses após o início aplicável do plano;
- considerar aportes válidos e deduplicados;
- não descontar retiradas da média;
- não projetar retiradas históricas como recorrentes;
- usar menos de seis meses apenas se não houver seis elegíveis;
- exigir pelo menos três meses encerrados para um status comportamental.

Com menos de três meses:

- projetar provisoriamente o plano, se possível;
- mostrar “Calculando sua rota — histórico insuficiente”;
- não classificar como “No caminho” ou “Fora da rota”.

### Trajetórias

Produza no mínimo:

1. histórico real: snapshots, sem interpolar valores falsos;
2. plano original: primeira revisão imutável;
3. plano vigente: revisão aplicável;
4. rota atual: saldo atual + ritmo observado + cenário-base;
5. faixa atual: cenário conservador até favorável;
6. simulação efêmera: quando ativa.

### Aporte mensal necessário

Sem retiradas ou fluxos variáveis, para aportes no fim do mês:

    fator_anuidade = ((1 + r) ^ n - 1) / r

    aporte_necessario =
      max(0, (alvo - saldo_atual × (1 + r) ^ n) / fator_anuidade)

Se r = 0:

    aporte_necessario = max(0, (alvo - saldo_atual) / n)

Se n = 0:

- meta concluída se o saldo já alcança o alvo;
- caso contrário, meta vencida;
- nunca dividir por zero.

Com pausa, retirada, aporte extra ou fluxo variável, use a mesma engine iterativa e busca binária. Reprojetar com o aporte encontrado deve chegar ao alvo com tolerância máxima de R$ 0,01.

Mostrar separadamente:

- aporte planejado;
- ritmo médio observado;
- aporte necessário;
- diferença entre necessário e planejado;
- falta ou excedente do mês atual;
- aporte extra único necessário, se implementado.

Não transformar o número calculado em ordem ou recomendação de ativo.

## Status da rota

Calcule:

    cobertura = saldo_projetado_no_prazo_no_cenario_base / valor_alvo

Ordem de decisão:

1. sem plano: configuração necessária;
2. sem snapshot: atualização necessária;
3. snapshot acima de 60 dias: atualização necessária;
4. premissas inválidas: dados insuficientes;
5. saldo atual maior ou igual ao alvo: concluída;
6. menos de três meses elegíveis de ritmo: calculando;
7. caso contrário, classificar pela cobertura.

Limites iniciais obrigatórios, centralizados em constantes e testados:

- Adiantada: cobertura >= 1,05;
- No caminho: cobertura >= 0,95 e < 1,05;
- Atenção: cobertura >= 0,80 e < 0,95;
- Fora da rota: cobertura < 0,80.

Esses limites evitam alarmismo por pequenas oscilações. Não espalhe números mágicos pelos componentes.

Além do rótulo, sempre retornar:

- valor projetado no prazo;
- diferença em reais;
- diferença percentual;
- aporte necessário;
- data estimada de alcance;
- antecipação ou atraso em meses;
- qualidade dos dados;
- explanationKey e valores necessários para uma frase determinística.

Exemplo:

> No ritmo médio de R$ 1.800 por mês, o cenário-base chega a R$ 870 mil, equivalente a 87% da meta. O aporte estimado para retornar à faixa é R$ 2.350 por mês.

Não atribua a causa a aportes se a decomposição indicar que o maior efeito foi residual da carteira.

## Aderência mensal

A meta mensal de cada período vem da revisão vigente naquele mês. Nunca recalcule meses antigos usando a configuração atual.

Para mês encerrado:

    aderencia = aportes_do_mes / aporte_planejado_do_mes

Se o planejado for zero:

- retornar null;
- mostrar “Sem meta mensal”;
- nunca retornar 100%.

Retiradas não reduzem a aderência; aparecem separadamente.

Classificação:

- Cumprido: >= 100%;
- Quase lá: >= 80% e < 100%;
- Abaixo: < 80%.

No mês atual:

    restante = max(0, planejado - aportado)
    excedente = max(0, aportado - planejado)

Não classificar mês atual como falha.

Indicadores:

    aderencia_de_volume = soma_aportes / soma_planejado

    consistencia =
      meses_com_pelo_menos_90_porcento / meses_elegiveis

Aporte excedente melhora o patrimônio, mas não deve apagar meses anteriores sem aporte.

## Decomposição entre snapshots

Para dois snapshots consecutivos considerados de fim do dia, use fluxos em:

    (data_inicial, data_final]

Calcule:

    variacao_total = valor_final - valor_inicial

    resultado_residual =
      valor_final
      - valor_inicial
      - aportes
      + retiradas

Invariante:

    variacao_total = aportes - retiradas + resultado_residual

O residual pode conter:

- valorização ou desvalorização;
- juros e dividendos;
- taxas e impostos;
- ativos não cadastrados;
- erros ou ajustes de snapshot.

Chame de “Resultado da carteira” ou “Movimento residual estimado”, nunca “rendimento puro”.

### Rentabilidade percentual

Não reutilize como rentabilidade precisa o returnPercent atual de investmentSummary, pois ele divide resultado por aportes líquidos e ignora a data de cada fluxo.

Quando houver dois snapshots e fluxos suficientes, use Modified Dietz:

    CF_i = aporte positivo ou retirada negativa

    w_i = dias entre o fluxo e o fim / dias totais do período

    retorno =
      (valor_final - valor_inicial - soma(CF_i))
      /
      (valor_inicial + soma(w_i × CF_i))

Regras:

- fluxo na data final tem peso zero;
- fluxo na data inicial não entra, pois o snapshot inicial já representa fim do dia;
- denominador zero ou negativo significa rentabilidade indisponível;
- não anualizar períodos curtos nesta entrega;
- informar claramente o intervalo;
- XIRR não é requisito.

Se não houver dados suficientes, mostre valor indisponível em vez de uma porcentagem enganosa.

## Recomendações determinísticas

A próxima ação deve seguir uma prioridade explicável:

1. sem plano: criar plano;
2. sem snapshot ou snapshot acima de 60 dias: fazer check-in;
3. snapshot de 36 a 60 dias: sugerir atualização, mantendo projeção com alerta;
4. falta de aporte no mês atual: registrar valor restante;
5. rota em Atenção ou Fora da rota: mostrar diferença entre ritmo e aporte necessário;
6. rota saudável: reforçar consistência e próxima data de check-in;
7. meta concluída: permitir marcar como concluída ou configurar novo destino.

Não sugerir ativos, compra, venda ou rebalanceamento.

## Arquitetura de código

Não mantenha toda a nova página em um único arquivo gigante.

Estrutura sugerida, ajustável após inspeção:

    components/performance/investments/
      InvestmentRouteHeader.tsx
      InvestmentRouteHero.tsx
      InvestmentTrajectoryChart.tsx
      MonthlyInvestmentAction.tsx
      InvestmentFutureComparison.tsx
      InvestmentScenarioLab.tsx
      InvestmentRouteBreakdown.tsx
      InvestmentLogbook.tsx
      InvestmentMovements.tsx
      InvestmentPlanDialog.tsx
      InvestmentCheckinDialog.tsx

    lib/investment-route.ts
    lib/investment-route.test.ts
    app/admin/performance/investment-actions.ts
    supabase/performance-investment-route.sql

Não é obrigatório usar exatamente todos esses arquivos. O requisito é manter:

- InvestmentsWorkspace como orquestrador legível;
- engine pura separada;
- componentes com responsabilidades claras;
- novas Server Actions separadas do enorme life-os-actions.ts quando isso reduzir acoplamento;
- tipos compartilhados em módulo adequado;
- zero duplicação de fórmulas.

Integração:

- carregar plano e revisões em app/admin/performance/page.tsx;
- adicionar props serializáveis a LifeOSProps;
- repassar dados para InvestmentsWorkspace;
- diferenciar “sem plano” de “migração não aplicada”;
- incorporar erros das novas consultas ao mecanismo de schemaReady ou criar estado equivalente;
- manter a URL e o item de navegação atuais;
- preservar DashboardMetricWidgets;
- atualizar o widget de investimentos apenas se necessário para continuar correto, sem transformar o widget em uma versão miniatura de toda a página.

## Server Actions

Implemente ações, conforme necessário, para:

- criar plano e primeira revisão;
- criar nova revisão;
- concluir ou arquivar plano;
- fazer check-in;
- registrar aporte;
- editar aporte;
- remover aporte;
- registrar retirada;
- editar retirada;
- remover retirada.

Requisitos:

- arquivo com “use server”;
- requireCeo ou proteção equivalente em toda ação;
- nunca aceitar user_id do formulário;
- validar novamente todos os dados no servidor;
- limitar strings;
- validar datas;
- validar números e taxas;
- filtrar updates/deletes por id e user_id;
- não retornar dados financeiros desnecessários;
- revalidar /admin/performance;
- mensagens de erro seguras;
- nenhum segredo no cliente;
- nenhuma chave ou service role em Client Component;
- nenhuma informação financeira sensível em logs.

Use Zod se isso simplificar validação compartilhada, mas não crie duas fontes de verdade divergentes entre schema e engine.

## Check-in e consistência de dados

salvarCarteiraLifeOS hoje faz upsert do snapshot e persiste campos derivados. Na nova experiência:

- preserve compatibilidade;
- calcule o histórico dinamicamente a partir de snapshots ordenados;
- não confie em variações derivadas antigas;
- trate edição de data antiga com cuidado;
- se continuar atualizando previous_value e variation_*, deixe claro que são apenas conveniência e não fonte analítica;
- não crie duplicidade na mesma data;
- evite operação parcialmente salva ao combinar snapshot e outros dados;
- exiba confirmação ao substituir um check-in.

## Estados da interface

Implemente estados específicos.

### Sem plano

> Você já acompanha sua carteira. Agora defina um destino para saber se seu ritmo está levando você até lá.

### Sem snapshot

> Ainda não sabemos onde sua carteira está hoje. Faça o primeiro check-in para começar a projeção.

### Sem aportes

> Nenhum aporte foi registrado neste período.

### Sem histórico suficiente

> Sua trajetória histórica aparecerá depois dos próximos check-ins.

### Migração ausente

Não confundir com usuário sem plano:

> A estrutura da Carteira em Rota ainda não foi instalada neste ambiente.

A página antiga ou pelo menos as movimentações existentes devem continuar utilizáveis quando possível.

### Dados desatualizados

> Esta projeção usa o último valor informado em 3 de junho. Atualize a carteira para uma leitura mais confiável.

### Erro parcial

Um card com falha não pode derrubar toda a aba:

> Não foi possível carregar esta parte da sua rota.

Ofereça “Tentar novamente” quando houver ação real de recuperação.

### Erro de cálculo

> Não foi possível projetar com estas premissas. Revise os valores e tente novamente.

### Erro ao salvar

- manter os valores preenchidos;
- usar role="alert";
- não fechar o formulário;
- permitir tentar novamente.

### Sem conexão

> Você está sem conexão. Nada foi salvo ainda.

### Carregamento e transição

- não mostrar R$ 0 enquanto carrega;
- evitar layout shift;
- usar pending states reais;
- desabilitar envio duplicado;
- anunciar “Recalculando sua rota…” com aria-live="polite" quando apropriado.

## Design e responsividade

Preserve o dark theme do Life OS:

- fundo #0b0d10;
- superfícies #15191f;
- superfícies internas #0f1318 ou #11151a;
- borda white/10;
- texto branco;
- secundários entre white/35 e white/60;
- azul para plano e ações;
- esmeralda para positivo/saudável;
- âmbar para atenção;
- vermelho somente para negativo/erro/crítico;
- violeta pode identificar simulação;
- rounded-lg e espaçamentos coerentes;
- ícones Lucide existentes.

Não use somente cor para status. Combine:

- texto;
- ícone;
- cor;
- explicação.

Desktop:

- hero e gráfico com maior peso visual;
- ação mensal pode ocupar coluna lateral;
- seções secundárias podem formar grade de duas colunas.

Tablet:

- hero e gráfico em largura total;
- cards secundários em duas colunas.

Mobile:

- uma coluna desde 320 px;
- nenhum scroll horizontal;
- gráfico com menos ticks;
- cards narrativos;
- modais como bottom sheet ou tela cheia quando adequado;
- CTAs principais em largura total;
- alvo de toque mínimo 44 × 44 px;
- formulários não podem ficar escondidos pelo teclado virtual.

Respeite prefers-reduced-motion. Evite animação decorativa excessiva.

## Acessibilidade

Atenda WCAG 2.2 AA na experiência nova:

- hierarquia semântica de títulos;
- labels persistentes;
- placeholder não substitui label;
- ajuda e erro vinculados por aria-describedby;
- foco visível;
- navegação completa por teclado;
- modal com título acessível;
- foco contido;
- Escape fecha;
- foco retorna ao gatilho;
- ícones decorativos com aria-hidden;
- botões de ícone com nome acessível;
- status nunca depende apenas de cor;
- gráfico com resumo textual;
- gráfico com alternativa semântica;
- atualizações com aria-live e debounce;
- zoom de 200% sem perda de conteúdo;
- contraste AA;
- mensagens específicas, não apenas “Valor inválido”.

## Casos-limite obrigatórios

Trate e teste:

- nenhuma meta;
- meta sem snapshot;
- snapshot sem aportes;
- aportes sem snapshot;
- meta já alcançada;
- data-alvo hoje;
- data-alvo vencida;
- alvo zero ou negativo;
- aporte zero;
- taxa zero;
- taxa negativa;
- taxa <= -100%;
- inflação zero;
- horizonte de um mês;
- horizonte acima de 30 anos;
- meses de 28, 29, 30 e 31 dias;
- ano bissexto;
- virada de ano;
- snapshot desatualizado;
- snapshot futuro;
- fluxo posterior ao snapshot;
- aporte e snapshot no mesmo dia;
- múltiplos fluxos no mesmo dia;
- retirada superior ao saldo;
- denominador Modified Dietz nulo ou negativo;
- mudança de plano no meio do histórico;
- mês sem meta;
- mês sem aporte;
- aporte acima de 100% da meta;
- duplicidade manual/personal_finance;
- valores grandes sem NaN ou Infinity;
- meta não alcançada em 1.200 meses;
- cenário conservador negativo;
- conversão real/nominal;
- falha parcial de consulta;
- migração ainda não aplicada.

## Testes unitários obrigatórios

Use node:test e node:assert/strict, seguindo o padrão atual.

Crie testes para funções equivalentes a:

- annualToMonthlyRate;
- nominalToRealRate;
- projectPortfolio;
- requiredMonthlyContribution;
- deriveCurrentContributionPace;
- computeRouteStatus;
- computeMonthlyAdherence;
- decomposeSnapshotPeriod;
- modifiedDietzReturn;
- assessInvestmentDataQuality;
- buildTrajectorySeries;

Casos numéricos mínimos:

1. Taxa anual 0% produz taxa mensal 0%.
2. Taxa anual efetiva de 12% usa (1,12)^(1/12)-1, não 1%.
3. Saldo zero, aporte R$ 1.000 e taxa mensal 1%:
   - fim do primeiro mês: R$ 1.000;
   - fim do segundo: R$ 2.010.
4. Saldo zero, alvo R$ 12.000, 12 meses e taxa zero exige R$ 1.000/mês.
5. Taxa nominal 10% e inflação 5% produz taxa real aproximada de 4,7619%.
6. Valor inicial R$ 10.000, aportes R$ 2.000, retiradas R$ 500 e valor final R$ 11.700 produz residual R$ 200.
7. Plano R$ 1.000 por quatro meses com aportes [1.000, 500, 1.500, 0]:
   - aderência de volume 75%;
   - consistência com limite de 90% igual a 50%.
8. Ritmo [1.000, 0, 1.000, 0, 1.000, 0] produz média R$ 500.
9. Testar exatamente coberturas de 80%, 95% e 105%.
10. Snapshot acima de 60 dias não gera status definitivo.
11. Aporte posterior ao snapshot entra no valor estimado e não altera o snapshot.
12. Fluxo na data final entra no intervalo; fluxo na data inicial não entra.
13. Reprojetar com aporte necessário calculado termina a até R$ 0,01 do alvo.
14. Para cenários ordenados e fluxos válidos:

       conservador <= base <= favorável

15. Aumentar aporte nunca reduz saldo final.
16. Toda decomposição respeita:

       variacao = aportes - retiradas + residual

17. Nenhuma entrada válida produz NaN ou Infinity.
18. Nova revisão não altera a trajetória do plano original.
19. Simulação não persiste nem muta entradas.
20. O primeiro ponto projetado coincide com o saldo âncora.
21. Funções não mutam arrays de entrada.
22. Mês atual incompleto não entra no ritmo.
23. Meses sem aporte contam como zero.
24. Plano sem aporte mensal retorna aderência null.

Atualize testes antigos se a semântica de “rentabilidade” mudar. Não quebre investmentSummary silenciosamente; preserve compatibilidade onde ela ainda for usada ou migre consumidores conscientemente.

## Testes de integração e E2E

Cubra, na medida suportada pelo repositório:

- migração aditiva e idempotente;
- RLS por user_id;
- uma única meta principal ativa;
- criação atômica do plano e primeira revisão;
- versionamento;
- preservação dos dados atuais;
- ausência de duplicação por source_entry_id;
- Server Actions negando usuário não autorizado;
- criação do plano pelo wizard;
- check-in;
- registro de aporte;
- simulação sem persistência;
- aplicação da simulação criando revisão;
- diário exibindo a revisão;
- layout sem overflow nos breakpoints principais.

Use a infraestrutura de autenticação em e2e/support/auth.ts quando aplicável. Não reduza a segurança para facilitar teste.

## Verificação manual obrigatória

Valide pelo menos:

- 320 px;
- 360 px;
- 768 px;
- 1024 px;
- 1440 px;
- teclado;
- Escape em modais;
- retorno de foco;
- zoom 200%;
- prefers-reduced-motion;
- plano inexistente;
- snapshot inexistente;
- snapshot antigo;
- plano saudável;
- plano em atenção;
- simulação ativa;
- erro de salvamento.

Se o ambiente autenticado permitir, capture e inspecione visualmente a página. Se não permitir, não contorne autenticação nem crie backdoor.

## Critérios de aceitação funcionais

- [ ] A URL /admin/performance?view=investments continua funcionando.
- [ ] O item Investimentos continua selecionado na navegação.
- [ ] O acesso continua exclusivo do proprietário.
- [ ] A página se chama Carteira em Rota.
- [ ] O topo comunica destino, situação e próxima ação.
- [ ] Usuário sem plano consegue criar a primeira meta em até três etapas.
- [ ] Dados existentes preenchem campos compatíveis sem sobrescrever informação.
- [ ] Dados ausentes nunca aparecem como zero.
- [ ] O plano persiste após recarregar.
- [ ] Alterar plano cria revisão.
- [ ] A primeira versão permanece recuperável.
- [ ] O gráfico mostra histórico, plano, rota atual e faixa.
- [ ] A faixa não é descrita como probabilidade.
- [ ] O gráfico diferencia real e projetado por mais de uma pista visual.
- [ ] O status possui explicação numérica.
- [ ] Snapshot ausente ou muito antigo bloqueia status definitivo.
- [ ] A seção mensal compara planejado e realizado.
- [ ] Mês atual não é marcado prematuramente como falha.
- [ ] O ritmo ignora o mês atual e inclui meses encerrados sem aporte como zero.
- [ ] “Mantendo seu ritmo” e “Seguindo o plano” são comparáveis.
- [ ] O laboratório começa com cópia do plano salvo.
- [ ] Simular não grava nada.
- [ ] Descartar restaura exatamente o plano.
- [ ] Aplicar exige confirmação e cria revisão.
- [ ] A revisão aparece no diário.
- [ ] Aportes atuais continuam disponíveis.
- [ ] Retiradas ficam visíveis e gerenciáveis.
- [ ] Check-in evita duplicidade silenciosa.
- [ ] Resultado residual é rotulado como estimativa.
- [ ] A interface não culpa comportamento por movimento de mercado.
- [ ] Premissas podem ser consultadas.
- [ ] Valores reais e nominais não são misturados sem conversão.
- [ ] A página contém aviso de que a projeção não é garantia.
- [ ] Não há ticker, ranking, cotação, notícia ou recomendação de ativo.
- [ ] Não existe texto que torne Investidor10 requisito.

## Critérios de aceitação de resiliência

- [ ] Há estados específicos para sem plano, sem snapshot, sem aporte e sem histórico.
- [ ] Migração ausente não aparece como “sem plano”.
- [ ] Falha em uma seção não derruba toda a página.
- [ ] Erro de salvamento preserva formulário.
- [ ] Botões bloqueiam envio duplicado.
- [ ] Carteira desatualizada mostra data e CTA de check-in.
- [ ] Nenhuma consulta limitada gera total financeiro incorreto.
- [ ] Nenhum segredo chega ao navegador.
- [ ] Toda mutação verifica usuário e proprietário.
- [ ] Updates e deletes filtram id e user_id.
- [ ] Nenhum dado atual é apagado pela migração.

## Critérios de aceitação visual e acessível

- [ ] Dark theme coerente com o Life OS.
- [ ] Sem aparência de planilha.
- [ ] Gráfico é protagonista visual.
- [ ] Sem scroll horizontal entre 320 e 1440 px.
- [ ] Alvos de toque têm pelo menos 44 × 44 px.
- [ ] Todos os campos têm label.
- [ ] Erros estão associados aos campos.
- [ ] Foco é visível.
- [ ] Tudo funciona por teclado.
- [ ] Modais contêm foco, fecham com Escape e devolvem foco.
- [ ] Nenhum status depende apenas de cor.
- [ ] O gráfico tem resumo textual e alternativa semântica.
- [ ] A experiência funciona com zoom 200%.
- [ ] Animações respeitam reduced motion.
- [ ] Contraste atende WCAG AA.

## Documentação

Atualize PERFORMANCE.md:

- nova descrição da área Investimentos;
- semântica de Carteira em Rota;
- fonte canônica de snapshots, aportes, retiradas e plano;
- valores reais versus nominais;
- cenários como premissas, não garantias;
- nova migração na ordem correta;
- dependências relevantes para futura extração;
- confirmação de que continua pessoal e sem billing.

Se criar decisões matemáticas não óbvias, documente-as próximo da engine e nos testes, sem espalhar fórmulas pelos componentes.

## Comandos finais de verificação

Execute e corrija tudo o que estiver relacionado à mudança:

    npm run lint
    npm run typecheck
    npm test
    npm run build

Execute os E2E relevantes quando o ambiente estiver configurado:

    npm run test:e2e

Não declare sucesso se algum comando obrigatório falhar. Diferencie claramente:

- falha causada pela implementação;
- falha preexistente comprovada;
- verificação impossível por credencial ou serviço externo ausente.

## Entrega final esperada do agente

Ao concluir, responda de forma objetiva com:

1. resultado funcional entregue;
2. arquivos principais alterados;
3. migração criada e se foi ou não aplicada;
4. decisões financeiras adotadas;
5. testes executados e resultados;
6. qualquer passo manual restante;
7. limitações reais, sem esconder itens incompletos.

Não encerre apenas com mockup. A entrega só está completa quando UI, persistência, engine, segurança, testes e documentação estiverem coerentes entre si.
