import { redirect } from "next/navigation";

export default async function YoutubeLayout({ children }: { children: React.ReactNode }) {
  void children;
  redirect("/admin/evolucao/rocha-tech");
}
