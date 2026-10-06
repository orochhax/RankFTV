# Planejador pessoal da mudança para Portugal

Página pessoal dentro do painel ADM, disponível em `/admin/mudanca-portugal`.
O acesso exige a mesma conta CEO dona dos módulos pessoais (`ADMIN_EMAIL` e
`profiles.role = 'ceo'`). A rota também informa aos buscadores que não deve ser
indexada.

## Executar no VS Code

1. Abra a pasta do projeto no VS Code e instale as dependências com `npm ci`.
2. Configure o `.env.local` conforme o `.env.example`, incluindo as variáveis
   necessárias para autenticação do Supabase.
3. No terminal integrado, execute `npm run dev`.
4. Abra `http://localhost:3000/admin/mudanca-portugal` e entre com a conta CEO.

## Uso e armazenamento

- As tarefas e os gastos podem ser criados, editados e excluídos. Tarefas também
  podem ser concluídas e reabertas.
- Os alertas de vencimento aparecem em amarelo entre 6 e 10 dias; vencimentos
  em até 5 dias e vencidos aparecem em vermelho. Tarefas concluídas não exibem
  alertas.
- Gastos mantêm BRL ou EUR como moeda original. A cotação `1 EUR = X BRL` é
  editável e os totais convertidos são atualizados imediatamente.
- Os dados ficam no `localStorage` com a chave versionada
  `rankftv:personal-portugal-move:v1`. Eles permanecem neste navegador e
  dispositivo após atualização, mas não são sincronizados entre aparelhos nem
  restaurados ao limpar os dados do navegador.

Essa página é independente dos fluxos de campeonatos. Ela não salva tarefas ou
despesas no banco do RankFTV.
