import Link from "next/link";

type Props = {
  categoriaNome: string;
  championshipId?: string;
  categoryId?: string;
  status?: string;
  esgotado?: boolean;
  precisaQuestionario?: boolean;
};

// Botão de inscrição na página de detalhe do campeonato.
// Campeonatos reais (UUID) → link para /inscrever.
// Campeonatos mock ou com inscrições fechadas → estado visual.
export function InscricaoButton({
  categoriaNome,
  championshipId,
  categoryId,
  status,
  esgotado,
  precisaQuestionario,
}: Props) {
  const isReal = !!championshipId && !!categoryId;
  const aberto = status === "inscricoes_abertas";

  if (esgotado) {
    return (
      <span className="block w-full rounded-lg bg-gray-100 px-4 py-2.5 text-center text-sm text-gray-400">
        Vagas esgotadas
      </span>
    );
  }

  if (isReal && aberto) {
    const inscreverHref = `/campeonatos/${championshipId}/inscrever?categoria=${categoryId}`;
    const href = precisaQuestionario
      ? `/perfil/questionario-nivel?redirect=${encodeURIComponent(inscreverHref)}`
      : inscreverHref;
    return (
      <Link
        href={href}
        className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
      >
        Inscrever dupla — {categoriaNome}
      </Link>
    );
  }

  return (
    <span className="block w-full rounded-lg bg-gray-100 px-4 py-2.5 text-center text-sm text-gray-400">
      {!aberto ? "Inscrições encerradas" : "Em breve"}
    </span>
  );
}
