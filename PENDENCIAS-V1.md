# Pendências — RankFTV (V1)

Atualizado em 05/11/2026. Este arquivo contém **exclusivamente as pendências ativas**.
Todas as 142 entregas anteriores da V1 (99% dos marcos concluídos), histórico, evidências de homologação e auditorias detalhadas permanecem preservados no histórico do Git e registrados em:
- `REGISTRO-EXECUCOES.md` (diário operacional detalhado)
- `AUDITORIA-PRODUCAO.md` (relatório formal de conformidade)
- `docs/SMOKE-TRANSACIONAL-V1.md` (roteiro de smoke test)
- `docs/PCI-SAQ-A-DOSSIE-CONFORMIDADE-V1.md` (dossiê de segurança de pagamentos)

---

## P0 — Pendências para Abertura dos Pagamentos Reais (V1)

- [ ] **Teste de Pagamento Pix Real Simbólico (R$ 5,00):** Realizar uma transação Pix real de valor mínimo (ex: R$ 5,00) em produção para validação ponta a ponta na conta Asaas real e estorno supervisionado imediato (conforme roteiro `docs/SMOKE-TRANSACIONAL-V1.md`).
- [ ] **Teste de Compra no Cartão de Crédito e Cancelamento na Hora (Atleta):** Realizar compra teste no cartão de crédito e validar cancelamento voluntário imediato pelo atleta dentro da janela de 7 dias do CDC Art. 49 (estorno integral na fatura, devolução de vaga e invalidação atômica de QR Code).
- [ ] **Teste de Cancelamento pelo Atleta após 10 dias:** Simular transação após o prazo de 7 dias e validar o motor de política de reembolso (`lib/refund-policy.ts`): estorno parcial com retenção operacional se antes de 72h do evento ou bloqueio com mensagem informativa (`blocked_late`) se a menos de 72h.
- [ ] **Teste de Recebimento e Estorno pelo Organizador:** Confirmar geração de recebível D+32 com status `aguardando_liquidacao` no painel financeiro; validar estorno imediato com cancelamento de recebível sem gerar dívida; comprovar registro de débito compensatório (`record_organizer_receivable_adjustment`) caso haja saldo sacado ou antecipado.
- [ ] **Abertura Oficial dos Pagamentos:** Definir e registrar a data/hora oficial da abertura dos pagamentos reais ao público da V1 após a validação da bateria de testes supervisionados.

---

## P1 — Estabilização após o lançamento

- [ ] Melhorar a especificidade visual dos erros de participante duplicado em `/comprar` e `/inscrever`: identificar explicitamente qual atleta (Titular ou Parceiro, com nome ou final de CPF) causou o conflito de inscrição, em vez da mensagem genérica "Você ou seu parceiro já possui uma inscrição ativa nesta categoria", reduzindo o atrito durante a finalização do pedido.
- [ ] Ativar e homologar proteção contra senhas vazadas do Supabase Auth.
- [ ] Comprar chip e configurar WhatsApp oficial; até lá, manter e-mail comercial e formulário como canais oficiais.
- [ ] Consolidar migrations e SQLs em baseline reproduzível; comprovar `supabase db reset` em ambiente descartável e dry-run antes de produção.
- [ ] Executar ensaio prolongado de capacidade com 50 e 100 usuários virtuais.
- [ ] Homologar em navegador real o PDF de cada credencial individual já implementado, confirmando dados mínimos, QR atual validado pelo servidor, revogação/substituição e impressão no celular e no desktop.
- [ ] Acrescentar à confirmação compartilhamento apenas do link público do campeonato, nunca do pedido, QR ou token privado.
- [ ] Auditar `pg_trgm` e, se seguro, movê-la para `extensions` com buscas e índices revalidados.
- [ ] Homologar login, recuperação e os dois pollings no Sandbox depois do hardening de cookies/endpoints públicos já implementado.
- [ ] Estender a validação de conteúdo real a todos os uploads. Anexos de suporte já possuem autenticação, limite, MIME/extensão, assinatura e terminadores validados no servidor; uploads públicos de imagens ainda são diretos e não possuem quarentena/antimalware. Homologar também confirmação pós-upload e remoção segura de objetos rejeitados.
- [ ] Concluir a sanitização de ações administrativas não financeiras que ainda possam devolver `error.message`, priorizando dados pessoais. A camada comum e várias actions já foram endurecidas localmente, mas ainda existem ocorrências em módulos administrativos e pessoais; não marcar como concluído até a busca residual e os testes confirmarem ausência de detalhes internos no navegador.
- [ ] Revisar minimização, retenção e criptografia de CPF, e-mail, chaves Pix e backups, além do inventário local de segredos.
- [ ] Na primeira semana, acompanhar diariamente conciliação, webhooks, pendências, e-mails, estornos, suporte e repasses.
- [ ] Validar operação real controlada de estorno e repasse quando houver transação elegível.
- [ ] Definir e testar contingência de check-in offline em dois aparelhos antes do primeiro evento com público.
- [ ] Homologar no Sandbox os formulários e anexos após reduzir `serverActions.bodySizeLimit` para 1 MB.
- [ ] Aplicar gradualmente os tipos Supabase gerados aos três clientes e depois incluir `types:supabase:check` no CI com token mínimo.
- [ ] Transformar verificações SQL críticas em pgTAP e executar no CI.
- [ ] Expandir os cenários E2E autenticados e mutantes que ainda são condicionais à configuração de contas/dados descartáveis do Sandbox.
- [ ] Comprovar o workflow remoto do GitHub Actions, inclusive bootstrap do cliente PostgreSQL e backup criptografado, e trocar nomes antigos de chaves Supabase nos ambientes remotos pela nomenclatura atual.

---

## P2 — Melhorias e roadmap futuro

- [ ] Emitir passes oficiais para Apple Wallet e Google Wallet. Obter contas de emissor, certificados/chaves privadas e aprovação das duas plataformas; depois implementar e homologar a emissão dos passes. Até lá, manter o link protegido e o PDF individual. A preparação das variáveis, o diagnóstico exclusivo do CEO e o runbook já estão prontos.
- [ ] Adicionar login/cadastro Google, com vínculo seguro de contas e coleta gradual de perfil.
- [ ] Remover `style-src 'unsafe-inline'` da CSP após migrar estilos dinâmicos.
- [ ] Ensaiar restauração completa de banco e Storage em ambiente descartável.
- [ ] Reduzir a dívida técnica do lint: repositories/services, imports entre camadas, complexidade, arquivos longos, non-null assertions e TypeScript estrito; encerrar apenas quando lint, typecheck, testes e build passarem.
- [ ] Revisar mensalmente métricas, falhas e suporte; priorizar melhorias reais e planejar Arena comercial, PWA, carteiras digitais e analytics avançado.
