import type { Metadata } from "next";
import { EvolutionShell } from "@/components/evolution/EvolutionShell";
import { requireEvolutionOwner } from "@/lib/evolution/access";
import { isEvolutionLocalPreview } from "@/lib/evolution/local-preview";
import "../youtube/youtube.css";
import "./evolution.css";

export const metadata: Metadata = {
  title: "Central de Evolução",
  robots: { index: false, follow: false },
};

export default async function EvolutionLayout({ children }: { children: React.ReactNode }) {
  if (!isEvolutionLocalPreview()) await requireEvolutionOwner();
  return <EvolutionShell>{children}</EvolutionShell>;
}
