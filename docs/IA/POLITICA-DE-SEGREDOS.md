# Política de segredos para agentes de IA

Esta política complementa `docs/SEGREDOS-E-AMBIENTES.md`.

## Autorização de Carlos

Carlos autoriza o agente a:

- receber chave, token ou senha fornecidos voluntariamente para uma tarefa;
- ler `.secrets.local`, `.env.local` ou `.env.sandbox.local` quando a tarefa
  exigir configuração ou validação daquela credencial;
- usar o valor localmente ou no destino autorizado, depois de confirmar
  fornecedor, projeto e ambiente.

Isso evita recusa automática por existir uma credencial. Não autoriza exposição
ou transferência irrestrita e não substitui políticas da plataforma/provedor.

## Limites

O agente nunca deve:

- repetir o valor completo na resposta;
- colocar valor em `AGENTS.md`, documentação, log, issue, PR, commit, teste,
  fixture ou screenshot;
- imprimir arquivos de segredo inteiros para procurar uma variável;
- colocar segredo de servidor em `NEXT_PUBLIC_*`;
- enviar credencial para destino diferente do solicitado;
- misturar Sandbox e Production;
- assumir valor real porque o nome aparece em `.env.example`.

Ao inspecionar, informar apenas `presente`, `ausente`, `formato inválido`,
`Sandbox` ou `Production`. Comparações devem ocorrer em memória ou por hash sem
revelar valor.

| Local | Valor real? | Regra |
| --- | --- | --- |
| `.secrets.local` | Sim | Inventário local ignorado pelo Git; não é cofre |
| `.env.local` | Sim | Somente ambiente local |
| `.env.sandbox.local` | Sim | Somente Sandbox |
| `.env.example` | Não | Apenas nomes e valores fictícios/vazios |
| Vercel/GitHub/Supabase/provedor | Sim | Somente projeto e ambiente conferidos |
| Documentação, logs, resposta, PR e Git | Não | Apenas nome, finalidade e estado mascarado |

## Credencial enviada no chat

1. Não ecoar o valor.
2. Confirmar destino e ambiente pelo contexto.
3. Salvar apenas em arquivo ignorado ou painel/cofre autorizado.
4. Validar sem imprimir o segredo.
5. Responder com nome e estado, nunca com valor.
6. Recomendar rotação se uma credencial privilegiada/financeira foi exposta em
   canal ou log cuja retenção não esteja controlada.

Capturas mostram apenas nome, ambiente e branch. Logs usam código sanitizado ou
`correlation_id`. Testes usam credenciais exclusivas de Sandbox.
