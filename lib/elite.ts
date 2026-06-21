// Constantes do plano Elite — seguro pra client e server (sem dependências).
//
// Modelo de cobrança: o organizador NÃO paga nada na ativação. O valor da
// ativação vira uma "dívida" do campeonato (championships.premium_fee_pendente)
// que é descontada automaticamente dos repasses das inscrições pagas, até quitar.

/** Preço único de ativação do Elite por campeonato (descontado dos repasses). */
export const PRECO_ELITE = 178;
