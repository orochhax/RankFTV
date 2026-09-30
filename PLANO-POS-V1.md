# Plano de evolução depois da V1

Atualizado em 04/09/2026. Este plano transforma a matriz de
`PESQUISA-CONCORRENTES.md` em hipóteses mensuráveis. Ele não antecipa módulos
grandes antes de a compra, o pagamento e a operação do evento estarem estáveis.

## Portões de estabilização

Uma nova frente só entra em desenvolvimento quando, por quatro semanas:

- checkout e webhooks não tiverem incidente crítico aberto;
- reembolso Pix e cartão estiver homologado e conciliado;
- entrega de e-mail, recuperação e check-in tiverem tendência monitorada;
- chamados e alertas P0/P1 tiverem responsável e SLA cumprido;
- houver volume suficiente para comparar conversão, abandono e suporte sem
  identificar atletas individualmente.

## Método de priorização

Cada hipótese recebe de 0 a 5 em: impacto na receita/retenção, frequência do
problema, vantagem específica para futevôlei, confiança dos dados e esforço
invertido. A ordem é definida por `(impacto + frequência + diferenciação +
confiança) / esforço`. Feedback isolado ajuda a formular a hipótese, mas não
substitui eventos do funil, chamados, entrevistas e observação da operação.

Revisão mensal: CEO analisa funil público, vendas, lista de espera, presença,
atrasos por quadra, entrega de e-mail, recuperações, reembolsos, alertas e casos
de suporte. A decisão e sua evidência ficam registradas neste arquivo.

## Sequência recomendada

### 1. Estabilidade e conversão

Otimizar descoberta, categoria e checkout com base no funil já instrumentado.
Atacar primeiro a etapa com maior abandono confirmado. Medir também ocupação da
lista de espera, conversão dos convites e tempo de check-in.

### 2. Operação esportiva e retenção

Validar com organizadores a visão por quadra, atrasos, placar público e avisos.
Depois, testar lembrete de próxima partida e seguir arena/circuito. Ranking só
entra como piloto privado de um circuito com regulamento, identidade e correção
auditável.

### 3. Arena comercial e assinaturas recorrentes

Começar por agenda, ocupação, turma, presença, fila e cobrança recorrente de uma
arena piloto. Antes de automatizar cobrança, definir cancelamento, reposição,
inadimplência, conciliação e comissão. Critérios: arena piloto comprometida,
processo manual observado e ganho de receita ou horas economizadas mensurável.

### 4. PWA ampliado

Ampliar a instalação somente se uso no dia do evento justificar: cache do
telão/placar, avisos e experiência de check-in resiliente. Não prometer offline
total sem sincronização idempotente testada em dois aparelhos.

### 5. Analytics avançado

Adicionar coortes, origem de venda, recorrência e relatório de patrocinador
apenas quando os eventos atuais forem confiáveis. Continuar com agregados e
limites mínimos de grupo; não expor CPF, e-mail ou comportamento individual.

### 6. Carteiras digitais

Apple Wallet e Google Wallet entram após obter e aprovar contas de emissor,
certificados e chaves oficiais. Até lá, o produto mantém ingresso protegido e
PDF individual, sem simular um passe não oficial.

## Hipóteses explicitamente adiadas

- marketplace genérico e rede social ampla;
- ranking nacional sem entidade responsável e regulamento;
- aplicativo nativo apenas para replicar páginas da web;
- automações financeiras sem conciliação e suporte comprovados.
