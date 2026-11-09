import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { listarOrganizadoresKyc } from "./actions";
import { AdminOrganizadoresManager } from "@/components/admin/AdminOrganizadoresManager";

export default async function AdminOrganizadoresPage() {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
  ]);

  if (!user || !isCeo(role)) redirect("/");

  const res = await listarOrganizadoresKyc();

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Painel admin
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Aprovação de Organizadores (KYC & Antifraude)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Valide a identidade, documentos com foto e chave Pix dos organizadores antes de liberar a publicação de eventos pagos.
        </p>
      </div>

      <AdminOrganizadoresManager initialOrganizadores={res.organizadores ?? []} />
    </div>
  );
}
