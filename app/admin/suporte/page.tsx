import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isCeo } from "@/lib/supabase/roles";
import { TicketSupportCenter } from "@/components/admin/TicketSupportCenter";
import {
  listarCasosSuporte,
  listarEventosCredenciaisSuporte,
  listarLogsSuporte,
  listarOperacaoEmails,
} from "./actions";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const [{ data: { user } }, role] = await Promise.all([
    supabase.auth.getUser(),
    getUserRole(supabase),
  ]);
  if (!user || !isCeo(role)) redirect("/");
  const [history, credentialHistory, emailOperations, supportCases] = await Promise.all([
    listarLogsSuporte(),
    listarEventosCredenciaisSuporte(),
    listarOperacaoEmails(),
    listarCasosSuporte(),
  ]);
  return (
    <div className="w-full space-y-6 px-6 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="size-4" /> Painel admin
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Suporte a ingressos</h1>
        <p className="mt-1 text-sm text-gray-500">Recuperação assistida e correções sensíveis. Acesso exclusivo do CEO.</p>
      </div>
      <TicketSupportCenter
        initialLogs={history.logs ?? []}
        initialCredentialEvents={credentialHistory.events ?? []}
        initialEmailSummary={emailOperations.summary ?? null}
        initialCases={supportCases.cases ?? []}
      />
    </div>
  );
}
