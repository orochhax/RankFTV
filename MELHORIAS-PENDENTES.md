# Melhorias pendentes de UX

Itens observados durante a homologação. Não são alterações de P0 nem devem ser
implementados sem uma solicitação explícita de pacote de melhorias.

## Navegação nas telas de ingresso e reembolso

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
