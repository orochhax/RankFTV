import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, QrCode, Users, CheckSquare, MapPin, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { formatDateRangeBR } from "@/lib/format";

type Permission = {
  canQrcode: boolean;
  canInscricoes: boolean;
  canChaveamento: boolean;
};

export default async function StaffCampPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verifica se é staff aceito deste campeonato
  const { data: staffRow } = await supabase
    .from("championship_staff")
    .select("can_qrcode, can_inscricoes, can_chaveamento")
    .eq("championship_id", id)
    .eq("user_id", user.id)
    .eq("status", "aceito")
    .maybeSingle();

  if (!staffRow) notFound();

  const perms: Permission = {
    canQrcode:      staffRow.can_qrcode,
    canInscricoes:  staffRow.can_inscricoes,
    canChaveamento: staffRow.can_chaveamento,
  };

  const { data: camp } = await supabase
    .from("championships")
    .select("nome, cidade, estado, data_inicio, data_fim")
    .eq("id", id)
    .single();

  if (!camp) notFound();

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("nome, foto_url")
    .eq("id", user.id)
    .maybeSingle();

  const OPCOES = [
    {
      icon: QrCode,
      label: "QR Code / Presença",
      desc: "Escanear QR dos atletas e ver lista de presença",
      href: `/staff/${id}/qrcode`,
      enabled: perms.canQrcode,
    },
    {
      icon: Users,
      label: "Inscrições",
      desc: "Ver duplas inscritas e categorias",
      href: `/staff/${id}/inscricoes`,
      enabled: perms.canInscricoes,
    },
    {
      icon: CheckSquare,
      label: "Chaveamento",
      desc: "Editar confrontos e lançar placares",
      href: `/staff/${id}/chaveamento`,
      enabled: perms.canChaveamento,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="bg-black px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/staff"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="size-4" /> Staff
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{camp.nome}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/40">
              <MapPin className="size-3.5 shrink-0" /> {camp.cidade} — {camp.estado}
            </p>
            {camp.data_inicio && camp.data_fim && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/40">
                <CalendarDays className="size-3.5 shrink-0" /> {formatDateRangeBR(camp.data_inicio, camp.data_fim)}
              </p>
            )}
          </div>

          {/* Mini perfil do staff logado */}
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <Avatar
              nome={meuPerfil?.nome ?? "Staff"}
              color="bg-blue-600"
              size="sm"
              fotoUrl={meuPerfil?.foto_url}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{meuPerfil?.nome ?? "Staff"}</p>
              <p className="text-xs text-white/40">Você está acessando como staff</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Acesso
          </h2>
          <div className="grid gap-3 sm:grid-cols-1">
            {OPCOES.map(({ icon: Icon, label, desc, href, enabled }) => {
              const inner = (
                <>
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}>
                    <Icon className={`size-5 ${enabled ? "text-white" : "text-gray-400"}`} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${enabled ? "text-gray-900" : "text-gray-400"}`}>{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  {!enabled && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                      Sem acesso
                    </span>
                  )}
                </>
              );

              return enabled ? (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-50"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
