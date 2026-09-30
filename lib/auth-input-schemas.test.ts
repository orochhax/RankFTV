import assert from "node:assert/strict";
import test from "node:test";
import {
  loginInputSchema,
  passwordUpdateInputSchema,
  signupInputSchema,
} from "./auth-input-schemas";

test("autenticacao limita formatos antes de chamar o Supabase Auth", () => {
  assert.equal(loginInputSchema.safeParse({
    email: "atleta@example.com", password: "senha", captchaToken: null,
  }).success, true);
  assert.equal(signupInputSchema.safeParse({
    nome: "Atleta Teste", email: "atleta@example.com", password: "Senha-123",
    username: "atleta.teste", genero: "outro", captchaToken: "token-seguro",
    organizer: null,
  }).success, true);
  assert.equal(signupInputSchema.safeParse({
    nome: "A", email: "invalido", password: "123", username: "<admin>",
    genero: "admin", captchaToken: "x", organizer: null,
  }).success, false);
});

test("troca de senha exige confirmação idêntica e tamanho limitado", () => {
  assert.equal(passwordUpdateInputSchema.safeParse({
    password: "NovaSenha-123", confirmation: "NovaSenha-123",
  }).success, true);
  assert.equal(passwordUpdateInputSchema.safeParse({
    password: "NovaSenha-123", confirmation: "OutraSenha-123",
  }).success, false);
});
