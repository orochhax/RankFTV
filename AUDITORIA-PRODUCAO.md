# Auditoria de segurança e prontidão para produção — RankFTV

Data da revisão: 15/07/2026

## Resultado executivo

O código recebeu hardening de autorização, privacidade, pagamentos, uploads e
headers, e a limpeza registrada da base removeu os dados de demonstração,
preservando somente a conta administrativa configurada em ADMIN_EMAIL.
Antes da produção, essa conta também deve ter profiles.role igual a ceo, pois o
proxy administrativo exige role mesmo quando algumas ações aceitam o e-mail.

O responsável informou que executou as duas etapas de hardening do Supabase. A
segunda etapa foi executada antes de o deploy compatível terminar. O código
atual já usa o schema final, porém o repositório não consegue provar sozinho o
estado do projeto Supabase remoto; grants, RLS, colunas e logs ainda devem ser
conferidos no painel correto.

O site não deve receber dinheiro real enquanto as configurações externas e a
homologação financeira descritas abaixo estiverem pendentes. Em particular, o
ambiente revisado ainda apontava a URL pública para desenvolvimento e o Asaas
para Sandbox.

Nenhuma revisão elimina todo risco. Este documento separa:

- o que foi corrigido no código e nos SQLs;
- o que foi reportado como executado na base;
- o que depende de painel externo, decisão comercial ou teste operacional.

## Escopo revisado

- App Router, Server Components, Server Actions e APIs;
- autenticação, autorização, propriedade e navegação condicionada;
- RLS, grants, RPCs, storage e separação de dados privados;
- inscrições, ingressos, check-in, webhooks, cobranças e repasses;
- gestão de Arena, campeonato, Staff e Admin;
- headers, dependências, rate limit e exposição de dados;
- shell responsivo e refatoração visual desta branch;
- dados de demonstração e scripts de limpeza;
- documentação e checklist de deploy.

## Correções aplicadas

- Role e rating são campos de sistema; o usuário não pode promover a própria
  conta nem definir o próprio rating por uma atualização comum.
- CPF, telefone, nascimento e questionário foram retirados das consultas
  públicas e centralizados em profiles_private.
- Código de convite de arena e token de convite de dupla deixaram de ser
  colunas públicas. Convites abertos usam token aleatório separado do UUID.
- Foram corrigidos caminhos de IDOR em planos, lotes, categorias, chaveamento,
  pagamentos, convidados e relações de campeonato/arena.
- Políticas passaram a impedir a criação ou alteração indevida de credenciais,
  histórico de rating, inscrições pagas, duplas, alunos, assinaturas e reservas.
- Webhooks Asaas validam token, identificador externo e registro interno antes
  de alterar status.
- Repasses usam reivindicação atômica contra eventos duplicados. O cron abrange
  inscrições, ingressos, mensalidades, aluguéis e diárias aplicáveis.
- Checkouts deixaram de enviar endereço fictício e exigem os dados reais
  necessários do titular.
- Consulta pública de ingresso usa POST, no-store e rate limit. QR e status
  privados exigem token de acesso.
- Redirecionamentos de login, cadastro e callback foram limitados.
- Uploads usam pasta por usuário, limites de tamanho e MIME permitido.
- next.config.ts configura CSP, HSTS em produção, proteção contra iframe,
  nosniff, política de referência e política de permissões.
- Next.js está em 16.2.10 e o override do PostCSS usa 8.5.10.
- A agenda consulta campeonatos reais; a rota /arena/[handle]/alunos e a
  exclusão autorizada de campeonato foram corrigidas.

## Refatoração visual e de navegação desta branch

- A topbar global desktop foi removida.
- O desktop usa sidebar preta persistente, navegação client-side e conteúdo em
  layout compartilhado.
- O sino abre um mini menu de notificações na sidebar; “Ver todas” preserva a
  página completa.
