import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CheckinClient } from "@/components/checkin/CheckinClient";
import { PresenceItem } from "@/components/checkin/PresenceItem";
import { getCheckinDirectory } from "@/lib/checkin-directory";

export default async function StaffQrcodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { id }     = await params;
  const { filtro } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verifica permissão de staff
  const { data: staffRow } = await supabase
    .from("championship_staff")
    .select("can_qrcode")
    .eq("championship_id", id)
    .eq("user_id", user.id)
    .eq("status", "aceito")
    .maybeSingle();

  if (!staffRow?.can_qrcode) notFound();

  const { data: camp } = await supabase
    .from("championships")
    .select("nome")
    .eq("id", id)
    .single();

  if (!camp) notFound();

  const allList = await getCheckinDirectory(id, user.id);
  if (!allList) notFound();

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
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="w-full space-y-4">
          <Link
            href={`/staff/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> {camp.nome}
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">QR Code / Presença</h1>
            <p className="mt-1 text-sm text-white/40">Credenciamento · portaria</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3">
            <div className="col-span-2 rounded-2xl bg-white/10 p-4 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-white/50">
                <Users className="size-4" />
                <p className="text-xs">Total</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{total}</p>
            </div>
            <div className="rounded-2xl bg-blue-500/20 p-4">
              <div className="flex items-center gap-1.5 text-blue-400">
                <CheckCircle2 className="size-4" />
                <p className="text-xs">Confirmados</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-blue-300">{confirmados}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-center gap-1.5 text-white/50">
                <Clock className="size-4" />
                <p className="text-xs">Pendentes</p>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{pendentes}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="w-full space-y-6">

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
                        ? `/staff/${id}/qrcode`
                        : `/staff/${id}/qrcode?filtro=${key}`
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
                    <PresenceItem
                      key={c.id}
                      nome={c.nome}
                      username={c.username}
                      checkinAt={c.checkin_at}
                      scannerNome={c.scannerNome}
                      isPair={c.kind === "pair"}
                    />
                  ) : (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <Clock className="size-4 text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{c.nome}</p>
                        {c.kind === "pair" ? (
                          <p className="text-xs text-gray-400">Ingresso da dupla</p>
                        ) : c.username ? (
                          <p className="text-xs text-gray-400">@{c.username}</p>
                        ) : null}
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
