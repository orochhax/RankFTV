# Pendências para V1 — RankFTV

Atualizado em 01/09/2026. Este arquivo mantém somente tarefas abertas; evidências e itens concluídos ficam no histórico de commits, deploys e execuções.

## P0 — Obrigatório antes de abrir pagamentos reais

- [ ] Comprar e configurar um e-mail comercial no domínio do RankFTV para ser o canal oficial de suporte.
- [ ] Comprar um novo chip e configurar o WhatsApp oficial de suporte.
- [ ] Publicar nos Termos e na Privacidade a operação como pessoa física, identificando o responsável como `Carlos Gregório Rocha Batista`, sem CNPJ, após validar com apoio jurídico quais dados pessoais precisam ficar públicos.
- [ ] Publicar nos canais de suporte o funcionamento definido: atendimento disponível 24 horas por dia, responsável `Carlos Gregório Rocha Batista`, com resposta em até 24 horas.
- [ ] Obter revisão jurídica da política de cancelamento/reembolso adotada e do fluxo LGPD. A implementação considera reembolso integral até 7 dias, parcial depois disso até 72 horas antes do evento e bloqueio após check-in/início do evento, preservando análise integral para cancelamento/alteração relevante, duplicidade ou falha da plataforma.
- [ ] Definir, implementar e testar o processo de reembolso para compras sem conta. No fluxo normal, não solicitar dados bancários: o cartão deve ser estornado na cobrança original e o Pix deve tentar a devolução pela própria cobrança no Asaas. Se o Asaas rejeitar ou não disponibilizar o estorno Pix, manter o pedido como pendente e encaminhar para atendimento manual; autenticar o comprador pelo link gerencial ou recuperação com CPF + e-mail + OTP, coletar somente os dados mínimos necessários em formulário seguro, validar titularidade/destino, registrar auditoria e exigir aprovação operacional antes de qualquer Pix/TED. Nunca coletar esses dados por WhatsApp/e-mail nem realizar transferência automática; testar também saldo insuficiente, cobrança inelegível, dados divergentes e tentativa do parceiro de solicitar o reembolso. Para cartão, nunca pedir conta bancária ou chave Pix.
- [ ] Definir, implementar e testar o comportamento ao excluir uma categoria que já possua duplas/ingressos vinculados. Até essa regra ser homologada, a exclusão deve ser bloqueada e nunca pode disparar reembolso automaticamente. Avaliar um fluxo explícito de cancelamento da categoria, com aviso ao organizador e tratamento controlado de inscrições pendentes/pagas, credenciais, check-ins, chaveamento e reembolsos; testar todos esses estados antes de liberar em produção.
- [ ] Homologar a prevenção de e-mail digitado incorretamente no checkout sem conta: cada endereço deve ser confirmado por redigitação, divergências e e-mails repetidos entre atletas devem ser bloqueados no cliente e no servidor, e a tela de revisão deve exibir claramente nome, e-mail, categoria, forma de pagamento e total antes de criar a cobrança.
- [ ] Definir e implementar a recuperação assistida quando o comprador digitou o próprio e-mail incorretamente e também perdeu o link gerencial. Exigir prova de identidade e pagamento, auditoria e rotação de todos os tokens; a recuperação pública nunca deve informar se o CPF existe nem qual dado está divergente. Confirmar também que a correção feita por quem ainda possui o link gerencial invalida links, QR codes e códigos antigos e reenvia as credenciais.
- [ ] Configurar domínio/remetente transacional, incluindo SPF, DKIM e DMARC; confirmar a entrega de e-mails em Gmail e Outlook.
- [ ] Validar na homologação uma troca de titularidade antes do check-in: o link e o QR antigos devem parar de funcionar, a conta antiga deve perder o vínculo e os novos links devem chegar aos e-mails atualizados.
- [ ] Confirmar no Supabase Auth os templates e os redirects de cadastro, confirmação e recuperação de senha no domínio final.
- [ ] Configurar monitor externo e alertas para `https://www.rankftv.com/api/health`.
- [ ] Definir quem responde a operação financeira pendente ou webhook falho e por qual canal será alertado.
- [ ] Criar rotina periódica de backup lógico, armazenar uma cópia fora da máquina do operador e incluir backup dos objetos do Storage.
- [ ] Conferir buckets reais do Supabase: acesso, policies, limites de tamanho e tipos MIME permitidos.
- [ ] Confirmar em produção a equivalência das migrations recentes com o código e aplicar, com backup atual e janela sem checkout, as migrations homologadas que ainda estiverem somente no Sandbox.
- [ ] Registrar o plano de rollback da aplicação e o procedimento de restore lógico em um projeto Supabase real.
- [ ] Promover de forma controlada o código homologado para produção, com credenciais, variáveis, redirects e webhooks de produção revisados. Não promover a branch de homologação diretamente sem uma revisão do diff e do plano de rollback.
- [ ] Executar smoke final em produção: cadastro, login, checkout, pagamento, credencial/QR, check-in, chaveamento, reembolso e financeiro.
- [ ] Definir a data de abertura dos pagamentos reais ao público depois da conclusão dos demais itens P0.
- [ ] Registrar release: commit, deployment, horário, migrations executadas e responsáveis.

## P1 — Necessário para estabilizar o lançamento

- [ ] Acompanhar diariamente, na primeira semana, conciliações, webhooks, pagamentos pendentes, estornos e repasses; ajustar o processo de resposta se surgirem falhas reais.
- [ ] Validar uma operação real de estorno e uma de repasse, quando houver transações elegíveis, registrando a evidência sem criar cobranças apenas para teste.

## P2 — Depois do lançamento e com pessoas usando

- [ ] Revisar mensalmente métricas, falhas e chamados de suporte para ajustar SLA, textos de ajuda, política operacional e alertas.
- [ ] Planejar melhorias de produto a partir do uso real: Arena comercial/assinaturas recorrentes, Life OS, Performance, Carteira em Rota, aplicativo nativo, analytics avançado e redesign amplo.
