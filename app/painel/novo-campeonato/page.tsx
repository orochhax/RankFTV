import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPages } from "@/lib/supabase/pages";
import { NovoCampeonatoSection } from "@/components/painel/NovoCampeonatoSection";

export default async function NovoCampeonatoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const minhasPages = await getMyPages(user.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Criar Evento</h1>
      <p className="mt-1 text-sm text-gray-500">
        Escolha o que vai vender e preencha os dados. Dá pra salvar como rascunho e publicar depois.
      </p>

      <div className="mt-6">
        <NovoCampeonatoSection minhasPages={minhasPages} />
      </div>
    </div>
  );
}
