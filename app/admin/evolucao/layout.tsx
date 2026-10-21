import type { Metadata } from "next";
import { EvolutionShell } from "@/components/evolution/EvolutionShell";
import { requireEvolutionOwner } from "@/lib/evolution/access";
import "../youtube/youtube.css";
import "./evolution.css";

export const metadata: Metadata = {
  title: "Central de Evolução",
  robots: { index: false, follow: false },
};

export default async function EvolutionLayout({ children }: { children: React.ReactNode }) {
  await requireEvolutionOwner();
  return <EvolutionShell>{children}</EvolutionShell>;
}
