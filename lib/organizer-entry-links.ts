// Destino de "criar campeonato" / "cadastrar arena" a partir de pontos de
// entrada rápidos (menu "+" da sidebar desktop, seletor de persona da Home).
// Regra única, reaproveitada nos dois lugares pra não divergir:
//  - visitante não autenticado sempre vê a landing pública do Painel
//    primeiro (/painel), nunca o formulário real;
//  - usuário autenticado segue direto pro fluxo real — que já tem sua
//    própria proteção/redirecionamento server-side pra onboarding
//    (organizer_accounts.habilitado / arena existente), então não precisa
//    de uma segunda checagem de permissão aqui no client.
export function criarCampeonatoHref(isLoggedIn: boolean): string {
  return isLoggedIn ? "/painel/novo-campeonato" : "/painel";
}

export function cadastrarArenaHref(isLoggedIn: boolean): string {
  return isLoggedIn ? "/perfil/ativar-arena" : "/painel?tab=arena";
}
