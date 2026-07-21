# Auditoria de seguranca e prontidao para producao - RankFTV

Data da revisao: 14/07/2026
Ultima atualizacao: 21/07/2026

## Atualizacao 21/07/2026

- Sequencia obrigatoria do primeiro deploy CONCLUIDA: backup do Supabase, execucao
  de `production-security-hardening.sql`, deploy do codigo e execucao de
  `production-security-hardening-after-deploy.sql`. Verificado que usuario comum
  nao altera role, rating, pagamento nem dados de outra conta.
- CAPTCHA (Cloudflare Turnstile) implementado nas telas de login e cadastro: o
  token e enviado ao Supabase em `signInWithPassword`/`signUp`, com reset a cada
  falha (uso unico). CSP liberou `challenges.cloudflare.com`.
- Fluxo de recuperacao de senha criado: `/recuperar-senha` (envia o e-mail, com
  captcha) e `/recuperar-senha/atualizar` (define a nova senha). O link do e-mail
  reaproveita o `/auth/callback` via token_hash.
- Supabase Auth: Site URL (`https://www.rankftv.com`), Redirect URLs e captcha
  configurados no painel. Falta ainda a politica de senha/MFA do admin.

## Atualizacao 21/07/2026 (auditoria de seguranca de ponta a ponta)

Segunda rodada de auditoria, em paralelo a atualizacao acima (branches
diferentes, mesclados depois). Cobriu autorizacao, pagamentos, concorrencia e
privacidade em codigo — nao so recomendacao. Resumo; detalhe completo e
passo a passo de aplicacao ficaram em `PENDENCIAS.md`.

- Presenca de aula de arena passou a ser feita só por RPC atômica (gênero,
  vaga e crédito derivados no banco); fim da escrita direta na tabela pelo
  client.
- Inscrição em campeonato: FK composta trava category_id de outro
  campeonato; rating/gênero de elegibilidade vêm sempre do perfil salvo,
  nunca do FormData; CPF salvo sempre vence sobre o do formulário; bloqueio
  de autoconvite; índice único trava clique duplo/retry criando inscrição
  ou cobrança duplicada.
- Elo/rating: ledger idempotente (editar placar reverte o delta anterior
  antes de aplicar o novo); questionário de nível para de sobrescrever
  rating competitivo depois da primeira partida.
- Campos financeiros/administrativos (`is_elite`, taxa da plataforma, chave
  Pix, dados de repasse, habilitação): trigger bloqueia escrita direta pelo
  client, RPCs dedicadas assumem essas mudanças.
- Chave Pix: reautenticação por senha ao trocar uma chave existente,
  auditoria em `security_audit_log`, cooldown de 48h no repasse após troca,
  e consulta de titularidade na API oficial da Asaas antes de aceitar a
  troca.
- Comunicação de campeonato: destinatários sempre recalculados no servidor
  a partir de quem tem inscrição paga; HTML escapado em todos os templates
  de e-mail (o comunicado livre do organizador era o maior risco de
  injeção/phishing).
- Cartão salvo de aluno de arena: token de cobrança reutilizável sem SELECT
  para o usuário — só service_role lê; browser só recebe bandeira/últimos
  dígitos/validade.
- Estoque de ingresso de plateia: `max_quantidade` por tipo passou a ser
  aplicado de fato; pedido Pix pendente sem pagamento em 24h expira e
  devolve lote/cupom/vaga automaticamente (cron diário); rate limit por
  IP/e-mail nos checkouts de visitante.
- **Recuperação de ingresso por CPF+e-mail deixou de devolver o
  `access_token` direto — agora manda um código de 6 dígitos de uso único
  pro e-mail (item 4 antigo desta lista, ver abaixo).**
- Bucket de notícias restrito a admin/ceo (estava aberto a qualquer
  authenticated); bucket `avatars` passou a ter definição em SQL rastreada
  (antes só existia criado direto no painel); limites de tamanho/MIME.
- Fechado IDOR em `notifications` que permitia inserir notificação pra
  `user_id` arbitrário.
- N+1 corrigido na contagem de alunos da listagem de arenas.
- **LGPD: CPF pessoal e endereço residencial removidos dos Termos de Uso
  (ficou placeholder `[PENDENTE]` até ter o dado empresarial correto — ver
  `PENDENCIAS.md`); Política de Privacidade criada em `/privacidade`;
  exportação de dados e solicitação de exclusão de conta implementadas em
  `/perfil/conta` (item 6 antigo desta lista, ver abaixo).**

Migrations novas em `supabase/harden-*.sql`, `supabase/add-security-audit-log.sql`
e `supabase/add-ticket-recovery-otp.sql` — já aplicadas no banco em 20-21/07.
Pendências reais (dado de empresa pros Termos, CAPTCHA/rate limit de
login-cadastro no painel do Supabase, limitações conhecidas) estão todas em
`PENDENCIAS.md`, com passo a passo.

