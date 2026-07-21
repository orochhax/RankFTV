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
4. A busca de ingressos por CPF + e-mail esta limitada e nao exibe QR sem token,
   mas um link magico/OTP por e-mail seria uma recuperacao mais forte para alto
   volume.
5. O CSP usa `unsafe-inline` para compatibilidade com a renderizacao atual. Um
   CSP estrito com nonce deve ser a proxima camada de hardening.
6. Ha termos de uso, mas falta publicar um aviso de privacidade LGPD com
   controlador/contato, finalidades, bases legais, compartilhamentos,
   retencao/exclusao e canal para direitos do titular, alem de um procedimento
   interno de resposta a incidentes.
7. Os testes atuais cobrem a logica financeira local, mas nao ha suite E2E para
   cadastro, convite, pagamento, webhook, check-in, painel de organizador e
   arena. Esses fluxos precisam de um roteiro de homologacao antes da abertura.

## Validacoes executadas

- `npm run lint`: aprovado, sem avisos.
- `npx tsc --noEmit`: aprovado.
- `npm test`: 119 de 119 testes aprovados.
- `npm run build`: aprovado no Next.js 16.2.10; 49 paginas geradas.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas.
- `git diff --check`: sem erros de whitespace.
- Nova conferencia da base: zero contas a remover alem do admin preservado.
