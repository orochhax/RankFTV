import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QuestionarioNivelForm } from "@/components/perfil/QuestionarioNivelForm";
import { categoryLevelRecommendationEnabled } from "@/lib/release-flags";

export default async function QuestionarioNivelPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  if (!categoryLevelRecommendationEnabled()) redirect("/perfil");

  const { redirect: redirectTo } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Qual é o seu nível?</h1>
        <p className="mt-1 text-sm text-gray-500">
          Esse campeonato usa suas respostas pra recomendar a categoria certa pra você.
          Leva menos de 1 minuto.
        </p>
      </div>

      <QuestionarioNivelForm redirectTo={redirectTo ?? "/perfil"} />
    </div>
  );
}
