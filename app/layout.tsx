import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/navbar/BottomNav";
import { TopNav } from "@/components/navbar/TopNav";
import { DemoBanner } from "@/components/DemoBanner";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RankFTV",
  description: "Organize e participe de campeonatos de futevôlei.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <DemoBanner />
        <TopNav />
        <main className="flex-1">{children}</main>
        {/* Footer carrega o padding extra embaixo no mobile (pra não ficar atrás da pill flutuante) */}
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
