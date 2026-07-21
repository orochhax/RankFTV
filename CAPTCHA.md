# CAPTCHA e protecao de autenticacao

O RankFTV usa Cloudflare Turnstile integrado ao Supabase Auth.

## Configuracao

1. Crie um widget em https://dash.cloudflare.com/ com os dominios locais e de producao.
2. Copie a site key para `NEXT_PUBLIC_TURNSTILE_SITE_KEY` na Vercel e no ambiente local.
3. No Supabase, abra `Authentication > Attack Protection` e habilite CAPTCHA.
4. Cole no Supabase a secret key do mesmo widget. A secret key nunca deve ir para o repositorio ou para uma variavel `NEXT_PUBLIC_*`.
5. Em `Authentication > Rate Limits`, confirme os limites de sign-in, sign-up, recuperacao e envio de e-mail.
6. Ative tambem a protecao contra senhas vazadas, se disponivel no plano.
7. Confirme em `Authentication > URL Configuration` que `/recuperar-senha/atualizar` esta entre as Redirect URLs.

## Onde aparece

- Cadastro: sempre exige verificacao.
- Recuperacao de senha: sempre exige verificacao antes do envio do e-mail.
- Login: sempre exige verificacao (nao ha mais o comportamento antigo de só pedir depois de tentativas falhas).

O token e temporario e e enviado ao Supabase em `options.captchaToken`, com reset do widget a cada tentativa que falha (token de uso unico). O frontend nunca conhece a secret key.

**Atencao (comportamento fail-open):** sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY` configurada, o componente `components/auth/Turnstile.tsx` nao renderiza nada e os formularios **nao exigem** captcha — eles simplesmente enviam a chamada sem `captchaToken`. Isso so continua funcionando se `Authentication > Attack Protection` no Supabase tambem estiver com CAPTCHA desligado; se o Supabase exigir captcha do lado do servidor e o frontend nao mandar token nenhum (site key ausente), login/cadastro/recuperacao de senha simplesmente **param de funcionar** para todo mundo, com erro generico. As duas configuracoes (site key aqui e o toggle no Supabase) precisam estar sincronizadas — nunca uma sem a outra.
