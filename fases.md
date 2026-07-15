# Fases e status atual do RankFTV

> Posição em **2026-07-15**.
>
> Este arquivo resume o avanço do produto. “Concluído no código” não significa
> que gateway, domínio, e-mail, Supabase ou demais serviços externos estejam
> configurados para dinheiro real. A lista operacional obrigatória está em
> [AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md).

## Legenda

| Estado | Significado |
|---|---|
| **Concluído no código** | Fluxo e interface existem e passaram pelas verificações locais registradas; ainda podem depender de configuração externa |
| **Parcial** | Parte utilizável existe, mas ainda há regra, integração ou validação relevante em aberto |
| **Pendente** | Ainda não está pronto para lançamento |
| **Futuro** | Não pertence ao lançamento inicial |

## Matriz executiva

| Frente | Estado em 2026-07-15 | Entregue | O que ainda falta |
|---|---|---|---|
| Base do site e autenticação | **Concluído no código** | Cadastro/login, perfil, conta única, permissões condicionais e navegação responsiva | Confirmar Site URL, Redirect URLs, CAPTCHA, política de senha, MFA e role ceo da conta principal |
| Shell e redesign responsivo | **Concluído no código** | Sidebar desktop preta e persistente, navegação client-side, notificações em mini menu, fundo `#F3F5FA` e navegação mobile | Homologação visual em dispositivos e navegadores reais |
| Descoberta de campeonatos | **Concluído no código** | Home, agenda com dados reais, busca, filtros, detalhes e categorias | Validar conteúdo e operação com dados reais antes da abertura |
| Inscrição com conta | **Concluído no código** | Dupla, convite por `@usuário`, pagamento, QR, credencial, cancelamento e reembolso | Roteiro E2E completo em ambiente controlado |
| Compra sem conta | **Concluído no código** | Ingresso de atleta e plateia, Pix/cartão, token privado e recuperação por CPF + e-mail | Avaliar link mágico/OTP para recuperação em maior escala |
| Gestão do campeonato | **Concluído no código** | Categorias, lotes, cupons, financeiro, check-in, camisas, equipe, comunicação e plateia | Homologar permissões e rotinas com um campeonato real controlado |
| Pagamento e repasse | **Concluído no código / externo pendente** | Integração Asaas, webhook, idempotência de repasse, cron e estorno | Chave e URL de produção, webhook real, conciliação, cenários Pix/cartão/timeout/duplicidade/estorno |
| Motor de categoria | **Parcial** | Questionário, rating e recomendação opcional por campeonato | Detecção de sandbagging existe na lógica, mas ainda não está conectada a uma experiência completa |
| Chaveamento e resultados | **Parcial** | Geração/visualização de chave e funções de staff existem | Homologação operacional e evolução do fluxo de resultados; ranking nacional não faz mais parte do produto |
| Núcleo de Arena | **Concluído no código** | Cadastro, vitrine pública, múltiplas arenas, alunos, fotos, planos e configurações | Validar o fluxo inteiro em ambiente externo |
| Aulas e presença da Arena | **Concluído no código** | Agenda semanal de segunda a domingo, turmas, limite, confirmação e frequência | Homologar regras de cancelamento e rotina diária com usuários reais controlados |
| Receita do cliente da Arena | **Concluído no código / regra pendente** | Mensalidade recorrente, aluguel, diária, taxa de serviço, financeiro, webhook e repasse | Uniformizar os 10% entre checkout recorrente/aluguel/diária e Pix manual; depois homologar no Asaas |
| Assinatura do dono da Arena | **Pendente** | Tela de status e estrutura de dados existem | Definir preço, trial, inadimplência, cancelamento, gate e implementar checkout; ou ocultar a oferta no lançamento |
| Segurança e limpeza de demonstração | **Concluído no repositório** | Hardening, RLS, proteção de tokens, rate limit, headers e scripts de limpeza | Confirmar o estado de cada ambiente e seguir a sequência de deploy da auditoria |
| Observabilidade e operação | **Pendente externo** | Logs básicos e cron existem | Backups/PITR, alertas, monitoramento de webhook, conciliação financeira e resposta a incidentes |
| LGPD | **Pendente** | Termos de uso existem | Aviso de privacidade, canal do titular, retenção/exclusão e processo interno de incidentes |
| IA, WhatsApp e highlights | **Futuro** | Fora do escopo do lançamento | Definir somente depois da operação principal estabilizada |

