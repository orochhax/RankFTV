// Regras puras de elegibilidade de inscrição em campeonato — extraídas de
// app/campeonatos/[id]/inscrever/actions.ts pra dar pra testar sem precisar
// de um banco de verdade (o projeto não tem harness de teste de integração
// contra Supabase; ver AUDITORIA-PRODUCAO.md). A ação sempre busca os
// valores de entrada (genero, rating, cpf salvo) do banco antes de chamar
// essas funções — nunca de FormData.

export type PerfilElegibilidade = {
  genero: string | null;
  rating: number | null;
};

export type CategoriaElegibilidade = {
  genero: string; // "masculino" | "feminino" | "mista"
  corteRatingMin: number;
  corteRatingMax: number;
};

export type ResultadoElegibilidade = { ok: true } | { ok: false; error: string };

/**
 * Categoria "mista" aceita qualquer gênero. Categoria "masculino"/"feminino"
 * exige perfil com o mesmo gênero preenchido (perfil sem gênero, ou "outro",
 * não se encaixa em nenhuma categoria de gênero fechado — precisa completar
 * o perfil primeiro).
 *
 * Quando o campeonato usa o motor de categoria (organizador pode desligar
 * pra deixar as categorias abertas independente de rating):
 *  - rating 0 (perfil nunca respondeu o questionário de nível) é bloqueado
 *    ANTES de checar o corte — sem isso, um perfil nunca avaliado passava
 *    livre em qualquer categoria com corte_rating_min = 0, sem nunca ter
 *    respondido o questionário que o organizador pediu.
 *  - com rating > 0, aplica o corte normal da categoria.
 */
export function checarElegibilidadeCategoria(
  perfil: PerfilElegibilidade,
  categoria: CategoriaElegibilidade,
  motorLigado: boolean,
): ResultadoElegibilidade {
  if (categoria.genero !== "mista") {
    if (!perfil.genero || perfil.genero === "outro") {
      return { ok: false, error: "Complete seu gênero no perfil para se inscrever nesta categoria." };
    }
    if (perfil.genero !== categoria.genero) {
      return { ok: false, error: `Esta categoria é restrita ao gênero ${categoria.genero}.` };
    }
  }

  if (motorLigado) {
    const rating = perfil.rating ?? 0;
    if (rating === 0) {
      return {
        ok: false,
        error: "Responda o questionário de nível no seu perfil antes de se inscrever neste campeonato.",
      };
    }
    if (rating < categoria.corteRatingMin || rating > categoria.corteRatingMax) {
      return { ok: false, error: "Seu rating atual não se enquadra no corte desta categoria." };
    }
  }

  return { ok: true };
}

/** CPF salvo no perfil sempre vence sobre o que veio do formulário — senão
 *  um CPF forjado no FormData sobrescreveria silenciosamente o CPF real já
 *  vinculado à conta (usado no cadastro do cliente Asaas). */
export function resolverCpfInscricao(cpfSalvo: string, cpfInput: string): string {
  return cpfSalvo || cpfInput || "";
}

export function podeConvidarComoParceiro(parceiroId: string, meuId: string): ResultadoElegibilidade {
  if (parceiroId === meuId) {
    return { ok: false, error: "Você não pode convidar a si mesmo como parceiro." };
  }
  return { ok: true };
}