## Resultado executivo

O codigo foi revisado, corrigido e validado, e a base Supabase real foi limpa. A
conferencia final encontrou zero contas alem da conta administrativa. Tambem
foram removidos da base campeonatos, atletas externos, resultados, inscricoes,
duplas, ingressos, arenas, alunos, cobrancas, credenciais, notificacoes,
noticias e demais conteudos de demonstracao.

O site ainda nao deve receber dinheiro real antes da sequencia de migracao e
configuracao descrita abaixo. O arquivo local de ambiente continua apontando a
URL publica para desenvolvimento e o Asaas para Sandbox.

Nenhuma auditoria de codigo garante risco zero. Este documento separa o que foi
corrigido do que ainda depende de configuracao, decisao comercial ou validacao
operacional.

## Correcoes aplicadas

- Corrigidas permissoes que permitiam forjar credenciais, historico de rating,
  inscricoes pagas, duplas, alunos ativos, assinaturas e reservas.
- Role e rating passaram a ser campos de sistema; o usuario nao pode
  promover a propria conta nem escolher o proprio rating via API.
- CPF, nascimento e questionario de nivel foram removidos das consultas
  publicas e migrados para `profiles_private`.
- Codigo de convite de arena e token de convite de dupla deixaram de ser dados
  publicos. Convites abertos agora exigem um token aleatorio separado do UUID
  publico da dupla.
- Corrigidos IDORs em planos, lotes, categorias, chaveamento, pagamentos e
  convidados de campeonato.
- Webhooks Asaas agora validam o token, o ID da cobranca/assinatura e o registro
  interno antes de alterar status.
- Repasses Pix usam reivindicacao atomica contra eventos duplicados. O cron de
  liquidacao agora inclui inscricoes, ingressos de atleta/plateia, mensalidades,
  alugueis e diarias no cartao.
- Checkouts de cartao deixaram de enviar CEP e numero ficticios e passaram a
  exigir os dados reais do titular.
- Consultas publicas de ingresso passaram de query string para POST, com
  `no-store` e rate limit. QR e status privados exigem token de acesso.
- Corrigidos redirecionamentos abertos em login, cadastro e callback de Auth.
- Uploads de imagem/PDF passaram a usar pasta por usuario, limites de tamanho e
  tipos MIME permitidos.
- Adicionados CSP, HSTS, protecao contra iframe, `nosniff`, politica de
  referencia e de permissoes.
- Next.js foi atualizado para 16.2.10; o PostCSS vulneravel foi substituido por
  8.5.10.
- A agenda deixou de usar eventos mockados e passou a consultar campeonatos
  reais. O historico publico de rating foi implementado.
- Corrigida a rota ausente `/arena/[handle]/alunos` e a exclusao completa de
  campeonatos sob as novas permissoes.

## Limpeza executada na base real

- 103 contas de Auth removidas; a conta correspondente a `ADMIN_EMAIL` foi
  preservada.
- 7 campeonatos, 20 inscricoes, 20 duplas, 40 credenciais e 4 partidas
  removidos.
- 1 arena, 32 alunos, 180 cobrancas, 1.428 presencas, 8 turmas e 7 planos/fotos
  removidos.
- Ingressos, categorias, lotes, cupons, notificacoes, noticias, conquistas,
  resultados e rankings externos de demonstracao removidos.
- Seeds explicitamente falsos e credenciais de teste foram retirados do
  repositorio. O script de manutencao ficou em
  `scripts/cleanup-production-data.mjs`, com modo seguro de conferencia por
  padrao e exclusao somente com `--execute`.

## Sequencia obrigatoria do primeiro deploy

> CONCLUIDA em 21/07/2026 (ver secao "Atualizacao 21/07/2026").

1. Fazer um backup/snapshot do Supabase.
2. No SQL Editor, executar `supabase/production-security-hardening.sql`.
3. Fazer o deploy deste codigo e aguardar o status Ready.
4. Imediatamente depois, executar
   `supabase/production-security-hardening-after-deploy.sql`.
5. Confirmar que um usuario comum nao consegue atualizar `role`, `rating`,
   status de pagamento, credenciais ou dados de outra conta.

A etapa 1 cria as colunas e permissoes exigidas pelo codigo novo. A etapa 2
remove os campos pessoais antigos e esconde colunas publicas. Inverter a ordem
pode interromper cadastro, convite, arena e perfil.

## Configuracao externa ainda pendente

