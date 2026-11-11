import { redirect } from "next/navigation";

export default async function InscricoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { id } = await params;
  const { cat, q } = await searchParams;
  const searchParamsList = new URLSearchParams();
  if (cat) searchParamsList.set("cat", cat);
  if (q) searchParamsList.set("q", q);
  const queryString = searchParamsList.toString();
  redirect(`/painel/campeonatos/${id}/checkin${queryString ? `?${queryString}` : ""}`);
}
