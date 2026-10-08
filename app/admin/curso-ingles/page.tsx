import { EnglishRoadmapTracker } from "@/components/admin/english-course/EnglishRoadmapTracker";
import { requirePersonalOwner } from "@/lib/personal-owner-access";

export const metadata = {
  title: "Roadmap de Inglês — Carlos e Júlia",
  robots: { index: false, follow: false },
};

export default async function EnglishCoursePage() {
  await requirePersonalOwner();

  return <EnglishRoadmapTracker />;
}
