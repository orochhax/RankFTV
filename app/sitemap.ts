import type { MetadataRoute } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.rankftv.com").replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/campeonatos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/campeonatos/ao-vivo`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/noticias`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/arenas`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/termos`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacidade`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
