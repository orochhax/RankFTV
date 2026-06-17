import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/navbar/BottomNav";
import { TopNav } from "@/components/navbar/TopNav";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
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
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <TopNav user={navUser} />
        <main className="flex-1">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
