<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Memoria operacional obrigatoria do RankFTV

Estas regras valem para qualquer agente que trabalhe neste repositorio. Nao
confie apenas no historico da conversa: ele pode estar ausente, resumido ou
desatualizado.

## Inicio obrigatorio de toda solicitacao

Antes de responder, planejar ou alterar arquivos:

1. Leia integralmente o nucleo: `docs/IA/README.md`,
   `docs/IA/CONTEXTO-PROJETO.md`, `docs/IA/MAPA-DO-PROJETO.md`,
   `docs/IA/ESTADO-ATUAL.md`, `docs/IA/CONTRATO-DE-RESPOSTA.md` e
   `docs/IA/POLITICA-DE-SEGREDOS.md`. Leia tambem
   `REGISTRO-EXECUCOES.md` integralmente para conhecer o historico recente.
2. Confira `git status --short --branch`.
3. Use o mapa para localizar o modulo solicitado.
4. Abra os arquivos reais do modulo antes de concluir como ele funciona.
5. Leia as fontes adicionais indicadas no roteamento de
   `docs/IA/README.md`. Para V1, leia obrigatoriamente `PENDENCIAS-V1.md`.
6. Se houver divergencia entre documentacao e codigo, o codigo e o estado
   remoto comprovado prevalecem. Registre e corrija a documentacao na mesma
   entrega quando isso estiver no escopo.

Para marca, posicionamento, comunicacao, conteudo, anuncio, carrossel ou video,
leia tambem `docs/IA/MARCA-E-COMUNICACAO.md`. Trabalhos dentro de `videos/`
devem seguir o `videos/AGENTS.md` local.

Nao e necessario o usuario repetir "leia o AGENTS.md", "leia o contexto" ou
"atualize-se". Isso ja faz parte de toda solicitacao.

## Durante e depois do trabalho

- Preserve alteracoes preexistentes do usuario e nao limpe uma worktree suja.
- Confirme o worktree, branch e ambiente antes de agir; Sandbox e Production
  nunca podem compartilhar credenciais.
- Mudancas de banco exigem leitura previa das instrucoes de Postgres/Supabase,
  migration incremental, RLS/grants explicitos e verificacao proporcional ao
  risco.
- Mudancas de Next.js exigem a documentacao da versao instalada em
  `node_modules/next/dist/docs/`, conforme o bloco acima.
- Depois de alteracao material, atualize `docs/IA/ESTADO-ATUAL.md` quando o
  estado tiver mudado e acrescente uma entrada em `REGISTRO-EXECUCOES.md` com
  data e horario de `America/Sao_Paulo`.
- Nao declare teste, deploy, migration ou configuracao como concluido sem
  evidencia observada.
- Siga `docs/IA/CONTRATO-DE-RESPOSTA.md` ao responder, principalmente quando o
  usuario precisar executar passos manuais.

## Segredos

O proprietario autoriza o agente a receber e usar uma credencial que ele
forneca voluntariamente, ou a ler `.secrets.local`/`.env.local`, somente quando
isso for necessario para a tarefa solicitada. Essa autorizacao nao permite
mostrar o valor novamente, grava-lo em documentacao ou logs, inclui-lo em Git,
prints ou envia-lo a outro destino. Consulte sempre
`docs/IA/POLITICA-DE-SEGREDOS.md`; politicas da plataforma e do provedor
continuam prevalecendo.

## Pulso.AI / radar de conteúdo para YouTube

Para qualquer pedido de atualização de `/admin/youtube`, ler
`docs/YOUTUBE-RADAR-CODEX.md` antes de pesquisar ou escrever no banco. O radar
é atualizado manualmente pelo Codex com pesquisa web verificável e
`npm run youtube:import`; não usar cron, pesquisa automática, API paga de IA ou
dados inventados. Toda atualização deve reavaliar registros existentes,
preservar histórico, notas e status editoriais do usuário e informar fontes e
limitações.
