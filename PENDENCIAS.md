# Pendências pós-auditoria de segurança (atualizado 21/07/2026)

> Checklist de tudo que ficou pendente depois da rodada de correções de
> segurança/autorização/pagamentos/privacidade/concorrência — mais o que
> mudou depois da mesclagem com o trabalho feito em outra máquina
> (captcha/recuperação de senha/deploy de hardening). Cada item tem o passo
> a passo pra quando você for resolver. Itens de código já estão prontos —
> o que falta aqui é ação externa (painel, dado da empresa, decisão) ou é
> uma limitação conhecida que ficou documentada em vez de corrigida.
>
> Ver também `AUDITORIA-PRODUCAO.md` (checklist geral de produção, mais
> amplo que este), `CAPTCHA.md` (setup do Turnstile) e `DOCUMENTACAO.md`
> (arquitetura atual).

---

## 1. Aplicar as migrations SQL novas — ✅ aplicadas e confirmadas em 21/07/2026

Todas as 12 já foram rodadas. A nº 2
(`harden-championship-registration-security.sql`) tinha um bug de
idempotência (um `DROP CONSTRAINT` sem `CASCADE` num índice que outras FKs
já dependiam, então rodar duas vezes falhava) — já corrigido no arquivo.
Reaplicada com sucesso, confirmado que não havia dado duplicado (0 duplas e
0 inscrições com categoria de outro campeonato) e as duas FKs compostas já
foram validadas (`VALIDATE CONSTRAINT`, deixaram de ser `NOT VALID`).

<details>
<summary>Passo a passo original (referência)</summary>

Antes de aplicar em produção:

1. Faça um snapshot/backup recuperável do banco.
2. Rode no **SQL Editor do Supabase**, uma de cada vez, nesta ordem (todas
   são idempotentes — seguro rodar de novo se precisar):

   1. `supabase/harden-arena-attendance-security.sql`
   2. `supabase/harden-championship-registration-security.sql`
   3. `supabase/harden-rating-ledger-idempotency.sql`
   4. `supabase/add-security-audit-log.sql`
   5. `supabase/harden-championship-financial-fields.sql`
   6. `supabase/harden-payout-account-security.sql`
   7. `supabase/harden-card-token-security.sql`
   8. `supabase/harden-ticket-inventory-security.sql`
   9. `supabase/add-ticket-recovery-otp.sql`
   10. `supabase/harden-storage-buckets.sql`
   11. `supabase/harden-notifications-insert.sql`
   12. `supabase/harden-registration-idempotency.sql`

3. Depois de rodar o nº 2 e o nº 12, os dois arquivos avisam via `RAISE
   NOTICE` se já existir dado duplicado que impediria os índices/constraints
   novos de serem criados (ex: alguém já inscrito duas vezes no mesmo
   campeonato, ou dois aluguéis ativos no mesmo horário). Leia a aba de
   mensagens do SQL Editor — se aparecer aviso, resolva manualmente
   (cancelar a dupla/reserva extra) antes de rodar de novo.
4. Depois de tudo aplicado: recarregue o schema cache do PostgREST (os
   arquivos já mandam `NOTIFY pgrst, 'reload schema'`, mas confirme no
   painel Settings → API se não tiver certeza) e teste um login/cadastro,
   uma inscrição, uma presença de aula e uma troca de chave Pix pra
   confirmar que nada quebrou.

</details>

### Checklist de confirmação

- [x] **Migration nº 2** (`harden-championship-registration-security.sql`):
      confirmado sem dado duplicado e as duas FKs compostas
      (`teams_category_championship_fkey`,
      `registrations_category_championship_fkey`) já validadas.
- [x] **Migration nº 12** (`harden-registration-idempotency.sql`):
      confirmado 0 duplas repetidas no mesmo campeonato e 0 aluguéis
      conflitantes no mesmo horário — os dois índices únicos
      (`teams_one_active_per_atleta1`, `arena_rentals_one_active_per_slot`)
      foram criados sem nenhum dado pré-existente pra resolver.
- [ ] Teste rápido: um login, uma inscrição em campeonato, uma presença de
      aula de arena e uma troca de chave Pix (essa última deve pedir senha
      se já existir uma chave cadastrada).
- [x] Confirmado que `security_audit_log` e `ticket_recovery_codes` existem
      (as duas tabelas novas de auditoria/OTP).

---

## 2. Dados da empresa pros Termos e Política de Privacidade

Removi o CPF pessoal e o endereço residencial do Carlos que estavam
públicos nos Termos de Uso — ficaram placeholders `[PENDENTE: ...]` em 3
lugares até você decidir o que colocar no lugar.

**O que decidir:** razão social + CNPJ (se você abrir empresa) OU seu nome
completo sem CPF nem endereço residencial; e um canal de contato oficial
(e-mail, não precisa ser endereço físico).

**Onde editar:**

| Arquivo | Linha | O que tem lá hoje |
| --- | --- | --- |
| `app/termos/page.tsx` | 60 | Identificação de quem mantém a plataforma |
| `app/privacidade/page.tsx` | 24 | Mesma identificação, na Política de Privacidade |
| `app/privacidade/page.tsx` | 99 | Canal de contato pra dúvida sobre dados/privacidade |

Passo a passo: abra os 3 arquivos, busque por `PENDENTE`, substitua o texto
entre colchetes pelo dado real (mantendo o resto da frase). Não precisa
mexer em mais nada — o resto dos Termos/Política já está escrito.

---

## 3. Limitações conhecidas desta rodada (documentadas, não corrigidas)

