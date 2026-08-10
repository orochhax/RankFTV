import type { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rankftv.com").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/arena",
        "/agenda",
        "/cadastro",
        "/convite",
        "/login",
        "/meus-ingressos",
        "/minhas-compras",
        "/minhas-inscricoes",
        "/notificacoes",
        "/painel",
        "/perfil",
        "/recuperar-senha",
        "/staff",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
