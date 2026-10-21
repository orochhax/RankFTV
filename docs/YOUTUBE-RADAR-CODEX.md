# Atualização manual do radar de IA pelo Codex

O Pulso.AI em `/admin/youtube` é atualizado **somente quando Carlos pedir ao
Codex**. Não existe cron ativo, job em segundo plano ou chamada a OpenAI para
pesquisa/análise. O banco de Production recebe a importação transacional pelo
script local; a interface lê exatamente esses mesmos registros.

## Pedido que Carlos pode usar

> Atualize o radar de IA: pesquise as últimas notícias e tendências, compare
> com os registros existentes, adicione novas oportunidades, reavalie as
> antigas e atualize o ranking de vídeos.

Para um recorte, por exemplo:

> Atualize apenas as notícias sobre OpenAI e ChatGPT e reavalie as ideias
> relacionadas.

## Procedimento obrigatório para o Codex

1. Abra o estado atual no banco e nas páginas de `/admin/youtube`; confira a
   última execução, tendências, ranking e anotações existentes. Antes de abrir
   qualquer fonte, execute `npm run youtube:sources`. Essa lista de Production
   é a base obrigatória da pesquisa: fonte desativada ou removida não pode ser
   consultada nem citada. Se OpenAI estiver desligada na página **Fontes**, não
   acesse o site da OpenAI naquela atualização.
2. Defina o recorte e pesquise somente as fontes ativas retornadas pelo comando.
   Para cada fonte, abra a home/listagem ou feed, identifique itens recentes e
   entre na página individual do item candidato para conferir data, título e
   conteúdo. A home sozinha nunca é evidência suficiente. Dê preferência às
   fontes primárias cadastradas; quando usar matéria, fórum ou rede social
   ativa, deixe claro o nível de evidência. Não invente tendência, volume de
   busca, visualização, preço, disponibilidade ou crescimento.
3. Faça o filtro editorial de IA antes de incluir qualquer achado. A empresa
   pode ser de tecnologia, mas o item só entra quando inteligência artificial,
   modelos, agentes, automação inteligente, robótica com IA, visão, voz,
   treinamento, chips/infraestrutura para IA ou um produto de IA forem o tema
   central. Um lançamento de carro da Tesla, por exemplo, fica de fora se não
   houver relação substancial com IA. Redes sociais ou YouTube podem exigir
   login, limitar histórico ou não expor transcrições; nesses casos registre a
   limitação e não trate a home como confirmação.
4. Compare achados com as ideias e tendências persistidas. Itens repetidos
   reforçam ou reavaliam o registro existente; uma atualização de produto pode
   ser diferente do anúncio original, desde que tenha URL/título próprio.
5. Monte um JSON conforme os schemas em
   `scripts/youtube-import-research.ts`, em `.codex-artifacts/`. Cada item e
   cada ideia precisa ter link de fonte original. Para **cada ideia nova**,
   pesquise no YouTube e inclua de três a cinco `youtubeReferences` relacionadas:
   URL do vídeo, ID, título, canal, data de publicação, visualizações observadas
   e o motivo da seleção. Equilibre alcance e atualidade; não invente esses
   números nem trate vídeos antigos como referência recente. Use títulos e
   resumos em português, mas mantenha as URLs originais.
   Inclua em `researchSourceIds` os IDs retornados por `npm run youtube:sources`.
   Use `scope: "full"` na atualização geral e inclua **todas as fontes e ideias
   ativas** para que cada ideia receba nova nota e posição. Use
   `scope: "partial"` somente quando Carlos pedir explicitamente um recorte. O
   importador bloqueia fonte desativada e uma atualização completa que omita
   fonte ou ideia ativa.
6. Para uma ideia já conhecida, mantenha o mesmo `sourceFingerprint`. Para
   uma nova, crie um fingerprint estável e descritivo. Não altere `status` de
   produção, notas do usuário ou título bloqueado por usuário.
7. Importe somente após revisar o JSON:

```powershell
npm run youtube:import -- .codex-artifacts/nome-da-pesquisa.json
```

8. Confira o resumo seguro retornado pelo script e abra
   `/admin/youtube`, `/admin/youtube/tendencias` e `/admin/youtube/ideias`.
   Informe contagens, alterações de posição, links consultados e limitações.

## Integridade e histórico

- O importador gera uma chave de idempotência a partir do conteúdo pesquisado.
  Repetir o mesmo arquivo não cria notícia, avaliação ou histórico artificial.
- Toda pesquisa bem-sucedida registra uma execução `codex`; novos fatos viram
  itens, enquanto fatos já conhecidos recebem nova observação e verificação.
- Tendências e ideias preservam avaliações, notas, pontuação e posição
  anteriores. O ranking atual é recalculado sem excluir o histórico.
- A Visão Geral exibe no máximo seis itens: somente análises manuais do Codex,
  com título em português, até 14 dias, confiabilidade confirmada/interpretação,
  oportunidade mínima 75 e confiança mínima 70. O Radar de Oportunidades é o
  acervo mais amplo; o Radar de Tendências sintetiza assuntos recorrentes, e a
  Biblioteca de Ideias transforma esses sinais em propostas de vídeo.
- As referências comparáveis do YouTube são atualizadas por vídeo/ideia, com
  data e visualizações observadas. A ficha da ideia mostra no máximo cinco,
  priorizando publicações recentes e, em seguida, alcance.
- Estados editoriais possíveis: `em_alta`, `emergente`, `estavel`,
  `perdendo_forca`, `atemporal`, `desatualizado` e `arquivado`. Arquivar não
  apaga dados.
- Cada item, tendência e ideia importados precisa declarar `aiRelevance` com
  nota mínima 70 e justificativa. O importador rejeita qualquer registro abaixo
  desse corte, impedindo que notícia de tecnologia sem relação central com IA
  entre no radar por engano.
- Não ative `ai_provider=openai`, não chame as rotas de pesquisa automática e
  não altere os arquivos de agendamento sem uma solicitação explícita de
  Carlos. A arquitetura de fontes e análises permanece para uma futura
  integração, porém está inativa por decisão de produto.

## Validação de Production

O SQL `supabase/manual-tests/youtube-content-intelligence-check.sql` é somente
leitura e verifica tabelas, RLS/grants, execução, histórico e ranking. Nunca
registre ou mostre credenciais no JSON, no terminal, na documentação ou no
chat.
