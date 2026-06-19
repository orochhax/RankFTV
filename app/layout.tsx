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
  let isStaff = false;
  let isAdmin = false;
  let notifCount = 0;

  if (user) {
    isAdmin = user.email === process.env.ADMIN_EMAIL;
    const [profileRes, staffRes, pendingStaffRes, pendingTeamRes, notifRes] = await Promise.all([
      supabase.from("profiles").select("nome, username").eq("id", user.id).single(),
      supabase
        .from("championship_staff")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "aceito"),
      supabase
        .from("championship_staff")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pendente"),
      supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("atleta2_id", user.id)
        .eq("status", "convite_pendente"),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("lida", false),
    ]);
    if (profileRes.data) navUser = { id: user.id, ...profileRes.data };
    isStaff = (staffRes.count ?? 0) > 0;
    notifCount = (pendingStaffRes.count ?? 0) + (pendingTeamRes.count ?? 0) + (notifRes.count ?? 0);
  }

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-white text-gray-900">
        <TopNav user={navUser} showStaff={isStaff} isAdmin={isAdmin} notifCount={notifCount} />
        <main className="flex-1">{children}</main>
        <Footer />
        <BottomNav showStaff={isStaff} isAdmin={isAdmin} notifCount={notifCount} isLoggedIn={!!navUser} />
      </body>
    </html>
  );
}
