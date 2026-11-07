import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingEtapa1Form } from "./OnboardingEtapa1Form";

export const metadata = {
  title: "Cadastrar Minha Arena — Etapa 1 — RankFTV",
  description: "Configure os dados e a estrutura da sua arena de futevôlei.",
};

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export default async function CadastroArenaEtapa1Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/arenas/cadastro");

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Barra de Progresso do Onboarding */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-2">
            <span className="text-blue-600">Etapa 1 de 2: Estrutura da Arena</span>
            <span>50% concluído</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-1/2 rounded-full bg-blue-600 transition-all duration-500" />
          </div>
        </div>

        {/* Título */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            Configure sua Arena
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Preencha as informações básicas para ativarmos seu painel de turmas e presenças.
          </p>
        </div>

        {/* Formulário Etapa 1 */}
        <OnboardingEtapa1Form estados={ESTADOS} />
      </div>
    </div>
  );
}
