# Melhorias pendentes de UX

Itens observados durante a homologação. Não são alterações de P0 nem devem ser
implementados sem uma solicitação explícita de pacote de melhorias.

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
