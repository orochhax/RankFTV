import assert from "node:assert/strict";
import test from "node:test";
import { isNavItemActive, visibleBottomNavItems } from "../components/navbar/nav-items";

test("Minhas compras aparece diretamente na navbar mobile somente para usuário autenticado", () => {
  const guestHrefs = visibleBottomNavItems({ isLoggedIn: false, isOrganizer: false })
    .map((item) => item.href);
  const authenticatedHrefs = visibleBottomNavItems({ isLoggedIn: true, isOrganizer: false })
    .map((item) => item.href);

  assert.ok(!guestHrefs.includes("/minhas-compras"));
  assert.ok(authenticatedHrefs.includes("/minhas-compras"));
  assert.ok(authenticatedHrefs.includes("/"));
  assert.ok(authenticatedHrefs.includes("/arenas"));
  assert.ok(authenticatedHrefs.includes("/perfil"));
});

test("atalho mobile de Minhas compras usa a mesma rota e recebe estado ativo", () => {
  assert.equal(isNavItemActive("/minhas-compras", "/minhas-compras"), true);
  assert.equal(isNavItemActive("/minhas-compras/detalhe", "/minhas-compras"), true);
  assert.equal(isNavItemActive("/campeonatos/camp-1", "/minhas-compras"), false);
});

test("atalho atual do Painel continua condicionado ao organizador", () => {
  const athleteHrefs = visibleBottomNavItems({ isLoggedIn: true, isOrganizer: false })
    .map((item) => item.href);
  const organizerHrefs = visibleBottomNavItems({ isLoggedIn: true, isOrganizer: true })
    .map((item) => item.href);

  assert.ok(!athleteHrefs.includes("/painel"));
  assert.ok(organizerHrefs.includes("/painel"));
});