## Fases consolidadas

### Fase 0 — Fundação

**Estado: concluído no código.**

- Site responsivo em funcionamento.
- Cadastro, login, perfil e permissões.
- Home, campeonatos, arenas e painéis.
- Navegação desktop e mobile.
- Banco e autenticação integrados ao Supabase.

A afirmação antiga de que esta fase dependia de muitos mocks não representa
mais o estado atual. A agenda consulta campeonatos reais e os dados explícitos
de demonstração foram removidos conforme a auditoria.

### Fase 1 — Operação cobrável de campeonatos

**Estado: concluído no código, com homologação externa pendente.**

- Inscrição de dupla com conta.
- Checkout de atleta e plateia sem conta.
- Pagamento Pix/cartão.
- Credencial QR e check-in.
- Financeiro, taxa, repasse, cron e reembolso.

Esta fase só pode receber dinheiro real depois de configurar e testar o Asaas,
o webhook, o cron e o domínio de produção.

### Fase 2 — Gestão avançada

**Estado: parcial.**

- Recomendação de categoria e questionário já existem.
- Chaveamento, resultados e acesso limitado de staff já possuem fluxos.
- A detecção de sandbagging ainda não está integrada de ponta a ponta.
- O ranking nacional e o gráfico público de evolução foram removidos do
  escopo por decisão de produto.

### Fase Arena — Produto operacional

**Estado: núcleo e cobrança do cliente implementados no código.**

- Arena pública e painel por `/arena/[handle]`.
- Alunos, planos, aulas, agenda, presença, financeiro e relatórios.
- Mensalidade do aluno, aluguel e diária.

A assinatura que o **dono da arena paga ao RankFTV** é uma etapa diferente e
continua pendente.

### Fase Produção — Abertura real

**Estado: pendente de configuração e homologação externa.**

Prioridades:

1. Confirmar a sequência de SQL/deploy em cada ambiente.
2. Trocar o Asaas Sandbox por produção com credenciais próprias.
3. Validar webhook, cron, Pix, cartão, estorno, duplicidade e timeout.
4. Configurar domínio, HTTPS, Supabase Auth e Resend.
5. Ativar backups, alertas e conciliação.
6. Executar testes E2E dos fluxos críticos.
7. Publicar documentação e processo LGPD.

Não registrar esta fase como concluída apenas porque `lint`, TypeScript, testes
unitários ou build local passaram.

## Próximo marco recomendado

O próximo marco não é adicionar mais telas. É executar uma homologação
controlada, com valores baixos, cobrindo:

```text
cadastro → compra/inscrição → pagamento → webhook → credencial
→ check-in → financeiro → repasse/estorno

criação da arena → plano → aluno → mensalidade/aluguel/diária
→ webhook → presença → relatório
```

Depois dessa homologação, decidir entre:

- implementar a assinatura paga do dono da arena; ou
- remover temporariamente a oferta do menu para o primeiro lançamento.

## Fontes

- Estado técnico atual: [DOCUMENTACAO.md](DOCUMENTACAO.md)
- Segurança e prontidão: [AUDITORIA-PRODUCAO.md](AUDITORIA-PRODUCAO.md)
- Visão do produto: [ftv.md](ftv.md)
- Histórico do pivô para Arenas:
  [PLANO-PIVO-ARENA.md](PLANO-PIVO-ARENA.md)
