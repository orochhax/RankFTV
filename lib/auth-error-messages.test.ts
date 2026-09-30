import assert from "node:assert/strict";
import test from "node:test";
import { passwordUpdateErrorMessage } from "./auth-error-messages";

test("troca de senha explica quando a senha nova repete a atual", () => {
  assert.equal(
    passwordUpdateErrorMessage({ code: "same_password" }),
    "A nova senha precisa ser diferente da senha atual.",
  );
});

test("troca de senha preserva mensagem segura para erros desconhecidos", () => {
  assert.equal(
    passwordUpdateErrorMessage({ code: "unexpected_failure" }),
    "Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo.",
  );
});
