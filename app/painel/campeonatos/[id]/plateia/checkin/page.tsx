import { redirect } from "next/navigation";

export default async function CheckinPlateiaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const search = String(query.q ?? "").trim();
  const searchParam = search ? `&q=${encodeURIComponent(search)}` : "";
  redirect(`/painel/campeonatos/${id}/checkin?tab=plateia${searchParam}`);
}
