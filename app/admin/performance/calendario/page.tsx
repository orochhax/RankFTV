import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "@/components/performance/CalendarClient";
import { todayDateInBahia } from "@/lib/performance-life-os";

export const metadata = { title: "Calendario - Carlos Life OS" };

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");
  const { data } = await supabase.from("perf_event").select("*").eq("user_id", user.id).eq("active", true).order("start_at");
  const events = (data ?? []).map((row) => ({ id: row.id, title: row.title, description: row.description, startAt: row.start_at, endAt: row.end_at, allDay: Boolean(row.all_day), status: row.status, source: row.source, categoryId: row.category_id, location: row.location, link: row.link }));
  return <CalendarClient events={events} initialDate={todayDateInBahia()} />;
}
