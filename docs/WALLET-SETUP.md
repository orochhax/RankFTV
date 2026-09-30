# Preparação de Apple Wallet e Google Wallet

Status em 04/09/2026: bloqueado por cadastros, aprovação e credenciais externas.
O RankFTV continua oferecendo o link protegido e o PDF individual. Não exibir
um botão de carteira antes de um passe real e verificável estar homologado.

## Apple Wallet

1. Inscrever o responsável no Apple Developer Program.
2. Criar um Pass Type ID para o RankFTV e emitir seu certificado.
3. Exportar certificado e chave privada separadamente, além do certificado
   intermediário WWDR. Guardá-los somente como secrets do servidor.
4. Configurar `APPLE_WALLET_PASS_TYPE_ID`, `APPLE_WALLET_TEAM_ID`,
   `APPLE_WALLET_CERTIFICATE_BASE64`, `APPLE_WALLET_PRIVATE_KEY_BASE64` e
   `APPLE_WALLET_WWDR_CERTIFICATE_BASE64`.
5. Implementar e testar o pacote `.pkpass` assinado, incluindo atualização e
   invalidação quando o ingresso for substituído, estornado ou usado.

Referência oficial: <https://developer.apple.com/documentation/walletpasses/building-a-pass>

## Google Wallet

1. Criar a conta de emissor na Google Pay & Wallet Console.
2. Habilitar a Google Wallet API no projeto Google Cloud e criar uma service
   account exclusiva, adicionada como Developer na conta de emissor.
3. Criar a classe de ingresso, testar no modo Demo e solicitar publishing
   access.
4. Configurar `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_CLASS_ID` e
   `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` somente como secrets do servidor.
5. Implementar o objeto por credencial e o link JWT assinado, sincronizando
   substituição, estorno e check-in.

Referências oficiais:

- <https://developers.google.com/wallet/generic/getting-started/issuer-onboarding>
- <https://developers.google.com/wallet/generic/getting-started/auth/rest>
- <https://developers.google.com/wallet/generic/web>

## Critérios para marcar a melhoria como concluída

- passes reais adicionados em iPhone e Android físicos;
- nenhuma chave enviada ao navegador, Git ou logs;
- QR da carteira validado pelo mesmo backend idempotente do ingresso;
- credencial antiga deixa de funcionar após proteção ou estorno;
- nome, evento, categoria, data e local atualizam corretamente;
- testes de acesso negado e procedimentos de rotação das chaves registrados.
