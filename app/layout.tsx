import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/navbar/BottomNav";
import { Footer } from "@/components/Footer";
import { AppShell } from "@/components/shell/AppShell";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RankFTV",
  description: "Organize e participe de campeonatos de futevôlei.",
};

// maximumScale/userScalable travados em 1x bloqueava o pinch-zoom do
// usuário — falha de acessibilidade (WCAG 1.4.4). Zoom até 5x liberado.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let navUser: { id: string; nome: string; username: string; fotoUrl: string | null } | null = null;
  let isStaff = false;
  let isAdmin = false;
  let isOrganizer = false;
  let isArenaOwner = false;
  let notifCount = 0;

  if (user) {
    isAdmin = user.email === process.env.ADMIN_EMAIL;
    const [profileRes, staffRes, pendingStaffRes, pendingTeamRes, notifRes, organizerRes, arenaRes] = await Promise.all([
      supabase.from("profiles").select("nome, username, foto_url").eq("id", user.id).single(),
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
      supabase.from("organizer_accounts").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("arenas").select("id", { count: "exact", head: true }).eq("dono_id", user.id),
    ]);
    if (profileRes.data) {
      navUser = { id: user.id, nome: profileRes.data.nome, username: profileRes.data.username, fotoUrl: profileRes.data.foto_url };
    }
    isStaff = (staffRes.count ?? 0) > 0;
    notifCount = (pendingStaffRes.count ?? 0) + (pendingTeamRes.count ?? 0) + (notifRes.count ?? 0);
    isOrganizer = !!organizerRes.data;
    isArenaOwner = (arenaRes.count ?? 0) > 0;
  }

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-white text-gray-900">
        <AppShell
          user={navUser ? { nome: navUser.nome, username: navUser.username, fotoUrl: navUser.fotoUrl } : null}
          perms={{ isLoggedIn: !!navUser, isOrganizer, isArenaOwner, isStaff, isAdmin }}
          notifCount={notifCount}
        >
          {children}
        </AppShell>
        <Footer />
        <BottomNav showStaff={isStaff} isAdmin={isAdmin} isOrganizer={isOrganizer} notifCount={notifCount} isLoggedIn={!!navUser} />
      </body>
    </html>
  );
}
