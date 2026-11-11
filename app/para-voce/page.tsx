import type { Metadata } from "next";
import { ParaVoceClient, type ParaVoceTab } from "@/components/landing/ParaVoceClient";
import { loadParaVoceViewerState } from "@/lib/para-voce-viewer";

export const metadata: Metadata = {
  title: "Para Organizadores e Arenas — RankFTV",
  description:
    "Conheça os benefícios do RankFTV para organizar campeonatos de futevôlei ou gerenciar sua arena, turmas e mensalidades.",
};

export default async function ParaVocePage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const initialTab: ParaVoceTab = aba === "arena" ? "arena" : "campeonato";
  const { isLoggedIn, hasArena } = await loadParaVoceViewerState();

  return (
    <ParaVoceClient
      initialTab={initialTab}
      isLoggedIn={isLoggedIn}
      hasArena={hasArena}
    />
  );
}
