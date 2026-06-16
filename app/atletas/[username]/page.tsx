import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { AthletePublicInfo } from "@/components/perfil/AthletePublicInfo";
import { ATHLETES } from "@/lib/mock/athletes";

// Perfil PÚBLICO do atleta — ver ftv.md seção 8.6. É o que qualquer um vê,
// inclusive a partir do Rank ou da lista de duplas inscritas. Dados privados
// (telefone, tamanho de camisa, etc.) ficam só em /perfil (seu próprio).
export async function generateStaticParams() {
  return ATHLETES.map((a) => ({ username: a.username }));
}

export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const athlete = ATHLETES.find((a) => a.username === username);
  if (!athlete) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <div className="flex items-center gap-4">
        <Avatar nome={athlete.nome} color={athlete.avatarColor} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{athlete.nome}</h1>
          <p className="text-gray-500">@{athlete.username}</p>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="size-3.5" />
            {athlete.cidade} - {athlete.estado}
          </p>
        </div>
      </div>

      <AthletePublicInfo athlete={athlete} />
    </div>
  );
}
