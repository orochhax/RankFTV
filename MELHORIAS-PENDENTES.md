# Melhorias pendentes

Atualizado em 03/09/2026. Este arquivo reúne melhorias que não bloqueiam a
V1. Obrigações de lançamento e segurança permanecem em `PENDENCIAS-V1.md`.

## Experiência do atleta

- [ ] Emitir passes oficiais para Apple Wallet e Google Wallet. A integração
  exige conta de emissor, certificados/chaves privadas e aprovação das duas
  plataformas. Até isso existir, manter o link protegido e o PDF individual.
- [ ] Criar lista de espera por categoria, com consentimento, posição clara e
  convite com prazo quando uma vaga for liberada.
- [ ] Melhorar a contingência de check-in para conexão instável, sem permitir
  uso duplicado do mesmo ingresso.
- [ ] Centralizar avisos importantes do campeonato no ingresso e no e-mail,
  incluindo mudança de data, horário ou local.

## Experiência do organizador

- [ ] Criar visão operacional por quadra, com partidas atuais, próximas
  chamadas, atrasos e conflitos.
- [ ] Evoluir o placar ao vivo e uma página pública leve para acompanhamento.
- [ ] Adicionar relatórios exportáveis de vendas, presença, categorias e
  repasses, preservando os dados pessoais dos atletas.
- [ ] Criar alertas internos configuráveis para pagamento pendente, webhook
  falho, reembolso assistido e repasse recusado.

## Administração e suporte

- [ ] Evoluir os casos de suporte com filtros, prioridade, responsável, SLA,
  anexos seguros e histórico de resolução.
- [ ] Criar painéis de tendência para entrega de e-mails, recuperação de
  ingresso, invalidação de links e alterações assistidas.
- [ ] Avaliar permissões administrativas granulares se outras pessoas entrarem
  na operação; enquanto isso, manter o painel sensível exclusivo do papel CEO.

## Evolução de produto

- [ ] Priorizar as próximas entregas usando dados reais e a matriz de
  `PESQUISA-CONCORRENTES.md`.
- [ ] Planejar Arena comercial, assinaturas recorrentes, aplicativo/PWA
  ampliado e analytics avançado somente depois da estabilização da V1.

## Itens concluídos

As credenciais individuais, recuperação segura, troca protegida, suporte do
CEO, auditoria, webhook/métricas de e-mail, PDF, check-in e proteção contra
exclusão de categoria com histórico já foram implementados e homologados no
Sandbox. As migrations operacionais e de retenção também foram executadas
nesse ambiente; a promoção para Production continua controlada pelo runbook.
