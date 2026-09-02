# Melhorias pendentes

Itens abaixo não bloqueiam o lançamento da V1. Devem ser priorizados depois do lançamento conforme uso real, incidentes e chamados de suporte.

## Segurança e acesso às credenciais

- [ ] Trocar o token presente na URL por uma sessão curta em cookie `HttpOnly`, redirecionando depois para uma URL limpa.
- [ ] Criar ação segura para invalidar e reenviar uma credencial individual quando o atleta perder ou compartilhar indevidamente o link.
- [ ] Exibir ao comprador e ao suporte um histórico de emissão, reenvio, rotação e uso das duas credenciais, sem mostrar os tokens.

## Operação de e-mails

- [ ] Criar uma tela operacional para acompanhar entregas pendentes ou falhas e permitir nova tentativa controlada.
- [ ] Adicionar métricas de tempo de entrega, rejeição, bounce e reclamação por provedor de e-mail.

## Central de suporte administrativo

- [ ] Exibir na central exclusiva do CEO o histórico cronológico de auditoria, rotações, entregas e check-ins de cada ingresso.
- [ ] Adicionar reenvio controlado de credencial sem alterar identidade, com limite, motivo e registro de entrega.
- [ ] Adicionar invalidação emergencial de uma credencial comprometida, com confirmação reforçada e aviso ao titular.
- [ ] Criar uma fila de casos de suporte com estado (`aberto`, `aguardando prova`, `resolvido`), responsável e notas sem anexar documentos sensíveis desnecessários.
- [ ] Integrar os casos de estorno Pix pendente e falhas de e-mail à central, mantendo aprovação humana e sem coletar dados bancários por WhatsApp ou e-mail.
- [ ] Definir retenção e acesso para provas de identidade/pagamento. Não armazenar documento completo se uma confirmação mínima e auditável resolver o caso.

## Experiência do atleta

- [ ] Avaliar download opcional da credencial individual em PDF, mantendo o link online como fonte principal e atualizada.
- [ ] Avaliar integração com Apple Wallet e Google Wallet para guardar a credencial individual no celular.

## Painel de check-in

- [ ] Reorganizar os indicadores do topo em dois grupos. Atletas: `Total de atletas` (quantidade individual de inscritos), `Atletas presentes` e `Atletas pendentes`. Duplas: `Duplas totais`, `Duplas pendentes` (zero ou somente um integrante presente) e `Duplas confirmadas` (dois integrantes presentes). As contagens devem atualizar automaticamente após cada check-in.
- [ ] Substituir os blocos repetidos da lista de presença por uma única linha compacta por dupla, no formato `Carlos Rocha + Julia Veronia    1/2`. Exibir cada nome individualmente em azul quando o atleta já chegou e em cinza enquanto estiver pendente; manter também um ícone ou texto de estado para não depender somente da cor. Usar `0/2`, `1/2` e `2/2` como resumo da chegada da dupla.
- [ ] Ajustar os filtros da lista compacta para `Todas`, `Pendentes` e `Confirmadas`, considerando como confirmada somente a dupla com `2/2`. Se horários e detalhes individuais ainda forem necessários, mostrá-los ao tocar/expandir a linha, sem repetir permanentemente duas linhas de atleta abaixo de cada dupla.
- [ ] Validar o novo painel no celular: nomes longos devem truncar ou quebrar de forma legível, o contador precisa permanecer visível e a lista não pode ficar escondida pela navegação inferior.

Os itens concluídos continuam removidos. O histórico das implementações e validações permanece registrado no Git.
