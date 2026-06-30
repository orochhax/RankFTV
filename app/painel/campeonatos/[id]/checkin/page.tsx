import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckinClient } from "@/components/checkin/CheckinClient";
import { PresenceItem } from "@/components/checkin/PresenceItem";
import { getDbChampionshipById } from "@/lib/supabase/championships";

type CredentialRow = {
  id: string;
  user_id: string;
  role: string;
  qr_token: string;
  code: string | null;
  checked_in: boolean;
  checkin_at: string | null;
  checked_in_by: string | null;
};

type ProfileRow = {
  id: string;
  nome: string;
  username: string;
};

type CredentialDisplay = CredentialRow & {
  nome: string;
  username: string;
  scannerNome: string | null;
};

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { id } = await params;
  const { filtro } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const camp = await getDbChampionshipById(id);
  if (!camp) notFound();
  if (camp.organizadorId !== user.id) notFound();

  // Busca credenciais com as novas colunas
  const { data: rawCreds } = await supabase
    .from("credentials")
    .select("id, user_id, role, qr_token, code, checked_in, checkin_at, checked_in_by")
    .eq("championship_id", id);

  const creds: CredentialRow[] = rawCreds ?? [];

  // IDs únicos: atletas + scanners
  const athleteIds  = [...new Set(creds.map((c) => c.user_id))];
  const scannerIds  = [...new Set(creds.map((c) => c.checked_in_by).filter(Boolean))] as string[];
  const allIds      = [...new Set([...athleteIds, ...scannerIds])];

  let profiles: ProfileRow[] = [];
  if (allIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, username")
      .in("id", allIds);
    profiles = (data ?? []) as ProfileRow[];
  }

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  // Monta lista com nome + scanner + ordem alfabética
  const allList: CredentialDisplay[] = creds
    .map((c) => ({
      ...c,
      nome:        profileMap[c.user_id]?.nome     ?? "Atleta",
      username:    profileMap[c.user_id]?.username ?? "",
      scannerNome: c.checked_in_by ? (profileMap[c.checked_in_by]?.nome ?? null) : null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const total       = allList.length;
  const confirmados = allList.filter((c) => c.checked_in).length;
  const pendentes   = total - confirmados;

  const filtroAtivo =
    filtro === "presentes" ? "presentes" :
    filtro === "pendentes" ? "pendentes" :
    "todos";

  const lista =
    filtroAtivo === "presentes" ? allList.filter((c) =>  c.checked_in) :
    filtroAtivo === "pendentes" ? allList.filter((c) => !c.checked_in) :
    allList;

  const FILTROS = [
    { key: "todos",     label: `Todos (${total})` },
    { key: "pendentes", label: `Pendentes (${pendentes})` },
    { key: "presentes", label: `Presentes (${confirmados})` },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Cabeçalho preto ── */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href={`/painel/campeonatos/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Check-in</h1>
            <p className="mt-1 text-sm text-white/40">Portaria · credenciamento</p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <Users className="size-4" />
                <p className="text-xs">Total</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{total}</p>
            </div>
            <div className="rounded-2xl bg-blue-500/20 p-4">
              <div className="flex items-center gap-1.5 text-blue-400">
                <p className="text-xs">Confirmados</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-blue-300">{confirmados}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <p className="text-xs">Pendentes</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{pendentes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo branco ── */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl space-y-6">

          <section>
            <CheckinClient championshipId={id} />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Lista de presença
            </h2>

            {total > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {FILTROS.map(({ key, label }) => (
                  <Link
                    key={key}
                    href={
                      key === "todos"
                        ? `/painel/campeonatos/${id}/checkin`
                        : `/painel/campeonatos/${id}/checkin?filtro=${key}`
                    }
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      filtroAtivo === key
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}

            {total === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center ring-1 ring-black/5">
                <p className="text-sm text-gray-400">
                  Nenhuma credencial emitida ainda.
                  <br />
                  As credenciais são geradas após o pagamento da inscrição.
                </p>
              </div>
            ) : lista.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-6 text-center ring-1 ring-black/5">
                <p className="text-sm text-gray-400">
                  {filtroAtivo === "presentes" ? "Nenhum atleta confirmado ainda." : "Todos confirmados!"}
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                {lista.map((c) =>
                  c.checked_in && c.checkin_at ? (
                    // Presente — clicável, mostra quem escaneou
                    <PresenceItem
                      key={c.id}
                      nome={c.nome}
                      username={c.username}
                      checkinAt={c.checkin_at}
                      scannerNome={c.scannerNome}
                    />
                  ) : (
                    // Pendente — linha simples
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <span className="text-xs font-bold text-gray-400">?</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{c.nome}</p>
                        {c.username && (
                          <p className="text-xs text-gray-400">@{c.username}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                        Pendente
                      </span>
                    </li>
                  )
                )}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