- Arena e campeonato mantêm navegação contextual dentro do shell.
- O fundo geral desktop/mobile foi centralizado em app-bg (#F3F5FA), sem
  alterar cards e modais.
- A rota ativa usa indicador azul compartilhado e os detalhes luminosos são
  decorativos.
- A revisão não altera schema, RLS, Supabase, APIs nem regra financeira.

Antes do release, esta branch deve continuar passando por teclado, zoom,
viewport baixo, mobile e reduced motion, além das verificações automatizadas.

## Limpeza registrada da base

O procedimento anterior registrou:

- remoção de 103 contas de Auth, preservando a conta de ADMIN_EMAIL;
- remoção de 7 campeonatos, 20 inscrições, 20 duplas, 40 credenciais e
  4 partidas;
- remoção de 1 arena, 32 alunos, 180 cobranças, 1.428 presenças, 8 turmas e
  7 planos/fotos;
- remoção de ingressos, categorias, lotes, cupons, notificações, notícias,
  conquistas, resultados e rankings externos de demonstração;
- nova conferência sem contas adicionais a remover além do admin preservado.

scripts/cleanup-production-data.mjs permanece como ferramenta operacional. O
modo padrão é apenas conferência e a exclusão exige --execute.

Esses números são o registro da execução na base usada naquela operação. Antes
de repetir em qualquer ambiente, confirmar projeto, snapshot e ADMIN_EMAIL.

## Estado das duas etapas de hardening

### O que cada etapa faz

1. supabase/production-security-hardening.sql prepara as colunas privadas,
   políticas, grants, RPCs e compatibilidade do código novo.
2. supabase/production-security-hardening-after-deploy.sql remove
   data_nascimento e questionario de profiles e restringe as colunas
   selecionáveis de profiles e arenas.

### Estado reportado

As duas etapas foram executadas, mas a etapa 2 ocorreu antes de o deploy do
código compatível ficar Ready. Não é necessário reexecutá-la cegamente agora:
o caminho seguro é terminar o deploy compatível e auditar o estado final.

Conferir no Supabase:

- profiles_private possui data_nascimento e questionario;
- profiles não possui mais essas duas colunas;
- anon só lê as colunas públicas autorizadas de profiles;
- authenticated não altera role, rating, pagamento, credencial ou dados de
  outra pessoa;
- invite_code de arenas não aparece em consultas públicas;
- cadastro, perfil, convite, arena e checkout não registram erro de coluna ou
  permissão;
- o cache do PostgREST foi recarregado.

Para um projeto novo, a ordem obrigatória continua sendo snapshot, etapa 1,
deploy Ready, etapa 2 e testes de permissão.

## Configuração externa ainda pendente

| Item | Estado conhecido | Ação para produção |
| --- | --- | --- |
| NEXT_PUBLIC_BASE_URL | desenvolvimento | definir o domínio HTTPS final |
| ASAAS_BASE_URL | Sandbox | trocar endpoint e chave para produção |
| Webhook Asaas | não homologado em produção | cadastrar /api/webhooks/asaas, token e eventos corretos |
| CRON_SECRET/Vercel Cron | segredo presente, execução externa não confirmada | validar agenda, autenticação, logs e alertas |
| Resend | remetente de teste | verificar domínio, SPF/DKIM e RESEND_FROM_EMAIL |
| Supabase Auth | requer painel | revisar Site URL, Redirect URLs, senha, CAPTCHA e MFA do admin |
| DNS/HTTPS | não verificável localmente | configurar domínio e certificado antes de considerar preload |
| Backups | não verificável localmente | ativar PITR/snapshots e testar restauração |
| Monitoramento | incompleto/não verificável | alertas de erro, webhook, cron e conciliação |

Nunca expor SUPABASE_SERVICE_ROLE_KEY, ASAAS_API_KEY, CRON_SECRET ou o token do
webhook ao navegador.

## Funcionalidades e riscos ainda abertos

1. A assinatura paga da própria plataforma para donos de arena continua sem
   preço e checkout definitivos. Decidir preço, trial, inadimplência e
   cancelamento, implementar e homologar; ou retirar a oferta do lançamento.
2. Os checkouts de plano recorrente, aluguel e diária somam 10% de taxa de
   serviço e repassam o valor-base à Arena. A emissão manual de Pix de
   mensalidade não soma a taxa no mesmo ponto do código. Definir a regra
   comercial, uniformizar todos os métodos e refletir a cobrança nos termos.
3. A autorização Admin usa fontes diferentes: a navegação verifica ADMIN_EMAIL,
   o proxy exige role admin/ceo, ações aceitam role ou e-mail e a gestão de
   usuários exige ceo. Unificar a regra; até lá, verificar que a conta principal
   possui simultaneamente ADMIN_EMAIL e role ceo.
4. Falta um teste controlado no Asaas de produção cobrindo Pix, cartão aprovado
   e recusado, parcelamento, duplicidade de evento, timeout, estorno, assinatura
   e execução real do cron.
5. A criação de cobrança por cartão ainda precisa de trava persistente contra o
   intervalo entre a resposta do Asaas e a gravação local. A interface evita
   duplo clique e webhooks/repasses são idempotentes, mas isso não cobre todo
   timeout de rede.
6. A recuperação de ingresso por CPF e e-mail é limitada e protegida, mas um
   link mágico/OTP seria uma camada mais forte em escala.
7. O CSP ainda usa unsafe-inline por compatibilidade. Migrar para nonce quando a
   estratégia de renderização permitir.
8. Existem termos de uso, mas falta aviso de privacidade LGPD completo, canal
   de direitos do titular, retenção/exclusão e procedimento de incidente.
9. Os testes locais cobrem regras importantes, mas ainda não existe suíte E2E
   para cadastro, convite, pagamento, webhook, check-in, Painel e Arena.

## Checklist para autorizar dinheiro real

### Código e banco

- [ ] Revisar o diff final e garantir que não há segredo nem ativo duplicado.
- [ ] Criar snapshot recuperável.
- [ ] Confirmar o estado final das duas etapas de hardening.
- [ ] Testar RLS/grants como anon, usuário, organizador, staff e service_role.
- [ ] Executar lint, TypeScript, testes, build, audit e diff-check.

### Serviços

- [ ] Configurar domínio, Auth, Asaas, webhook, Resend e cron de produção.
- [ ] Ativar backups, observabilidade, alertas e conciliação.
- [ ] Proteger a conta administrativa com MFA e confirmar role ceo.

### Homologação

- [ ] Testar cadastro, login, recuperação, perfil e permissões.
- [ ] Testar campeonato, dupla, pagamento, credencial, check-in e reembolso.
- [ ] Testar Arena, aluno, aula, presença, mensalidade, diária e aluguel.
- [ ] Realizar transação real controlada de baixo valor.
- [ ] Validar desktop, mobile, teclado, zoom, links diretos e voltar/avançar.
- [ ] Publicar privacidade/LGPD e procedimento de incidente.

## Validações locais

Executadas no fechamento desta branch em 15/07/2026:

- npm run lint: aprovado;
- npx tsc --noEmit: aprovado;
- npm test: 151/151 testes aprovados em 49 suítes;
- npm run build: aprovado no Next.js 16.2.10, com geração estática 49/49;
- npm audit --omit=dev: zero vulnerabilidades conhecidas;
- git diff --check: executar novamente depois da revisão/staging final.

Essas verificações cobrem o repositório local. Elas não substituem os testes
E2E, a auditoria do Supabase remoto nem a homologação do Asaas de produção.
