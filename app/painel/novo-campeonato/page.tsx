import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NovoCampeonatoForm } from "@/components/painel/NovoCampeonatoForm";

// Criar campeonato (Fase 0 — CRUD básico, ver ftv.md seção 7). Exige login: o
// organizador é o próprio usuário logado.
export default async function NovoCampeonatoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href="/painel"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="size-4" /> Voltar ao painel
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-gray-900">Criar campeonato</h1>
      <p className="mt-1 text-sm text-gray-500">
        Preencha os dados e adicione as categorias. Dá pra salvar como rascunho e
        publicar depois.
      </p>
      <div className="mt-6">
        <NovoCampeonatoForm />
      </div>
    </div>
  );
}
