import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Users, UserCheck, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckinClient } from "@/components/checkin/CheckinClient";
import { PresenceItem } from "@/components/checkin/PresenceItem";
import { getDbChampionshipById } from "@/lib/supabase/championships";
import { PageContainer } from "@/components/shell/PageContainer";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatCard } from "@/components/shell/StatCard";
import { SectionHeader } from "@/components/shell/SectionHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { Surface } from "@/components/shell/Surface";

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
    <PageContainer width="form" className="space-y-6 py-8">
      <PageHeader title="Check-in" description="Portaria · credenciamento e controle de presença." />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total" value={total} icon={Users} />
        <StatCard label="Confirmados" value={confirmados} icon={UserCheck} tone="success" />
        <StatCard label="Pendentes" value={pendentes} icon={UserX} tone={pendentes > 0 ? "warning" : "default"} />
      </div>

      <Surface padding="md">
        <CheckinClient championshipId={id} />
      </Surface>

      <section>
        <SectionHeader title="Lista de presença" />

        {total > 0 && (
          <div className="mb-4 mt-3 flex gap-2 overflow-x-auto pb-1">
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
                    ? "bg-blue-600 text-white"
                    : "bg-surface-2 text-ink-muted hover:bg-border/60"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {total === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhuma credencial emitida ainda"
            description="As credenciais são geradas após o pagamento da inscrição."
            className="mt-3"
          />
        ) : lista.length === 0 ? (
          <EmptyState
            icon={filtroAtivo === "presentes" ? UserCheck : UserX}
            title={filtroAtivo === "presentes" ? "Nenhum atleta confirmado ainda" : "Todos confirmados!"}
            className="mt-3"
          />
        ) : (
          <Surface padding="none" className="mt-3 overflow-hidden">
            <ol className="divide-y divide-border">
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
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
                      <span className="text-xs font-bold text-ink-muted">?</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{c.nome}</p>
                      {c.username && (
                        <p className="text-xs text-ink-muted">@{c.username}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted">
                      Pendente
                    </span>
                  </li>
                )
              )}
            </ol>
          </Surface>
        )}
      </section>
    </PageContainer>
  );
}