Coisas que identifiquei mas não implementei — não são vulnerabilidade
aberta, mas valem uma correção futura se o produto crescer nessa direção.

- **Ingresso de plateia com vários tipos no mesmo pedido**
  (`spectator_tickets` com `itens` jsonb): quando um pedido Pix pendente com
  **mais de um tipo de ingresso** expira sem pagamento, o cupom é liberado
  mas a **quantidade reservada de cada tipo não é** (falta guardar o
  `ticket_type_id` por linha do pedido — hoje só fica salvo o nome). Pedido
  de 1 tipo só (o caso mais comum) já libera certo. Se isso virar um
  problema real (tipo "VIP" ficando preso por pedidos multi-item
  abandonados), a correção é criar uma tabela `spectator_ticket_items` com
  uma linha por tipo/quantidade, em vez do jsonb atual.

- **Bucket `avatars` no Supabase Storage**: ele nunca teve definição em SQL
  neste repositório (foi criado direto no painel, em algum momento). A
  migration `harden-storage-buckets.sql` cria as policies corretas (só o
  dono grava, na própria pasta), mas **não consegue saber nem remover**
  policies antigas que porventura já existam com outro nome. Depois de
  rodar a migration, confira manualmente em **Storage → avatars →
  Policies** no painel do Supabase se sobrou alguma policy antiga mais
  permissiva e apague.

- **Paginação server-side de campeonatos/arenas**: a listagem de arenas
  (`app/arenas/page.tsx`) teve o N+1 de contagem de alunos corrigido (uma
  query em vez de uma por arena), mas a lista completa ainda é carregada
  inteira e filtrada no cliente (`ArenaSection`). Em campeonatos a busca já
  tinha paginação; arenas não. Não é um risco de segurança, é escala — vale
  revisitar se o número de arenas crescer bastante (dezenas → centenas).

- **Preferência de visibilidade de perfil** (cidade, ranking, histórico
  público/privado): não implementei — hoje o perfil público mostra os
  mesmos campos pra todo mundo. Se quiser esse controle granular, é uma
  feature nova (coluna de preferência + filtro nas páginas públicas de
  perfil/ranking), não uma correção de bug.

- **Retenção/limpeza automática de PII em log**: não criei uma rotina
  configurável de expurgo de log. Confirmei que os fluxos de pagamento não
  logam PAN/CVV/corpo de requisição (só mensagem de erro tratada), mas não
  existe uma política formal de "log antigo se apaga depois de X dias".

---

## 4. Homologação e configuração externa (herdado de `AUDITORIA-PRODUCAO.md`)

Continua tudo pendente, independente desta rodada de segurança — o código
já é compatível, falta configurar/testar de verdade:

- [ ] `NEXT_PUBLIC_BASE_URL` apontando pro domínio final (hoje é
      desenvolvimento).
- [ ] `ASAAS_BASE_URL`/`ASAAS_API_KEY` trocados de Sandbox pra produção.
- [ ] Webhook do Asaas cadastrado em produção
      (`/api/webhooks/asaas`), com `ASAAS_WEBHOOK_TOKEN` correto.
- [ ] Cron da Vercel (`vercel.json` → `/api/cron/repasse-liquidacao`)
      confirmado rodando com `CRON_SECRET` certo — esse cron agora também
      expira pedido Pix abandonado, então ele ficou mais importante do que
      antes.
- [ ] Resend com domínio verificado, SPF/DKIM e `RESEND_FROM_EMAIL` de
      produção — os e-mails de código de recuperação de ingresso e de
      código Pix dependem disso pra chegar de verdade.
- [x] Supabase Auth: Site URL (`https://www.rankftv.com`), Redirect URLs e
      CAPTCHA configurados e testados (confirmado 21/07 — captcha, rate
      limit e fluxo de recuperação de senha, tudo funcionando). Falta só:
      política de senha e MFA da conta admin.
- [ ] Backup/PITR ativado e testado.
- [ ] Homologação financeira real (Pix, cartão aprovado/recusado,
      parcelamento, estorno, assinatura) com valor baixo antes de abrir pra
      valer.
- [ ] Confirmar que a conta principal tem `ADMIN_EMAIL` **e**
      `profiles.role = 'ceo'` simultaneamente (o proxy exige role; o atalho
      de navegação usa e-mail — precisam bater na mesma conta).

---

## 5. Branches: master e redesign/organizer-championships unificados — ✅ feito em 21/07/2026

As duas máquinas estavam commitando em branches diferentes sem nunca trocar
trabalho entre si (`master` recebia captcha/recuperação de senha/deploy
direto; `redesign/organizer-championships` tinha o redesign + a auditoria
de segurança). Mesclei os dois: `master` e `redesign/organizer-championships`
agora apontam pro mesmo commit, local e no GitHub. Nada a fazer aqui, só
registrando — mas vale escolher um branch só pra continuar trabalhando daqui
pra frente, pra não repetir a divergência.

---

## 6. Ordem recomendada pra resolver o que resta

1. ~~Migrations~~ — ✅ feito. Só falta o checklist de confirmação da seção 1
   (avisos de duplicata, teste rápido) e conferir o bucket `avatars` na
   seção 3.
2. Dados da empresa nos Termos/Privacidade (seção 2) — rápido, sem
   dependência externa.
3. Homologação e configuração externa (seção 4) — é o bloco maior, trata
   como o gate final antes de aceitar dinheiro real.
4. Limitações conhecidas (seção 3) — só se/quando virar prioridade de
   produto.
