import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDateRangeBR } from "@/lib/format";
import { AceitarConviteViaLink } from "./AceitarConviteViaLink";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const admin = createAdminClient();

  const { data: rawTeam } = await admin
    .from("teams")
    .select(`
      id, status, atleta1_id, atleta2_id, championship_id,
      championships(id, nome, data_inicio, data_fim, cidade, estado),
      championship_categories(nome)
    `)
    .eq("id", teamId)
    .maybeSingle();

  if (!rawTeam) notFound();

  const champ = (rawTeam.championships as unknown) as {
    id: string; nome: string; data_inicio: string; data_fim: string;
    cidade: string; estado: string;
  } | null;
  const cat = (rawTeam.championship_categories as unknown) as { nome: string } | null;

  if (!champ) notFound();

  const { data: atleta1 } = await admin
    .from("profiles")
    .select("nome, username")
    .eq("id", rawTeam.atleta1_id)
    .single();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const conviteExpirado = rawTeam.status !== "convite_pendente";
  const conviteErrado   = !!rawTeam.atleta2_id && !!user && rawTeam.atleta2_id !== user.id;

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-5">

        {/* Cabeçalho */}
        <div className="rounded-3xl bg-[#0f0f13] px-6 py-8 text-center text-white">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white/10">
            <Users className="size-7 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Convite de dupla
          </p>
          <h1 className="mt-1 text-xl font-bold">{champ.nome}</h1>
          {cat && <p className="mt-1 text-sm text-white/60">{cat.nome}</p>}

          <div className="mt-4 flex flex-col gap-1.5 text-sm text-white/50">
            <span className="flex items-center justify-center gap-1.5">
              <CalendarDays className="size-4" />
              {formatDateRangeBR(champ.data_inicio, champ.data_fim)}
            </span>
            <span className="flex items-center justify-center gap-1.5">
              <MapPin className="size-4" />
              {champ.cidade} — {champ.estado}
            </span>
          </div>
        </div>

        {/* Card de status */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          {conviteExpirado ? (
            <p className="text-center text-sm text-gray-500">
              Este convite não está mais disponível.
            </p>
          ) : conviteErrado ? (
            <p className="text-center text-sm text-gray-500">
              Este convite foi enviado para outro usuário. Verifique se está logado com a conta correta.
            </p>
          ) : !user ? (
            /* Não logado */
            <div className="space-y-3 text-center">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">
                  {atleta1?.nome ?? "Alguém"}
                </span>{" "}
                te convidou para fazer dupla.
              </p>
              <p className="text-xs text-gray-400">
                Entre ou crie uma conta para aceitar o convite.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href={`/login?next=/convite/${teamId}`}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 text-center"
                >
                  Entrar
                </Link>
                <Link
                  href={`/cadastro?next=/convite/${teamId}`}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
                >
                  Criar conta
                </Link>
              </div>
            </div>
          ) : (
            /* Logado e pode aceitar */
            <div className="space-y-3">
              <p className="text-center text-sm text-gray-700">
                <span className="font-semibold">
                  {atleta1?.nome ?? "Seu parceiro"}
                </span>{" "}
                te convidou para fazer dupla.
              </p>
              <AceitarConviteViaLink
                teamId={teamId}
                champId={champ.id}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
