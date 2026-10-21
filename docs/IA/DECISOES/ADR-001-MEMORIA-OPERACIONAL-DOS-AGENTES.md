# ADR-001 — Memória operacional dos agentes

Data: 20/10/2026.

## Contexto

O cliente de IA pode enviar cada mensagem como chamada nova sem histórico
completo, fazendo o agente esquecer decisões, estado da V1 e formato de
resposta.

## Decisão

- `AGENTS.md` é a entrada obrigatória para agentes compatíveis.
- `CLAUDE.md` importa o núcleo para ferramentas Claude compatíveis.
- `docs/IA/README.md` roteia contexto por tarefa.
- Estado, mapa, resposta e segredos ficam separados para manutenção clara.
- APIs diretas anexam `scripts/build-ai-context.mjs` em cada requisição.
- Conversas próprias mantêm `conversation_id`, mensagens recentes e resumo sem
  dados sensíveis.

## Consequências

- Carlos não precisa repetir que o agente deve se atualizar.
- O agente encontra a área certa sem ler o projeto inteiro.
- Arquivos no disco não criam memória se um cliente de API não os enviar.
- Mudanças materiais exigem atualização do estado e do registro.

Revisar a decisão se o provedor oferecer memória persistente auditável ou o
repositório adotar outro mecanismo automático.
