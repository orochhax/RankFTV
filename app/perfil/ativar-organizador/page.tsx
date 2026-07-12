import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AtivarOrganizadorForm } from "@/components/perfil/AtivarOrganizadorForm";

export default async function AtivarOrganizadorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Só aceita caminhos internos (nunca "//host" nem URL absoluta) pra evitar open redirect.
  const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/painel/novo-campeonato";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/perfil/ativar-organizador?next=${destino}`)}`);

  const { data: conta } = await supabase
    .from("organizer_accounts")
    .select("habilitado")
    .eq("user_id", user.id)
    .maybeSingle();

  if (conta?.habilitado) redirect(destino);

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
          Precisamos desses dados pra confirmar sua identidade antes de você
          criar um campeonato. A chave Pix pra receber os repasses é pedida
          depois, na hora de publicar.
        </p>
      </div>

      <AtivarOrganizadorForm destino={destino} />
    </div>
  );
}
