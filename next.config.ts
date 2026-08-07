import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Libera as Server Actions vindas do túnel do cloudflared (teste do lado do
// atleta) SÓ quando ALLOW_TUNNEL_ORIGIN=1 estiver no .env.local. Em produção a
// variável não existe, então o wildcard não é aplicado — mantém a proteção de
// origin nativa das Server Actions.
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
      ...(process.env.ALLOW_TUNNEL_ORIGIN === "1"
        ? { allowedOrigins: ["*.trycloudflare.com"] }
        : {}),
    },
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
          },
          ...(isDev
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
