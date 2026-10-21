# Memória operacional para agentes de IA

Esta é a porta de entrada obrigatória de qualquer agente que trabalhe no
RankFTV. Deve ser lida em toda nova solicitação, mesmo quando a conversa
aparentar ser a mesma. O histórico pode estar incompleto; o repositório precisa
ser reconsultado.

Versão do contexto: `2026-10-20.3`.

## Protocolo de toda mensagem

1. Ler `AGENTS.md` e, integralmente, `CONTEXTO-PROJETO.md`,
   `MAPA-DO-PROJETO.md`, `ESTADO-ATUAL.md`, `CONTRATO-DE-RESPOSTA.md`,
   `POLITICA-DE-SEGREDOS.md` e `REGISTRO-EXECUCOES.md`.
2. Conferir o worktree e `git status --short --branch`.
3. Escolher as fontes adicionais na tabela abaixo.
4. Abrir os arquivos reais do módulo; o mapa não substitui o código.
5. Antes de agir externamente, confirmar ambiente, projeto, branch e efeito.
6. Depois de mudança material, atualizar a documentação afetada e registrar a
   execução com data e horário de `America/Sao_Paulo`.

Carlos não precisa pedir “leia o AGENTS.md”, “leia o contexto” ou “continue de
onde parou”. Isso já é obrigatório.

## Roteamento

| Pedido | Fontes adicionais obrigatórias |
| --- | --- |
| Produto ou arquitetura | `DOCUMENTACAO.md` e arquivos reais |
| Próximo passo da V1 | `PENDENCIAS-V1.md`; `RUNBOOK-PRODUCAO.md` se envolver banco/deploy |
| Campeonato ou financeiro | mapa do módulo, código, testes e SQLs relacionados |
| Arena | `DOCUMENTACAO.md`, mapa e código; Arena continua Beta |
| Banco, migration, RLS ou RPC | SQLs predecessores, `RUNBOOK-PRODUCAO.md`, checks em `supabase/manual-tests/` e instruções Supabase/Postgres disponíveis |
| Pagamento, saque ou estorno | `AUDITORIA-PRODUCAO.md`, `RUNBOOK-PRODUCAO.md` e política de segredos |
| Deploy/Vercel/GitHub | runbook, estado atual, contrato de resposta e política de segredos |
| Chave, token, senha ou `.env` | política de segredos e `docs/SEGREDOS-E-AMBIENTES.md` |
| Passo a passo para Carlos | contrato de resposta |
| Auditoria/diagnóstico | código e estado real; não corrigir se o pedido for somente diagnosticar |
| Ferramenta pessoal de admin | arquivos reais de `/admin`; não misturar com a V1 comercial |
| Marca, posicionamento ou comunicação | `MARCA-E-COMUNICACAO.md`, `ftv.md` e assets reais da marca |
| Vídeo, carrossel ou anúncio | `MARCA-E-COMUNICACAO.md`, `videos/AGENTS.md`, `videos/README.md`, `ftv.md` e briefing da peça |

## Precedência das fontes

1. Estado remoto observado e evidência reproduzível.
2. Código, schema e configuração do worktree correto.
3. `PENDENCIAS-V1.md` para o que falta no lançamento.
4. `ESTADO-ATUAL.md` para orientação rápida.
5. `DOCUMENTACAO.md` para arquitetura e fluxos.
6. `REGISTRO-EXECUCOES.md` para histórico, nunca como prova de que o ambiente
   continua igual.
7. Planos e documentos históricos.

## Índice

- `CONTEXTO-PROJETO.md`: produto, stack e regras permanentes.
- `MAPA-DO-PROJETO.md`: módulo para caminhos, dados e testes.
- `ESTADO-ATUAL.md`: fotografia curta do checkout e próximos passos.
- `CONTRATO-DE-RESPOSTA.md`: formato de resposta exigido por Carlos.
- `POLITICA-DE-SEGREDOS.md`: autorização e limites para credenciais.
- `MARCA-E-COMUNICACAO.md`: posicionamento, públicos, voz, identidade e regras
  de conteúdo; durante a entrevista, distingue decisões aprovadas de hipóteses.
- `INTEGRACAO-API.md`: bootstrap obrigatório para APIs sem memória.
- `DECISOES/`: decisões permanentes e seus motivos.

## Manutenção

Mantenha o núcleo curto. Detalhes pertencem aos documentos especializados. Ao
adicionar uma área, atualize o roteamento e o mapa. Ao mudar o estado, atualize
`ESTADO-ATUAL.md`. Toda mudança material deve entrar no registro sem segredos
nem diffs extensos.
