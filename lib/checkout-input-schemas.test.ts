import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticatedRegistrationCoreSchema,
  guestAthleteCheckoutCoreSchema,
  spectatorCheckoutSchema,
} from "./checkout-input-schemas";

test("cadastro autenticado restringe ids, pagamento, camisa e campos livres", () => {
  assert.equal(authenticatedRegistrationCoreSchema.safeParse({
    championshipId: crypto.randomUUID(),
    categoryId: crypto.randomUUID(),
    parceiroUsername: "atleta.teste",
    cpfInput: "123.456.789-09",
    metodo: "pix",
    tamanhoCamisa: "M",
    cupomCodigo: "COPA10",
    legalAccepted: true,
  }).success, true);
  assert.equal(authenticatedRegistrationCoreSchema.safeParse({
    championshipId: "1", categoryId: "2", parceiroUsername: "<script>",
    cpfInput: "abc", metodo: "boleto", tamanhoCamisa: "qualquer", cupomCodigo: "",
  }).success, false);
});

test("pedido de plateia limita itens e quantidade antes do banco", () => {
  const base = {
    championshipId: crypto.randomUUID(), nome: "Pessoa Teste",
    email: "pessoa@example.com", cpf: "12345678909", cupomCodigo: "", legalAccepted: true,
  };
  assert.equal(spectatorCheckoutSchema.safeParse({
    ...base, items: [{ ticketTypeId: crypto.randomUUID(), qty: 2 }],
  }).success, true);
  assert.equal(spectatorCheckoutSchema.safeParse({
    ...base, items: [{ ticketTypeId: crypto.randomUUID(), qty: 21 }],
  }).success, false);
});

test("checkout avulso de atleta aceita as escolhas exibidas Pix e cartao", () => {
  const checkout = {
    championshipId: crypto.randomUUID(),
    categoryId: crypto.randomUUID(),
    categoriaNome: "Dupla masculina",
    usarMesmoEmail: false,
    nome: "Bruno Teste",
    cpf: "52998224725",
    email: "bruno@example.com",
    emailConfirmacao: "bruno@example.com",
    zap: "71999991001",
    genero: "masculino",
    nascimento: null,
    camisa: null,
    parceiroNome: "Lucas Teste",
    parceiroCpf: "11144477735",
    parceiroEmail: "lucas@example.com",
    parceiroEmailConfirmacao: "lucas@example.com",
    parceiroZap: "71999991002",
    parceiroGenero: "masculino",
    parceiroCamisa: null,
    cupomCodigo: "",
    legalAccepted: true,
  };

  assert.equal(guestAthleteCheckoutCoreSchema.safeParse({
    ...checkout,
    metodoPagamento: "pix",
  }).success, true);
  assert.equal(guestAthleteCheckoutCoreSchema.safeParse({
    ...checkout,
    metodoPagamento: "cartao",
  }).success, true);
  assert.equal(guestAthleteCheckoutCoreSchema.safeParse({
    ...checkout,
    metodoPagamento: "boleto",
  }).success, false);
});

test("checkouts recusam compra sem aceite legal explicito", () => {
  const registration = {
    championshipId: crypto.randomUUID(),
    categoryId: crypto.randomUUID(),
    parceiroUsername: "",
    cpfInput: "12345678909",
    metodo: "pix",
    tamanhoCamisa: "M",
    cupomCodigo: "",
  };
  assert.equal(authenticatedRegistrationCoreSchema.safeParse(registration).success, false);

  const spectator = {
    championshipId: crypto.randomUUID(),
    nome: "Pessoa Teste",
    email: "pessoa@example.com",
    cpf: "12345678909",
    cupomCodigo: "",
    items: [{ ticketTypeId: crypto.randomUUID(), qty: 1 }],
  };
  assert.equal(spectatorCheckoutSchema.safeParse(spectator).success, false);
});
