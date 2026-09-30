# Segredos e ambientes locais — RankFTV

Este documento define onde guardar configurações e credenciais sem colocar
valores secretos no Git, em documentação, prints, logs ou respostas.

## Matriz de arquivos

| Arquivo | Finalidade | Carregado automaticamente |
| --- | --- | --- |
| `.secrets.local` | Inventário local confidencial (arquivo em texto puro, não é um cofre criptografado) | Não |
| `.env.local` | Variáveis realmente usadas pela aplicação local padrão | Sim, pelo Next.js e scripts existentes |
| `.env.sandbox.local` | Sobrescritas do Supabase Sandbox para `npm run dev:sandbox` | Somente pelo script de Sandbox |
| `.env.example` | Lista pública de nomes, comentários e exemplos vazios | Não contém valores reais |

## Regras operacionais

1. Manter a cópia local de referência de cada credencial privada em
   `.secrets.local`, agrupada pelo fornecedor correspondente, somente em disco
   criptografado e conta protegida. Quando possível, migrar o inventário para um
   gerenciador de senhas ou cofre do sistema operacional.
2. Copiar para `.env.local` somente as variáveis necessárias para executar o
   ambiente local padrão. Esse arquivo não é um arquivo de backup.
3. Manter em `.env.sandbox.local` somente URL, chave publicável e chave secreta
   do Supabase Sandbox. O script carrega `.env.local` primeiro e o Sandbox por
   último, portanto as variáveis do Sandbox têm precedência.
4. Credenciais de produção usadas no deploy devem ser cadastradas também no
   armazenamento próprio do serviço responsável, como Vercel, GitHub Actions,
   Supabase ou provedor externo. O cofre local não publica variáveis sozinho.
5. Não transmitir credenciais privadas pela conversa. Inserir o valor
   diretamente no arquivo local ignorado ou no painel do provedor. Nunca incluir
   o valor em commit, issue, documentação, screenshot, relatório, log ou comando
   exibido.
6. Se uma chave privilegiada aparecer em local não destinado a segredos,
   rotacioná-la, atualizar os ambientes autorizados e invalidar a anterior.
7. Ao substituir uma chave, atualizar a mesma entrada no cofre e nos ambientes
   ativos; não manter chaves antigas sem uma justificativa de rollback e prazo
   explícito para remoção.

## Separação recomendada

- Valores `NEXT_PUBLIC_*` são públicos e podem chegar ao navegador. Nunca usar
  esse prefixo em chave administrativa, token de webhook ou chave de API
  privada.
- A chave publicável/anon do Supabase pertence aos clientes de navegador e de
  sessão, sempre protegidos por RLS.
- A chave secreta/service role do Supabase ignora RLS e só pode ser usada em
  código marcado como servidor.
- `SUPABASE_ACCESS_TOKEN` é um token pessoal de gerenciamento: fica somente em
  `.secrets.local` e na variável de ambiente local usada pelo MCP do Codex. O
  MCP permanece limitado por `project_ref` ao Sandbox; esse token não entra no
  app, no Git ou nos ambientes de deploy.
- Senhas de banco, Asaas, Resend, OpenAI, segredos de cron, webhook, HMAC e
  observabilidade são sempre privadas.
- Credenciais E2E devem pertencer somente ao Sandbox e não devem autorizar
  mutações em produção.

Todos os arquivos reais citados acima já estão cobertos pelo `.gitignore`, com
exceção intencional de `.env.example`, que deve permanecer sem valores reais.
