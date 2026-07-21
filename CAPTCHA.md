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
- Login: aparece depois de tres falhas consecutivas na mesma sessao do navegador.

O token e temporario e e enviado ao Supabase em `options.captchaToken`. O frontend nunca conhece a secret key. Sem a site key configurada, os formularios protegidos permanecem bloqueados e exibem uma mensagem de configuracao, evitando que a protecao seja acidentalmente desativada em producao.
