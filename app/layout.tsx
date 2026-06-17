import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/navbar/BottomNav";
import { TopNav } from "@/components/navbar/TopNav";
import { DemoBanner } from "@/components/DemoBanner";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let navUser: { id: string; nome: string; username: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nome, username")
      .eq("id", user.id)
      .single();
    if (data) navUser = { id: user.id, ...data };
  }

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <DemoBanner />
        <TopNav user={navUser} />
        <main className="flex-1">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
