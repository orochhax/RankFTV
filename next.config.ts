import type { NextConfig } from "next";

// Libera as Server Actions vindas do túnel do cloudflared (teste do lado do
// atleta) SÓ quando ALLOW_TUNNEL_ORIGIN=1 estiver no .env.local. Em produção a
// variável não existe, então o wildcard não é aplicado — mantém a proteção de
// origin nativa das Server Actions.
const nextConfig: NextConfig = {
  experimental: {
    serverActions:
      process.env.ALLOW_TUNNEL_ORIGIN === "1"
        ? { allowedOrigins: ["*.trycloudflare.com"] }
        : undefined,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
