import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Users, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InscricaoButton } from "@/components/campeonatos/InscricaoButton";
import { CHAMPIONSHIPS, getChampionshipById, resolveDuplas } from "@/lib/mock/championships";
import { getAthleteById } from "@/lib/mock/athletes";
import { getBracket } from "@/lib/mock/brackets";
import { getBannerUrl } from "@/lib/mock/banners";
import { formatBRL, formatDateRangeBR, generoLabel } from "@/lib/format";

// Detalhe do campeonato — ver ftv.md seção 8.4: regulamento, categorias com
// valor, localização e lista pública de duplas inscritas.
export async function generateStaticParams() {
  return CHAMPIONSHIPS.map((c) => ({ id: c.id }));
}

export default async function CampeonatoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const championship = getChampionshipById(id);
  if (!championship) notFound();

  const organizador = getAthleteById(championship.organizadorId);
  const duplas = resolveDuplas(championship);
  const bannerUrl = getBannerUrl(championship.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
      <div>
        {bannerUrl ? (
          <div className="relative h-32 overflow-hidden rounded-2xl">
            <Image
              src={bannerUrl}
              alt={championship.nome}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : (
          <div
            className={`flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br ${championship.bannerFrom} ${championship.bannerTo}`}
          />
        )}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{championship.nome}</h1>
            <p className="text-gray-500">{championship.descricao}</p>
          </div>
          <StatusBadge status={championship.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>{formatDateRangeBR(championship.dataInicio, championship.dataFim)}</span>
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            {championship.local}, {championship.cidade} - {championship.estado}
          </span>
          {organizador && (
            <span>
              Organizado por{" "}
              <Link href={`/atletas/${organizador.username}`} className="font-medium text-blue-600 hover:underline">
                {organizador.nome}
              </Link>
            </span>
          )}
        </div>
        {getBracket(championship.id) && (
          <div className="mt-4">
            <Link
              href={`/campeonatos/${championship.id}/chaveamento`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Trophy className="size-4" />
              Chaveamento
            </Link>
          </div>
        )}
      </div>

      {/* "Mapa" — placeholder visual até integrarmos um provedor de mapas de verdade */}
      <div className="flex h-32 items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500 ring-1 ring-black/5">
        <MapPin className="mr-2 size-4" /> Mapa de {championship.local} (em breve)
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Regulamento</h2>
        <p className="text-sm leading-relaxed text-gray-600">{championship.regulamento}</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Categorias e inscrição</h2>
        <div className="space-y-3">
          {championship.categorias.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"
            >
              <div>
                <p className="font-medium text-gray-900">
                  Categoria {cat.nome} · {generoLabel(cat.genero)}
                </p>
                <p className="text-sm text-gray-500">
                  {cat.corteRatingMin > 0
                    ? `Rating mínimo ${cat.corteRatingMin}`
                    : "Sem corte mínimo de rating"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-gray-900">{formatBRL(cat.valorInscricao)}</span>
                <div className="w-56">
                  <InscricaoButton categoriaNome={cat.nome} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Users className="size-5" /> Duplas inscritas ({duplas.length})
        </h2>
        {duplas.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma dupla inscrita ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {duplas.map((t) => (
              <li key={t.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  Categoria {t.categoriaNome} · {generoLabel(t.categoriaGenero)}
                </p>
                <div className="space-y-2">
                  {[t.atleta1, t.atleta2].map(
                    (atleta) =>
                      atleta && (
                        <Link
                          key={atleta.id}
                          href={`/atletas/${atleta.username}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Avatar nome={atleta.nome} color={atleta.avatarColor} size="sm" />
                          <span className="text-sm text-gray-800">{atleta.nome}</span>
                        </Link>
                      ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
