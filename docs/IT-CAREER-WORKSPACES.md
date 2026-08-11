# Workspaces de carreiras de TI

Os roadmaps de TI usam duas superfícies complementares:

- O RankFTV mostra somente módulos, assuntos, subassuntos, progresso e bloqueios.
- A pasta do workspace contém perguntas, atividades, projetos, starter code, dados de exemplo, testes públicos e documentação para IDE, Jupyter ou Colab.

Somente assuntos e revisões contam para concluir um módulo. O módulo seguinte é liberado quando todos esses itens do módulo anterior forem concluídos.

## Salvamento em pasta

A interface usa o seletor de diretório disponível no Chrome e Edge para computador. O usuário escolhe um diretório e o RankFTV cria nele uma pasta completa, sem download ou extração de ZIP.

O endpoint autenticado usado nesse fluxo é:

`/api/performance/study-workspace/:roadmapId?kind=base|module|through_module|full&moduleId=:moduleId&format=files`

- `base`: ambiente e dependências iniciais.
- `module`: somente o módulo liberado.
- `through_module`: ambiente e módulos liberados até o módulo solicitado.
- `full`: projeto completo, com ambiente e todos os módulos separados em pastas.

O botão principal usa `full`. Em carreiras de dados, cada assunto recebe um
`dados.py` já preenchido com enunciados comentados, funções `TODO`, perguntas e
campos de justificativa. O aluno escreve diretamente abaixo das indicações na IDE.

O servidor valida usuário, roadmap, módulo e conclusão dos módulos anteriores. A resposta usa `Cache-Control: private, no-store`. O manifesto registra o SHA-256 de cada arquivo, e o salvamento é auditado em `perf_study_workspace_download`.

## Segurança

A geração usa uma lista permitida de documentos, enunciados, starters, datasets e testes públicos. Soluções, respostas, gabaritos, opções corretas e testes privados são rejeitados.

## Deploy

Depois das migrations de roadmaps de TI, execute:

`supabase/performance-it-career-workspaces.sql`

Essa migration também converte roadmaps de TI existentes para que apenas assuntos e revisões contem no progresso.
