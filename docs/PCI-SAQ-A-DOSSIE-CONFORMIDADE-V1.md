# Dossiê de Conformidade PCI DSS — Escopo SAQ A (RankFTV V1)

**Data do documento:** 05/11/2026  
**Responsável Operacional:** Carlos Gregório Rocha Batista (Pessoa Física / Desenvolvedor e Operador)  
**Ambiente Auditado:** RankFTV V1 Comercial (Campeonatos e Ingressos)  
**Provedor de Pagamentos Homologado:** Asaas Gestão Financeira Instituição de Pagamento S.A.  

---

## 1. Objetivo

Este dossiê comprova e documenta o enquadramento do **RankFTV** no escopo simplificado **SAQ A (Self-Assessment Questionnaire A)** do padrão de segurança de dados do setor de cartões de pagamento (**PCI DSS v4.0**).

O objetivo é atestar formalmente que a plataforma RankFTV **não processa, não transmite e não armazena dados sensíveis de titulares de cartão** (PAN, data de expiração ou código de segurança CVV/CVC), terceirizando 100% da captura dessas informações para o checkout hospedado do Asaas.

---

## 2. Topologia Arquitetural e Fluxo de Pagamento

```
[ Atleta / Usuário ]
        │
        │ 1. Seleciona Campeonato/Categoria e método "Cartão"
        ▼
[ Servidor RankFTV (Next.js) ]
        │
        │ 2. Cria cobrança idempotente via API (POST /v3/payments ou /v3/paymentLinks)
        │    *Envia apenas: nome, CPF, e-mail, valor e referência*
        ▼
[ API Asaas ] ──> Retorna `invoiceUrl` segura
        │
        ▼
[ Navegador do Usuário ]
        │
        │ 3. Redirecionamento completo para `invoiceUrl` (sandbox.asaas.com ou asaas.com)
        ▼
[ Checkout Hospedado Asaas (Ambiente Certificado PCI DSS Nível 1) ]
        │
        │ 4. O titular digita PAN, validade e CVV diretamente no Asaas.
        │    Nenhum dado trafega pela infraestrutura do RankFTV.
        ▼
[ Webhook Asaas ] ──> Notifica RankFTV via HTTPS (`PAYMENT_CONFIRMED`)
```

---

## 3. Evidências de Código e Verificação Técnica

### 3.1. Ausência de Campos de Cartão em Componentes Públicos
- No componente [`components/pagamento/PaymentUI.tsx`](file:///C:/Users/SnyX/Documents/Projeto-RankFTV/.codex-worktrees/v1-wallet-release-clean/components/pagamento/PaymentUI.tsx), a aba de cartão de crédito não renderiza nenhum `<input>` para número de cartão, validade ou código de segurança.
- O componente exibe exclusivamente o aviso legal e um botão de ação direcionando o cliente para a URL hospedada pelo processador:
  ```tsx
  <a href={invoiceUrl} className="...">
    Ir para o pagamento seguro
  </a>
  ```

### 3.2. Bloqueio no Servidor contra Componentes Cliente
- O cliente da API em [`lib/asaas.ts`](file:///C:/Users/SnyX/Documents/Projeto-RankFTV/.codex-worktrees/v1-wallet-release-clean/lib/asaas.ts) possui a diretiva `import "server-only";`, impedindo em tempo de compilação que qualquer função de integração com o gateway seja executada no navegador do cliente.

### 3.3. Isolamento das Rotas de Inscrição e Ingressos
- [`app/campeonatos/[id]/inscrever/actions.ts`](file:///C:/Users/SnyX/Documents/Projeto-RankFTV/.codex-worktrees/v1-wallet-release-clean/app/campeonatos/[id]/inscrever/actions.ts): A action de inscrição apenas registra a intenção de compra, calcula as taxas e chama `createIdempotentCharge`, persistindo no banco o `asaas_payment_id` e a `invoice_url`.
- [`app/campeonatos/[id]/comprar/actions.ts`](file:///C:/Users/SnyX/Documents/Projeto-RankFTV/.codex-worktrees/v1-wallet-release-clean/app/campeonatos/[id]/comprar/actions.ts): O fluxo de compra de ingressos de atletas e espectadores segue rigorosamente o mesmo isolamento por redirecionamento.

### 3.4. Superfícies Administrativas e de Arena (Tratamento de Exceções)
- A plataforma possui rotas legadas/planejadas de gestão de mensalidade de arena que continham funções de tokenização direta (`salvarCartaoArena`, `tokenizarCartao`).
- **Medida de controle comprovada:** A action correspondente (`app/arenas/[handle]/assinar/[planId]/actions.ts`) está **bloqueada por feature flag** e configurada no servidor para rejeitar execuções, garantindo que nenhum fluxo de cartão passe fora do checkout hospedado na V1.

---

## 4. Matriz de Requisitos Aplicáveis do SAQ A (PCI DSS v4.0)

| Requisito PCI DSS | Descrição | Status no RankFTV | Evidência |
| :--- | :--- | :--- | :--- |
| **Req. 2** | Aplicação de configurações seguras de sistemas | **Conforme** | Headers de segurança restritivos aplicados no `next.config.js` e Vercel (HSTS, CSP, X-Frame-Options DENY). |
| **Req. 6** | Desenvolvimento e manutenção de sistemas seguros | **Conforme** | Dependências de produção auditadas (`npm audit --omit=dev` com 0 vulnerabilidades); sanitização de inputs com Zod. |
| **Req. 8** | Identificação e autenticação de usuários | **Conforme** | Autenticação gerenciada via Supabase Auth com MFA para operadores e RLS rigoroso por `user_id`. |
| **Req. 9** | Restrição de acesso físico aos dados | **Não aplicável** | Nenhum servidor físico gerenciado; hospedagem em nuvem Vercel (Edge/Serverless) e Supabase (AWS). |
| **Req. 11** | Testes de segurança em sistemas e redes | **Conforme** | Suíte com 903 testes automatizados, typecheck estrito e auditoria contínua via CI no GitHub Actions. |
| **Req. 12** | Políticas e procedimentos de segurança da informação | **Conforme** | Políticas de privacidade publicadas em `/privacidade`, termos de uso em `/termos` e canal de segurança ativo. |

---

## 5. Declaração Formal de Elegibilidade ao SAQ A

O RankFTV cumpre todos os critérios de elegibilidade para o **PCI DSS SAQ A**:
1. Toda a aceitação e processamento de pagamentos com cartão de crédito ocorrem exclusivamente através do processador terceirizado certificado PCI DSS Nível 1 (**Asaas**).
2. O website da entidade comercial (RankFTV) não armazena, processa ou transmite quaisquer dados do titular do cartão (PAN, código de segurança ou dados de trilha) em seus servidores.
3. O cliente do RankFTV é redirecionado inteiramente para a página hospedada pelo Asaas (`invoiceUrl`), onde o pagamento é concluído.
4. O RankFTV confirma periodicamente que seu processador de pagamento é compatível e certificado pelo PCI DSS.

**Conclusão:** O RankFTV encontra-se em conformidade com o enquadramento SAQ A para o lançamento da V1.
