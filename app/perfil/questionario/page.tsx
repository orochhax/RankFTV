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
    .select("genero")
    .eq("id", user.id)
    .single();

  if (profile?.genero) redirect("/perfil");

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
          Informe seu gênero
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Usamos isso para validar as categorias dos campeonatos em que você se
          inscrever.
        </p>
      </div>

      <QuestionarioForm />
    </div>
  );
}
