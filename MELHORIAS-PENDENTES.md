# Melhorias pendentes

Itens abaixo não bloqueiam o lançamento da V1. Devem ser priorizados depois do lançamento conforme uso real, incidentes e chamados de suporte.

## Segurança e acesso às credenciais

- [ ] Trocar o token presente na URL por uma sessão curta em cookie `HttpOnly`, redirecionando depois para uma URL limpa.
- [ ] Criar ação segura para invalidar e reenviar uma credencial individual quando o atleta perder ou compartilhar indevidamente o link.
- [ ] Exibir ao comprador e ao suporte um histórico de emissão, reenvio, rotação e uso das duas credenciais, sem mostrar os tokens.

## Operação de e-mails

- [ ] Criar uma tela operacional para acompanhar entregas pendentes ou falhas e permitir nova tentativa controlada.
- [ ] Adicionar métricas de tempo de entrega, rejeição, bounce e reclamação por provedor de e-mail.

## Experiência do atleta

- [ ] Avaliar download opcional da credencial individual em PDF, mantendo o link online como fonte principal e atualizada.
- [ ] Avaliar integração com Apple Wallet e Google Wallet para guardar a credencial individual no celular.

Os itens concluídos continuam removidos. O histórico das implementações e validações permanece registrado no Git.
