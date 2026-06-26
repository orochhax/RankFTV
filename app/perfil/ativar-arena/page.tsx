import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AtivarArenaForm } from "@/components/arena/AtivarArenaForm";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export default async function AtivarArenaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Se já tem arena, vai direto pro painel
  const { data: arenaExistente } = await supabase
    .from("arenas")
    .select("id")
    .eq("dono_id", user.id)
    .limit(1)
    .maybeSingle();

  if (arenaExistente) redirect("/arena");

  return (
    <div className="mx-auto max-w-lg space-y-6 px-6 py-8 pb-32">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Criar minha arena</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure sua arena para gerenciar alunos, presenças e mensalidades pelo site.
        </p>
      </div>

      <div className="rounded-2xl bg-blue-50 px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold">Como funciona</p>
        <ul className="mt-2 space-y-1 text-blue-700">
          <li>• Você cria a arena e convida alunos por código</li>
          <li>• Alunos pagam a mensalidade pelo site</li>
          <li>• 100% do valor vai direto pra sua conta</li>
          <li>• Você paga só a assinatura mensal da plataforma</li>
        </ul>
      </div>

      <AtivarArenaForm estados={ESTADOS} />
    </div>
  );
}
