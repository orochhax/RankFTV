import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Bell, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NovaPaginaForm } from "@/components/painel/NovaPaginaForm";

export default async function NovaPaginaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#0f0f13] px-6 pb-14 pt-6">
        <div className="mx-auto max-w-2xl space-y-3">
          <Link
            href="/painel/paginas"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Minhas Páginas
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Nova Página</h1>
          <p className="text-sm text-white/60">
            Uma Página agrupa todas as edições do seu campeonato num só lugar.
          </p>
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-gray-50 px-6 pb-8 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Benefícios */}
          <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
            <p className="mb-4 text-sm font-semibold text-gray-900">Por que criar uma Página?</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Notifica os seguidores</p>
                  <p className="text-xs text-gray-500">
                    Quem segue a página recebe aviso automático quando uma nova edição abre inscrições.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Histórico de edições</p>
                  <p className="text-xs text-gray-500">
                    Todas as edições passadas (e futuras) ficam agrupadas e acessíveis numa só URL.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Trophy className="mt-0.5 size-4 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Pódio automático</p>
                  <p className="text-xs text-gray-500">
                    O resultado de cada edição fica registrado com campeões e vice-campeões.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Formulário */}
          <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <NovaPaginaForm />
          </div>
        </div>
      </div>
    </div>
  );
}
