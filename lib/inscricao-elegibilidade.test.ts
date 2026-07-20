import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  checarElegibilidadeCategoria, resolverCpfInscricao, podeConvidarComoParceiro,
} from "@/lib/inscricao-elegibilidade";

describe("checarElegibilidadeCategoria (gênero e rating vêm do perfil, nunca do FormData)", () => {
  const categoriaAberta = { genero: "mista", corteRatingMin: 0, corteRatingMax: 9999 };

  test("categoria mista aceita qualquer gênero, mesmo perfil sem gênero preenchido", () => {
    const r = checarElegibilidadeCategoria({ genero: null, rating: 0 }, categoriaAberta, true);
    assert.equal(r.ok, true);
  });

  test("categoria masculina bloqueia perfil feminino", () => {
    const r = checarElegibilidadeCategoria(
      { genero: "feminino", rating: 0 },
      { genero: "masculino", corteRatingMin: 0, corteRatingMax: 9999 },
      true,
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /restrita ao gênero masculino/);
  });

  test("categoria feminina aceita perfil feminino", () => {
    const r = checarElegibilidadeCategoria(
      { genero: "feminino", rating: 0 },
      { genero: "feminino", corteRatingMin: 0, corteRatingMax: 9999 },
      true,
    );
    assert.equal(r.ok, true);
  });

  test("perfil sem gênero (nunca preenchido) é bloqueado em categoria fechada", () => {
    const r = checarElegibilidadeCategoria(
      { genero: null, rating: 0 },
      { genero: "masculino", corteRatingMin: 0, corteRatingMax: 9999 },
      true,
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /Complete seu gênero/);
  });

  test("perfil com gênero 'outro' é bloqueado em categoria fechada (não é masculino nem feminino)", () => {
    const r = checarElegibilidadeCategoria(
      { genero: "outro", rating: 0 },
      { genero: "feminino", corteRatingMin: 0, corteRatingMax: 9999 },
      true,
    );
    assert.equal(r.ok, false);
  });

  test("rating abaixo do corte mínimo é bloqueado quando o motor está ligado", () => {
    const r = checarElegibilidadeCategoria(
      { genero: "masculino", rating: 1000 },
      { genero: "masculino", corteRatingMin: 1500, corteRatingMax: 9999 },
      true,
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /rating atual não se enquadra/);
  });

  test("rating acima do corte máximo é bloqueado (evita sandbagging na categoria de entrada)", () => {
    const r = checarElegibilidadeCategoria(
      { genero: "masculino", rating: 3000 },
      { genero: "masculino", corteRatingMin: 0, corteRatingMax: 1500 },
      true,
    );
    assert.equal(r.ok, false);
  });

  test("rating dentro do corte passa", () => {
    const r = checarElegibilidadeCategoria(
      { genero: "masculino", rating: 1200 },
      { genero: "masculino", corteRatingMin: 1000, corteRatingMax: 1500 },
      true,
    );
    assert.equal(r.ok, true);
  });

  test("rating nulo/zero (perfil nunca avaliado) só passa na categoria de corte mínimo 0", () => {
    const semAvaliacao = { genero: "masculino", rating: null };
    assert.equal(
      checarElegibilidadeCategoria(semAvaliacao, { genero: "masculino", corteRatingMin: 0, corteRatingMax: 1500 }, true).ok,
      true,
    );
    assert.equal(
      checarElegibilidadeCategoria(semAvaliacao, { genero: "masculino", corteRatingMin: 1500, corteRatingMax: 9999 }, true).ok,
      false,
    );
  });

  test("motor de categoria desligado (usa_motor_categoria=false): corte de rating não é aplicado", () => {
    const r = checarElegibilidadeCategoria(
      { genero: "masculino", rating: 5 },
      { genero: "masculino", corteRatingMin: 1500, corteRatingMax: 9999 },
      false,
    );
    assert.equal(r.ok, true);
  });

  test("motor desligado não afeta o corte de gênero (sempre vale)", () => {
    const r = checarElegibilidadeCategoria(
      { genero: "feminino", rating: 0 },
      { genero: "masculino", corteRatingMin: 0, corteRatingMax: 9999 },
      false,
    );
    assert.equal(r.ok, false);
  });
});

describe("resolverCpfInscricao (CPF salvo no perfil sempre vence sobre o do FormData)", () => {
  test("CPF salvo presente: ignora o que veio do formulário, mesmo que diferente", () => {
    assert.equal(resolverCpfInscricao("11122233344", "99988877766"), "11122233344");
  });

  test("sem CPF salvo: usa o do formulário (primeira inscrição paga)", () => {
    assert.equal(resolverCpfInscricao("", "11122233344"), "11122233344");
  });

  test("nenhum dos dois: string vazia", () => {
    assert.equal(resolverCpfInscricao("", ""), "");
  });
});

describe("podeConvidarComoParceiro (bloqueia autoconvite)", () => {
  test("convidar a si mesmo é bloqueado", () => {
    const r = podeConvidarComoParceiro("user-1", "user-1");
    assert.equal(r.ok, false);
  });

  test("convidar outro usuário é permitido", () => {
    const r = podeConvidarComoParceiro("user-2", "user-1");
    assert.equal(r.ok, true);
  });
});
