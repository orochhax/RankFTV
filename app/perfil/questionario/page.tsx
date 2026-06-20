import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QuestionarioForm } from "@/components/perfil/QuestionarioForm";

export default async function QuestionarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("questionario, genero")
    .eq("id", user.id)
    .single();

  // Só pula o questionário se já respondeu E já tem gênero definido
  if (profile?.questionario && profile?.genero) redirect("/perfil");

  return (
    <div className="mx-auto max-w-lg space-y-6 px-6 py-8">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Qual é o seu nível?
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          5 perguntas rápidas para definir seu rating inicial e aparecer
          corretamente no ranking. Suas respostas ficam visíveis no seu perfil
          público.
        </p>
      </div>

      <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Responda com honestidade — as respostas aparecem no seu perfil para
        todos verem. Se você se inscrever numa categoria abaixo do que
        declarou aqui, o organizador será alertado automaticamente.
      </div>

      <QuestionarioForm />
    </div>
  );
}
