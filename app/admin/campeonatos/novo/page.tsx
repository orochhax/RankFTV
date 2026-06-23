import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CampeonatoVitrineForm } from "@/components/admin/CampeonatoVitrineForm";

export const dynamic = "force-dynamic";

export default async function NovoCampeonatoVitrinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <Link
        href="/admin/campeonatos"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Campeonatos
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Campeonato vitrine</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre um evento grande do cenário só pra aparecer na plataforma. É uma
          página informativa: não vende inscrição nem ingresso.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 ring-1 ring-blue-100">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Sem categoria, sem questionário de nível e sem chave PIX. A página pública mostra
          só as informações do evento (data, local, regulamento).
        </p>
      </div>

      <CampeonatoVitrineForm />
    </div>
  );
}
