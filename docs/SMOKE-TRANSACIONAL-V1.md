# Smoke transacional da V1

Este roteiro é a última validação supervisionada antes de abrir pagamentos
reais. Use uma inscrição e um ingresso novos; nunca reaproveite uma cobrança
já conciliada. Registre somente IDs internos e do provedor — não copie CPF,
e-mail, token, QR, cartão ou chave Pix para tickets, logs ou documentos.

## 1. Pré-requisitos e janela

1. Definir responsável, início/fim da janela e canal `#alertas-rankftv`.
2. Confirmar `/api/health`, Vercel, Supabase, Asaas e Resend operacionais.
3. Confirmar conciliação, notificações financeiras, avisos de campeonato,
   retenção e repasses sem execução pendente ou falha definitiva.
4. Separar duas caixas reais controladas (Gmail e Outlook), um comprador, um
   parceiro, um organizador e um campeonato de validação com categoria e vagas.
5. Definir valor mínimo permitido e limite financeiro da validação.
6. Manter disponível o último deployment compatível; rollback é de aplicação,
   nunca remoção de tabelas ou ledgers.

## 2. Jornada sem pagamento

1. Criar uma conta nova, confirmar e-mail, sair e entrar novamente.
2. Solicitar recuperação de senha, validar resposta não enumerável e concluir a
   troca apenas pelo link/código recebido.
3. Testar cadastro e login com campos vazios, e-mail inválido, senha inválida,
   usuário duplicado e tentativas acima do limite.
4. Como organizador, abrir painel, campeonato, financeiro, inscrições,
   chaveamento, check-in e comunicação.
5. Como visitante, abrir vitrine, detalhe, categorias, chaveamento e placar.
6. Confirmar que usuário anônimo não acessa painel, staff, admin nem dados de
   outro atleta/organizador.

## 3. Pix supervisionado

1. Criar uma inscrição ou ingresso novo com os dados controlados.
2. Copiar o ID interno e a `externalReference`; confirmar uma única cobrança no
   Asaas antes de pagar.
3. Pagar o Pix e aguardar webhook/conciliação, sem usar confirmação manual.
4. Confirmar status pago, estoque/cupom consumido uma vez, duas credenciais
   individuais para a dupla e e-mail financeiro do organizador.
5. Reenviar o mesmo evento do Asaas e um evento confirmado fora de ordem.
6. Confirmar que ingresso, pagamento, credenciais, repasse e e-mails não foram
   duplicados.
7. Abrir cada link individual, validar QR distinto e bloquear acesso ao QR do
   parceiro pelo link do comprador.
8. Fazer check-in de uma credencial, repetir leitura e confirmar resposta
   idempotente; a outra credencial deve permanecer disponível.

## 4. Cartão supervisionado

1. Criar nova compra com cartão usando checkout/tokenização vigente; nunca
   registrar PAN, CVV ou imagem do cartão.
2. Confirmar uma única cobrança, status autorizado/confirmado e prazo de
   liquidação correto.
3. Repetir clique e simular resposta incerta/timeout sem criar segunda cobrança.
4. Validar recusa determinística e bloqueio por excesso de tentativas sem
   consumir vaga permanentemente.
5. Confirmar credenciais e notificações apenas após o estado financeiro
   terminal elegível.

## 5. Mudança de campeonato

1. Alterar data, horário e local do campeonato de validação com aviso ativado.
2. Confirmar prévia explícita antes de salvar.
3. Validar uma notificação in-app por usuário e um e-mail por destinatário
   normalizado, mesmo quando a dupla compartilha endereço.
4. Confirmar exclusão de inscrição pendente, expirada e estornada.
5. Forçar uma falha temporária no Sandbox, restaurar o provedor e comprovar
   retentativa com backoff sem duplicação.

## 6. Cancelamento e reembolso

1. Solicitar cancelamento dentro e fora da política e validar decisão exibida.
2. Executar um estorno integral e confirmar cancelamento do ingresso, liberação
   única de estoque/cupom e aviso único ao organizador.
3. Executar um estorno parcial supervisionado quando aplicável e comprovar o
   valor no Asaas antes de alterar o domínio.
4. Simular `CANCELLED`, timeout e saldo insuficiente no Sandbox; o sistema deve
   manter o estado reconciliável e nunca declarar devolução concluída.
5. Validar trilha de auditoria e caso assistido sem solicitar chave Pix ou dados
   bancários por e-mail/WhatsApp.

## 7. Financeiro e repasse

1. Conferir valor bruto, taxa, líquido, competência e tipo de pagamento.
2. Validar repasse pendente, em processamento, concluído e recusado.
3. Criar referência `:retry:N` somente após falha terminal confirmada; timeout
   ou ambiguidade exige reconciliação da referência anterior.
4. Confirmar que apenas `DONE` encerra o repasse e que o ledger contém uma
   operação terminal por referência.

## 8. E-mail e operação

1. Confirmar recebimento das credenciais e avisos no Gmail e Outlook, incluindo
   spam, remetente, links e versão móvel.
2. Confirmar evento aceito/entregue no Resend sem endereço em texto puro nas
   tabelas operacionais.
3. Verificar painel de alertas, Better Stack e Slack; fila antiga ou quinta
   falha deve gerar alerta e procedimento de contingência.
4. Executar crons autenticados e confirmar rejeição sem `CRON_SECRET`.

## 9. Critérios de encerramento

1. Zero duplicação financeira, de estoque, credencial, e-mail ou repasse.
2. Zero exposição de segredo, CPF, endereço, token, QR ou cartão em log público.
3. Todas as falhas recuperáveis reconciliadas e nenhuma fila crítica antiga.
4. Evidências registradas: commit, deployment, horários, IDs internos/provedor,
   resultado, incidente e responsável.
5. Qualquer divergência bloqueia pagamentos reais até correção, novo deploy e
   repetição do cenário afetado.