| Item | Estado atual | Acao para producao |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_URL` | desenvolvimento | Definir `https://` com o dominio final |
| `ASAAS_BASE_URL` | Sandbox | Trocar para a API de producao e usar uma chave de producao |
| `ASAAS_WEBHOOK_TOKEN` | presente | Cadastrar o mesmo token no webhook de producao |
| Webhook Asaas | nao validado em producao | Apontar para `https://DOMINIO/api/webhooks/asaas` e habilitar eventos de pagamento confirmado, recebido, estornado e excluido |
| `CRON_SECRET` | presente | Confirmar o cron diario da Vercel e monitorar respostas/falhas |
| Resend | chave presente, remetente de teste | Verificar o dominio, criar SPF/DKIM e definir `RESEND_FROM_EMAIL` |
| Supabase Auth | Site URL, Redirect URLs e CAPTCHA configurados (21/07) | Falta definir politica de senha/MFA do admin |
| DNS/HTTPS | nao verificavel localmente | Configurar dominio, HTTPS e somente depois habilitar HSTS preload |
| Backups/alertas | nao verificavel localmente | Ativar PITR/backups, alertas de erro, logs de webhook e conciliacao financeira |

Nunca copiar a chave Sandbox para producao nem expor `SUPABASE_SERVICE_ROLE_KEY`,
`ASAAS_API_KEY`, `CRON_SECRET` ou o token do webhook no navegador.

## Funcionalidades que ainda nao estao 100% prontas

1. A assinatura paga da propria plataforma para donos de arena esta
   deliberadamente incompleta: a tela mostra preco "A definir" e nao possui
   botao de contratacao. E preciso decidir preco, periodo de teste, inadimplencia
   e cancelamento e entao implementar/testar esse checkout; ou remover essa
   oferta do menu no lancamento.
2. Falta um teste ponta a ponta no Asaas de producao controlada: cobranca de
   baixo valor, cartao recusado, Pix, parcelamento, evento duplicado, estorno,
   timeout, assinatura recorrente e execucao real do cron de repasse.
3. A criacao de cobranca por cartao ainda precisa de uma trava persistente de
   tentativa para cobrir timeout entre a chamada ao Asaas e a gravacao do ID.
   A interface bloqueia clique repetido e os webhooks/repasses sao idempotentes,
   mas uma repeticao de rede nesse intervalo deve ser conciliada antes de operar
   em volume. Uma alternativa e usar o Checkout hospedado/tokenizado do Asaas.
   **Parcialmente melhorado em 21/07/2026**: aluguel de quadra e diária de
   arena pararam de apagar o registro local quando a chamada ao Asaas falha
   por timeout de rede (falha ambígua) — ficam pendentes pro webhook
   reconciliar, em vez de virar cobrança fantasma sem registro. Reserva de
   horário de aluguel também ganhou índice único contra corrida de clique
   duplo. A Asaas não oferece cabeçalho de idempotência nativo em
   `POST /payments` (confirmado na doc oficial) — o restante do item segue
   pendente.
4. ~~A busca de ingressos por CPF + e-mail...~~ **RESOLVIDO em 21/07/2026**:
   `/api/meus-ingressos` agora só manda um código de 6 dígitos de uso único
   pro e-mail informado; o ingresso só é devolvido depois de confirmar esse
   código em `/api/meus-ingressos/verificar`.
5. O CSP usa `unsafe-inline` para compatibilidade com a renderizacao atual. Um
   CSP estrito com nonce deve ser a proxima camada de hardening.
6. ~~Ha termos de uso, mas falta publicar um aviso de privacidade LGPD...~~
   **PARCIALMENTE RESOLVIDO em 21/07/2026**: Política de Privacidade
   publicada em `/privacidade` (finalidades, compartilhamento, retenção,
   direitos do titular) e exportação/exclusão de conta implementadas em
   `/perfil/conta`. Ainda falta: dado de identificação empresarial real nos
   Termos/Privacidade (hoje é um placeholder `[PENDENTE]`, ver
   `PENDENCIAS.md`) e um procedimento formal de resposta a incidentes.
7. Os testes atuais cobrem a logica financeira local, mas nao ha suite E2E para
   cadastro, convite, pagamento, webhook, check-in, painel de organizador e
   arena. Esses fluxos precisam de um roteiro de homologacao antes da abertura.

## Validacoes executadas

Re-executadas em 21/07/2026 depois de mesclar as duas branches de trabalho
(hardening/captcha/recuperação de senha + auditoria de segurança de ponta a
ponta) na árvore final:

- `npm run lint`: aprovado, sem avisos.
- `npx tsc --noEmit`: aprovado.
- `npm test`: 290 de 290 testes aprovados (86 suítes).
- `npm run build`: aprovado no Next.js 16.2.10; 53 páginas geradas.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas.
- Nova conferencia da base: zero contas a remover alem do admin preservado
  (validado antes da mesclagem; não é reconferido pela mesclagem em si).
