import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PaginaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("pages")
    .select("owner_id, handle")
    .eq("id", id)
    .maybeSingle();

  if (!page) notFound();
  if (page.owner_id !== user.id) notFound();

  redirect(`/campeonatos/paginas/${page.handle}`);
}
