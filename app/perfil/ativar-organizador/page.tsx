import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AtivarOrganizadorForm } from "@/components/perfil/AtivarOrganizadorForm";

export default async function AtivarOrganizadorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conta } = await supabase
    .from("organizer_accounts")
    .select("habilitado")
    .eq("user_id", user.id)
    .single();

  if (conta?.habilitado) redirect("/painel");

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
          Ativar conta de organizador
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Informe sua chave Pix para receber os repasses das inscrições dos
          seus campeonatos. A plataforma desconta a taxa automaticamente.
        </p>
      </div>

      <div className="rounded-2xl bg-blue-50 px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold">Como funciona o repasse</p>
        <ul className="mt-2 space-y-1 text-blue-700">
          <li>• Atleta paga a inscrição (Pix ou cartão)</li>
          <li>• A plataforma retém a taxa</li>
          <li>• <strong>Pix:</strong> você recebe no mesmo dia</li>
          <li>• <strong>Cartão:</strong> você recebe em até 32 dias (prazo da operadora)</li>
        </ul>
      </div>

      <AtivarOrganizadorForm />
    </div>
  );
}
