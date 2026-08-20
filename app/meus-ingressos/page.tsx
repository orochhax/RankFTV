import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MeusIngressosDeslogado } from "./MeusIngressosDeslogado";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { createClient } from "@/lib/supabase/server";

export default async function MeusIngressosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/minhas-compras");

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-8 md:hidden">
        <div className="w-full space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            <ArrowLeft className="size-4" /> Início
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
            Consultar ingresso
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Encontre sua compra
          </h1>
          <p className="text-sm text-white/50">
            Digite o CPF e o e-mail usados na compra. Enviaremos um código de acesso ao seu e-mail.
          </p>
        </div>
      </div>

      <div className="hidden border-b border-border bg-surface md:block">
        <PageContainer width="wide" className="py-8">
          <PageHeader
            eyebrow="Consultar ingresso"
            title="Encontre sua compra"
            description="Digite o CPF e o e-mail usados na compra. Enviaremos um código de acesso ao seu e-mail."
          />
        </PageContainer>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg pb-24 pt-8 shadow-sm md:mt-0 md:rounded-none md:pb-16 md:shadow-none">
        <PageContainer width="wide">
          <MeusIngressosDeslogado />
        </PageContainer>
      </div>
    </div>
  );
}
