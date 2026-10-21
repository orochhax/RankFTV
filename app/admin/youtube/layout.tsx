import type { Metadata } from "next";
import { PulsoShell } from "@/components/admin/youtube/PulsoShell";
import { requireYoutubeOwner } from "@/lib/youtube/access";
import "./youtube.css";

export const metadata: Metadata = {
  title: "Pulso.AI — Inteligência para YouTube",
  robots: { index: false, follow: false },
};

export default async function YoutubeLayout({ children }: { children: React.ReactNode }) {
  await requireYoutubeOwner();
  return <PulsoShell>{children}</PulsoShell>;
}
