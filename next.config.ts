import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Libera as Server Actions quando o site é acessado pelo túnel do cloudflared
  // (teste do lado do atleta). O wildcard cobre qualquer URL *.trycloudflare.com,
  // então não precisa mexer aqui toda vez que o túnel reinicia.
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com"],
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
};

export default nextConfig;
