# Procedimento CEO — estorno Pix não concluído

Use este roteiro quando um estorno Pix estiver pendente, falhar ou for
cancelado pelo processador. O objetivo é proteger a identidade do solicitante,
preservar a auditoria e não duplicar uma devolução.

## 1. Autenticar o solicitante

Aceite somente uma destas provas antes de consultar ou alterar qualquer caso:

1. O titular acessa o link gerencial privado do próprio ingresso; ou
2. o atendimento confirma CPF e e-mail já cadastrados e envia um OTP para esse
   e-mail. A solicitação só segue após a validação do código.

Não aceite print de conversa, nome, número de pedido isolado ou dados enviados
por terceiro como prova suficiente.

## 2. Nunca solicitar dados financeiros

Não peça nem registre por e-mail, WhatsApp, formulário ou nota do caso:

- chave Pix;
- banco, agência ou conta;
- número de cartão, CVV ou senha;
- API key, token ou URL privada de credencial.

No Pix, uma devolução aprovada é tratada pelo processador para a conta que fez
o pagamento original. Se o cliente disser que a conta mudou, abra o caso para
análise; não colete outra chave.

## 3. Abrir e registrar o caso

1. Entre em **Administração → Suporte a ingressos** com perfil CEO.
2. Em **Operação de e-mails**, localize o bloco **Estornos Pix que exigem
   acompanhamento humano**.
3. Clique em **Abrir caso** para o ingresso indicado.
4. Selecione o tipo `estorno_pix`, prioridade adequada e descreva apenas:
   confirmação de identidade, data/hora, estado do provedor e ação solicitada.
5. Mantenha o caso como `aguardando_prova` enquanto o OTP ou o link não tiver
   sido confirmado; use `aberto` quando já estiver autenticado.

O painel mantém responsável, SLA, histórico e notas. Não copie CPF, e-mail
completo ou IDs de pagamento para canais externos.

## 4. Tomar a decisão segura

| Estado do processador | Ação do CEO |
| --- | --- |
| Pendente/autorização externa | Não repetir. Acompanhar a conciliação. |
| Confirmado (`DONE`) | Confirmar que o ingresso foi cancelado e resolver o caso. |
| Cancelado/falhou | Registrar a evidência, manter o ingresso ativo e acionar o suporte técnico do processador. |
| Sem retorno/timeout | Não criar uma cobrança ou estorno substituto. Aguardar a conciliação e escalar se persistir. |

Somente uma nova tentativa pode existir depois de uma falha terminal já
confirmada pelo provedor. Tentativas pendentes ou ambíguas nunca podem ser
duplicadas manualmente.

## 5. Encerrar e comunicar

1. Acrescente nota objetiva no caso, com data/hora e resultado.
2. Resolva o caso somente após o processador confirmar a devolução ou após a
   orientação formal ao cliente sobre a investigação.
3. Se necessário, responda ao cliente com linguagem neutra: “Sua solicitação
   está em análise pelo meio de pagamento; não precisamos de dados bancários
   adicionais.”

## Ensaio obrigatório no Sandbox

1. Gere um ingresso Pix de teste com dados fictícios.
2. Simule um estado de estorno pendente ou cancelado pelo processador.
3. Entre no painel como CEO e abra o caso pelo bloco de acompanhamento.
4. Registre uma nota sem PII, altere para `aguardando_prova` e depois
   `resolvido`.
5. Confirme que responsável, prioridade, SLA e histórico aparecem no painel,
   e que nenhum dado financeiro foi solicitado ou gravado.
