import { redirect } from "next/navigation";

export default async function RadarAnteEvasaoAliasPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  redirect(`/arena/${handle}/radar-evasao`);
}
