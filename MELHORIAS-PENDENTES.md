# Melhorias de UX — pacote concluído

Itens observados durante a homologação e implementados no pacote solicitado em
28/08/2026. Este arquivo permanece como registro dos problemas, critérios e
soluções verificadas.

## Navegação nas telas de ingresso e reembolso

- Status: **concluído**. Checkout, detalhes de ingresso e reembolso voltaram a usar
  o `AppShell`; desktop mantém a barra lateral com **Minhas compras** e mobile mantém
  a navegação inferior.
- Registrado em 28/08/2026 durante a validação do estorno Pix real.
- Problema: as páginas de detalhes do ingresso, checkout e acompanhamento de reembolso
  exibem apenas a faixa superior com a marca RankFTV; a barra de navegação lateral da
  área autenticada não aparece.
- Resultado esperado: em desktop/notebook, manter a navegação lateral consistente com
  as demais telas logadas, incluindo o atalho de “Minhas compras”; no celular, usar a
  navegação móvel correspondente sem desperdiçar área útil.
- Critério de UX: o contexto da compra deve continuar claro e o botão “Voltar para
  Minhas compras” deve permanecer como retorno contextual, não como substituto da
  navegação principal.

## Histórico após cancelamento ou estorno concluído

- Status: **concluído**. A tela preserva a timeline e exibe solicitação, confirmação
  do Asaas e cancelamento/liberação da vaga com data e hora disponíveis no ledger.
- Registrado em 28/08/2026 ao concluir o cancelamento do ingresso Sandbox.
- Problema: depois da conclusão, a tela substitui a timeline de reembolso por um card
  genérico de “Ingresso cancelado”, sem informar quando o cancelamento ocorreu nem
  preservar as etapas já percorridas.
- Resultado esperado: manter a timeline/histórico na própria tela, acrescentando as
  etapas “Estorno confirmado” e “Ingresso cancelado”, ambas com data e hora. O card
  principal deve resumir que a vaga foi liberada e que o ingresso não pode mais ser
  usado, sem esconder o acompanhamento financeiro.
- Critério de UX: o botão “Ver minhas compras” pode continuar como ação secundária,
  mas não deve ser a única forma de a pessoa descobrir o status e o horário final do
  reembolso.

## Confirmação visual de solicitação de reembolso

- Status: **concluído**. Solicitações aceitas e operações em conciliação usam estado
  positivo, prazo de Pix/cartão e ação **Ver status do reembolso**, sem redirecionamento
  automático nem nova opção de cancelamento.
- Registrado em 28/08/2026 durante a homologação Sandbox do estorno Pix real.
- Problema: depois de confirmar o cancelamento, o modal permanece com uma mensagem em
  vermelho (“O reembolso está sendo confirmado”), que parece erro e não deixa claro que
  a solicitação foi aceita.
- Resultado esperado: após a solicitação bem-sucedida, substituir o modal por um card
  de sucesso visualmente positivo, com o texto “Seu reembolso foi solicitado com
  sucesso”, um resumo do próximo passo/prazo conforme Pix ou cartão e o botão “Ver
  status do reembolso”. Esse botão deve abrir os detalhes do próprio ingresso, onde a
  timeline do estorno permanece disponível.
- Critério de UX: não mostrar novamente a ação de cancelar enquanto houver uma
  solicitação pendente; a interface deve impedir repetição sem transmitir falha.

## Checkout Pix: atualização automática após pagamento

- Status: **concluído**. Atleta e plateia consultam somente o ingresso protegido pelo
  token, atualizam a credencial pelo estado persistido e encerram a consulta em
  `pago`, `estornado` ou `expirado`.
- Registrado em 28/08/2026 durante a compra Sandbox da categoria `Estorno Pix Real`.
- Problema: após o Pix ser pago, a página continua exibindo “Aguardando pagamento” e
  o QR Code até que a pessoa atualize manualmente o navegador.
- Resultado esperado: enquanto o pagamento estiver pendente, a tela deve acompanhar
  somente aquele pedido (Realtime ou consulta periódica leve); ao receber confirmação,
  substituir automaticamente o QR Code pelo ingresso/credencial confirmados e parar
  a atualização. Em falha, expiração ou cancelamento, exibir o respectivo estado e
  também parar a atualização.
- Critério de segurança: a atualização visual não pode confirmar pagamento por conta
  própria; o estado continua vindo do webhook/ledger e da conciliação financeira.

## Checkout de atleta: preservar formulário após CPF inválido

- Status: **concluído**. Todos os campos da dupla e do questionário são controlados,
  o CPF aceita 11 dígitos ou máscara, é normalizado no servidor e o primeiro erro
  recebe destaque, mensagem local e foco sem apagar os demais dados.
- Registrado em 28/08/2026 durante o teste Sandbox de compra duplicada.
- Problema: ao enviar o formulário com CPF inválido, o checkout perde todos os dados
  preenchidos pela dupla. A pessoa precisa preencher o formulário inteiro novamente,
  embora somente o CPF precise de correção.
- Resultado esperado: preservar os dados digitados e marcar apenas o campo de CPF
  inválido em vermelho, com mensagem próxima ao campo. Aceitar CPF tanto só com
  números quanto formatado, por exemplo `52998224725` e `529.982.247-25`,
  normalizando-o internamente antes da validação e do envio.
- Critério de UX: erros de validação não podem apagar dados válidos nem voltar a
  etapa anterior; o foco deve ir para o primeiro campo inválido e a pessoa deve
  conseguir corrigir somente ele.

## Ingressos: mostrar nome do atleta, nunca e-mail como identificação

- Status: **concluído**. Novas compras e alterações recusam e-mail no campo de nome;
  cards e detalhes sanitizam dados históricos e usam **Atleta não informado** quando
  não existe nome público válido.
- Registrado em 28/08/2026 no detalhe de ingresso da categoria `Teste duplicidade`.
- Problema: em alguns ingressos, o cabeçalho mostra o e-mail no lugar do nome de um
  atleta, enquanto o outro participante aparece corretamente pelo nome.
- Resultado esperado: em cartões, cabeçalhos, QR/credencial, Minhas compras e telas
  de detalhe, usar sempre `comprador_nome` e `parceiro_nome` como identificação
  pública. O e-mail só deve aparecer em contexto explícito de contato ou entrega.
- Critério de UX: quando o nome estiver ausente em dado histórico, mostrar um rótulo
  neutro como “Atleta não informado”; nunca fazer fallback visual para e-mail.
