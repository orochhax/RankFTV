import assert from "node:assert/strict";
import test from "node:test";
import {
  isAppNavItemActive,
  visibleAppNavItems,
} from "../components/shell/app-nav-items";
import { resolveComprasTab } from "./minhas-compras";

const basePermissions = {
  isLoggedIn: false,
  isOrganizer: false,
  isArenaOwner: false,
  isStaff: false,
  isAdmin: false,
};

test("visitante vê consulta de ingresso, mas não a área privada de compras", () => {
  const labels = visibleAppNavItems(basePermissions).map((item) => item.label);
  assert.ok(labels.includes("Consultar ingresso"));
  assert.ok(!labels.includes("Minhas compras"));
  assert.ok(!labels.includes("Minhas inscrições"));
});

test("usuário autenticado vê apenas a entrada unificada Minhas compras", () => {
  const items = visibleAppNavItems({ ...basePermissions, isLoggedIn: true });
  const labels = items.map((item) => item.label);
  assert.ok(labels.includes("Minhas compras"));
  assert.ok(!labels.includes("Consultar ingresso"));
  assert.ok(!labels.includes("Meus ingressos"));
  assert.ok(!labels.includes("Minhas inscrições"));

  const compras = items.find((item) => item.key === "compras");
  assert.ok(compras);
  assert.equal(isAppNavItemActive("/minhas-compras", compras), true);
  assert.equal(isAppNavItemActive("/minhas-inscricoes/camp-1", compras), true);
  assert.equal(isAppNavItemActive("/meus-ingressos", compras), true);
});

test("aba inicial respeita a URL e prioriza a seção que possui compras", () => {
  assert.equal(resolveComprasTab("plateia", 3, 0), "plateia");
  assert.equal(resolveComprasTab(undefined, 2, 1), "atleta");
  assert.equal(resolveComprasTab(undefined, 0, 1), "plateia");
  assert.equal(resolveComprasTab(undefined, 0, 0), "atleta");
});
