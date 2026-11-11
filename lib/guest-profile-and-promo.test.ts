import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("/perfil renderiza visão deslogada com login e cadastro quando !user", () => {
  const perfilPage = source("app/perfil/page.tsx");
  const guestView = source("components/perfil/PerfilVisitanteView.tsx");
  const bottomNav = source("components/navbar/nav-items.ts");

  assert.match(bottomNav, /\{\s*href:\s*"\/perfil",\s*label:\s*"Perfil",\s*icon:\s*User\s*\}/);
  assert.match(perfilPage, /if \(!user\) \{\s*return <PerfilVisitanteView \/>;/);
  assert.doesNotMatch(perfilPage, /if \(!user\)\s*redirect\("\/login"\)/);
  assert.match(guestView, /Você está deslogado/);
  assert.match(guestView, /href="\/login\?next=\/perfil"/);
  assert.match(guestView, /href="\/cadastro"/);
  assert.match(guestView, /href:\s*"\/meus-ingressos"/);
  assert.match(guestView, /href:\s*"\/agenda"/);
});

test("Home exibe banner 3D responsivo arredondado na faixa escura apontando para /para-voce", () => {
  const homePage = source("app/page.tsx");
  const promoBanner = source("components/home/PromoOrganizadoresBanner.tsx");

  assert.equal(
    existsSync(path.join(process.cwd(), "public/banners/para-organizadores-arenas-mobile.webp")),
    true,
  );
  assert.equal(
    existsSync(path.join(process.cwd(), "public/banners/para-organizadores-arenas-desktop.webp")),
    true,
  );
  assert.match(homePage, /bg-brand-dark[\s\S]*PromoOrganizadoresBanner/);
  assert.match(homePage, /md:max-w-\[840px\]/);
  assert.match(promoBanner, /href="\/para-voce"/);
  assert.match(promoBanner, /rounded-2xl[\s\S]*md:rounded-3xl/);
  assert.match(promoBanner, /\/banners\/para-organizadores-arenas-mobile\.webp/);
  assert.match(promoBanner, /\/banners\/para-organizadores-arenas-desktop\.webp/);
});

test("Landing /para-voce possui submenus Campeonato e Arena alternando benefícios e CTAs", () => {
  const landingPage = source("app/para-voce/page.tsx");
  const landingClient = source("components/landing/ParaVoceClient.tsx");
  const landingData = source("components/landing/para-voce-data.ts");
  const landingDetails = source("components/landing/ParaVoceDetails.tsx");
  const darkHeader = source("lib/dark-header.ts");

  assert.match(darkHeader, /"\/para-voce"/);
  assert.match(landingPage, /aba === "arena" \? "arena" : "campeonato"/);
  assert.match(landingClient, /\{ id: "campeonato", label: "Campeonato" \}/);
  assert.match(landingClient, /\{ id: "arena", label: "Arena" \}/);
  assert.match(landingClient, /id=\{`tab-\$\{id\}`\}/);
  assert.match(landingData, /\/cadastro\?modo=organizador/);
  assert.match(landingData, /\/arenas\/cadastro/);
  assert.match(landingDetails, /Plano Start/);
  assert.match(landingDetails, /Plano Pro/);
});
