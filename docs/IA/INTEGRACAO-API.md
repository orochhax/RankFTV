# Integração da memória em chamadas de API

## Por que precisa de bootstrap

Uma API de modelo não lembra chamadas anteriores por conta própria. Se o
cliente enviar só a mensagem nova, o modelo recebe só a mensagem nova. Manter a
mesma tela de chat não prova que o histórico foi reenviado.

Os arquivos deste diretório são a fonte de verdade; o cliente da API ainda
precisa enviá-los em toda requisição.

## Agentes compatíveis com o repositório

- Codex e ferramentas compatíveis descobrem `AGENTS.md`.
- Claude Code e ferramentas compatíveis usam `CLAUDE.md`, que importa o núcleo.

Mesmo assim, o agente deve executar o protocolo e abrir as fontes roteadas.

## API direta ou aplicação própria

Em cada mensagem:

1. gerar o contexto com `npm run ai:context`;
2. enviar a saída como mensagem `system`/`developer` antes da mensagem atual;
3. incluir mensagens recentes ou um resumo acumulado;
4. incluir arquivos reais da tarefa se o modelo não puder ler o repositório;
5. salvar novo resumo e resultado depois da resposta.

```js
import { buildAiContext } from "./scripts/build-ai-context.mjs";

const projectContext = await buildAiContext({ scope: "core" });
const messages = [
  { role: "system", content: projectContext },
  { role: "system", content: rollingConversationSummary },
  ...recentMessages,
  { role: "user", content: newUserMessage },
];
```

Use `scope: "brand"` para posicionamento, público, voz e identidade;
`scope: "video"` para carregar também as regras e limites da pasta `videos/`;
`scope: "v1"` para V1/deploy/operação; e `scope: "all"` somente para auditoria
ampla. Persista por `conversation_id` mensagens recentes, resumo, decisões,
tarefas, branch/commit, arquivos, validações e próxima ação — nunca segredos ou
dados pessoais.

Exemplos:

```bash
npm run ai:context -- --scope brand
npm run ai:context -- --scope video
```

Enquanto `MARCA-E-COMUNICACAO.md` estiver com entrevista em andamento, os
escopos carregam também os itens em aberto. O modelo deve usar somente decisões
marcadas como aprovadas e perguntar antes de finalizar uma peça que dependa de
definição ausente.

## Teste da integração

Envie uma mensagem nova, sem mencionar os documentos:

> Qual é o próximo passo P0 e qual formato você deve usar se eu precisar mexer
> na Vercel?

A resposta deve consultar `PENDENCIAS-V1.md` e apresentar instruções numeradas
com projeto, menu, ambiente, branch, validação e retorno sanitizado.

Nenhum arquivo garante memória numa API direta se o cliente ignorar o
bootstrap. A garantia técnica é executar o carregador em toda requisição.
