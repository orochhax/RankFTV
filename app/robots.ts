import type { MetadataRoute } from "next";
import { resolveBaseUrl } from "@/lib/site-url";

const BASE_URL = resolveBaseUrl();

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
