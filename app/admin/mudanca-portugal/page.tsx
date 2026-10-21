import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPerformanceOwner } from "@/lib/performance-owner";
import { PortugalMovePlanner } from "@/components/admin/portugal-move/PortugalMovePlanner";

export const metadata = {
  title: "Mudança para Europa — Pessoal",
  robots: { index: false, follow: false },
};

export default async function PortugalMovePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isPerformanceOwner(supabase, user))) redirect("/");

  return <PortugalMovePlanner />;
}
