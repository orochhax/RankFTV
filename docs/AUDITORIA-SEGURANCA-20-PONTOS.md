# Auditoria dos 20 pontos de segurança

Revisão realizada em 08/09/2026 sobre o código, configurações, SQLs e
dependências do RankFTV. A lista do vídeo é um bom ponto de partida, mas não
substitui teste de autorização no banco, homologação e monitoramento.

Legenda: **OK** = controle presente; **parcial** = há proteção, mas existe
trabalho pendente; **P0** = antes de pagamentos reais; **P1/P2** = estabilização
ou endurecimento posterior.

| # | Controle | Estado no RankFTV | Decisão |
| --- | --- | --- | --- |
| 1 | Esconder API keys | Parcial/P0 | Chaves públicas estão corretamente separadas. Segredos são server-only e ignorados pelo Git. A chave secreta do Sandbox enviada na conversa deve ser rotacionada novamente. |
| 2 | Limpar secrets do Git | OK | A varredura do estado atual e do histórico não encontrou padrões de segredo rastreados. Manter secret scanning e nunca colar segredos em chat, issue, print ou log. |
| 3 | “Public key DB” | OK | A publishable key do Supabase pode estar no navegador. Ela não protege dados; RLS e grants mínimos protegem. Secret/service role continua apenas no servidor. |
| 4 | Ativar RLS | Parcial/P0 | Há RLS e hardening extensos, mas SQLs históricos não provam o estado remoto. Executar o check consolidado no Sandbox e depois em produção. |
| 5 | Criptografia de dados | Parcial/P1 | Trânsito usa HTTPS e o provedor cifra infraestrutura/backups. CPF, e-mail e dados operacionais dependem de RLS; revisar minimização/retenção e cifrar backups exportados e o inventário local de segredos. |
| 6 | Auth server-side | OK | Supabase SSR/PKCE e validação server-side são usados. Operações sensíveis revalidam usuário no servidor. |
| 7 | Restringir acessos | Parcial/P0 | Há checagem de papel, dono do recurso e RLS. Falta concluir a matriz automática de autorização das ações críticas e confirmar o banco remoto. |
| 8 | Bloquear mass assignment | Parcial/P0 | Os fluxos novos usam schemas estritos ou payloads explícitos. Ainda faltam schemas runtime em autenticação, criação de pagamento e ações financeiras restantes. |
| 9 | Proteger cookies | OK com ressalva | `SameSite=Lax` vem do Supabase SSR e agora `Secure` é explícito em produção. `HttpOnly=false` é o modelo documentado do Supabase para sessão compartilhada com o cliente; CSP reduz o risco de XSS. |
| 10 | Hash de senhas | OK | Senhas ficam no Supabase Auth; o aplicativo não guarda nem cria hash próprio. OTPs próprios são persistidos como hash. |
| 11 | Rate limit | Parcial/P1 | Recuperação, busca, checkout e mutações sensíveis já têm limite fail-closed. Nesta revisão, polling de ingressos/credenciais e consulta de CEP também foram limitados. Ajustar limites após teste de carga e avaliar WAF. |
| 12 | Bot protection | Parcial/P1 | Turnstile está ativo em login, cadastro e recuperação, validado pelo Supabase Auth. Checkouts têm rate limit e anti-card-testing; acompanhar abuso real antes de ampliar CAPTCHA. |
| 13 | Queries parametrizadas | OK | O app usa Supabase/PostgREST e RPCs com parâmetros tipados; não foi encontrada montagem de SQL com entrada do usuário no runtime. |
| 14 | Validação dos inputs | Parcial/P0 | Existem Zod, allowlists, limites e validações de negócio, mas a cobertura das superfícies críticas ainda não está completa. Validação de navegador nunca é considerada suficiente. |
| 15 | Evitar vazamento de conteúdo | Parcial/P0 | Rotas públicas relevantes usam respostas genéricas e `no-store`. O download de workspace deixou de devolver erro interno nesta revisão. Ainda há ações administrativas que devolvem `error.message`; priorizar pagamentos e dados pessoais. |
| 16 | Restringir uploads | Parcial/P1 | Buckets têm dono/papel, tamanho e MIME permitido, nomes gerados e suporte privado. Falta validar assinatura/conteúdo real do arquivo e, para PDF, considerar quarentena/antimalware. |
| 17 | Reduzir respostas de API | OK com ressalva | APIs públicas selecionam colunas explícitas e respostas privadas usam `no-store`. Os `select('*')` restantes estão principalmente na área pessoal/CEO; reduzir gradualmente. |
| 18 | Security headers | OK | CSP com nonce, `nosniff`, anti-frame, referrer/permissions policy e HSTS estão configurados. `style-src 'unsafe-inline'` permanece como dívida P2. |
| 19 | Forçar HTTPS | OK | A Vercel serve HTTPS; produção também usa HSTS e `upgrade-insecure-requests`. Confirmar o domínio final no smoke de produção. |
| 20 | Scan de dependências | OK | `npm audit` completo e de produção retornaram zero vulnerabilidades em 08/09/2026; CI e Dependabot já executam acompanhamento. |

## Alterações feitas nesta revisão

- Polling de status de ingresso passou de `GET` com token na URL para `POST`
  com corpo JSON, evitando cópias adicionais do token em logs e histórico.
- Rate limit fail-closed foi adicionado ao polling de ingresso, credencial
  individual e consulta de CEP.
- IDs desses endpoints passaram por schema Zod estrito.
- Cookies de sessão ganharam `Secure` explícito em produção.
- Erros internos do download de workspace não são mais devolvidos ao cliente.
- Foi preparada uma migration para remover o grant anônimo desnecessário de
  `credentials` e uma verificação somente de leitura da postura real do banco.

## Limites desta auditoria

Uma revisão estática não confirma o estado do Supabase remoto nem demonstra
que uma policy bloqueia todos os casos negativos. Antes do lançamento, executar
`supabase/manual-tests/security-posture-check.sql`, revisar cada lista não vazia,
consultar o Security Advisor e transformar os controles críticos em pgTAP.
