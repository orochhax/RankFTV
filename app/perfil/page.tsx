import Link from "next/link";
import { ChevronRight, MapPin, Settings, Shirt, Phone, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { AthletePublicInfo } from "@/components/perfil/AthletePublicInfo";
import { getAthleteById } from "@/lib/mock/athletes";
import { getChampionshipsOrganizedBy } from "@/lib/mock/championships";
import { CURRENT_USER_PRIVATE_INFO, getCurrentAthlete } from "@/lib/mock/current-user";

// Perfil PRÓPRIO (privado) — ver ftv.md seção 8.6. É tudo que está em
// AthletePublicInfo + dados que só o dono vê (telefone, tamanho de camisa,
// parceiro fixo) + o acesso ao Painel do organizador.
export default function PerfilPage() {
  const me = getCurrentAthlete();
  const parceiroFixo = CURRENT_USER_PRIVATE_INFO.parceiroFixoId
    ? getAthleteById(CURRENT_USER_PRIVATE_INFO.parceiroFixoId)
    : undefined;
  const campeonatosOrganizados = getChampionshipsOrganizedBy(me.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <div className="flex items-center gap-4">
        <Avatar nome={me.nome} color={me.avatarColor} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{me.nome}</h1>
          <p className="text-gray-500">@{me.username}</p>
          <p className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="size-3.5" />
            {me.cidade} - {me.estado}
          </p>
        </div>
      </div>

      {/* Dados privados — só o dono vê isso, nunca aparece em /atletas/[username] */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500">
          <Settings className="size-4" /> Dados da conta
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="size-4 text-gray-400" /> {CURRENT_USER_PRIVATE_INFO.email}
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="size-4 text-gray-400" /> {CURRENT_USER_PRIVATE_INFO.telefone}
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Shirt className="size-4 text-gray-400" /> Camisa tamanho {CURRENT_USER_PRIVATE_INFO.tamanhoCamisa}
          </div>
          {parceiroFixo && (
            <div className="flex items-center gap-2 pt-1 text-gray-700">
              <span className="text-gray-400">Parceiro fixo:</span>
              <Link
                href={`/atletas/${parceiroFixo.username}`}
                className="flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
              >
                <Avatar nome={parceiroFixo.nome} color={parceiroFixo.avatarColor} size="sm" />
                {parceiroFixo.nome}
              </Link>
            </div>
          )}
        </dl>
      </section>

      {/* Virar organizador / Painel do organizador — ver ftv.md seção 8.6 */}
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-gray-500">Organizador</h2>
        {campeonatosOrganizados.length > 0 ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Cadastro de organizador completo (CPF/CNPJ + dados bancários). Você organiza{" "}
              {campeonatosOrganizados.length}{" "}
              {campeonatosOrganizados.length === 1 ? "campeonato" : "campeonatos"}.
            </p>
            <Link
              href="/painel"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ir pro Painel do organizador <ChevronRight className="size-4" />
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Qualquer atleta pode criar um campeonato. Pra publicar o primeiro, falta completar
              CPF/CNPJ e dados bancários (necessário pro split de pagamento).
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Quero criar um campeonato
            </button>
          </>
        )}
      </section>

      <AthletePublicInfo athlete={me} />
    </div>
  );
}
