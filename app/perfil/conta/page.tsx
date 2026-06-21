import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AccountSettingsForm } from "@/components/perfil/AccountSettingsForm";
import { createClient } from "@/lib/supabase/server";

export default async function DadosContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: priv } = await supabase
    .from("profiles_private")
    .select("telefone")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Voltar ao perfil
      </Link>

      <h1 className="text-xl font-semibold text-gray-900">Dados da conta</h1>

      <AccountSettingsForm
        userId={user.id}
        email={user.email ?? ""}
        initialTelefone={priv?.telefone ?? null}
      />
    </div>
  );
}
