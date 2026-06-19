import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, ShieldCheck, Users, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { aceitarConvite, recusarConvite } from "@/app/perfil/convite-actions";
import { aceitarConviteStaff, recusarConviteStaff } from "@/app/perfil/staff-actions";
import { marcarTodasLidas } from "./actions";

type StaffRow = {
  id: string;
  invited_by: string;
  can_qrcode: boolean;
  can_inscricoes: boolean;
  can_chaveamento: boolean;
  championships: { id: string; nome: string } | null;
};

type ConviteRow = {
  id: string;
  atleta1_id: string;
  championship_id: string;
  category_id: string;
  championships: { nome: string } | null;
  championship_categories: { nome: string } | null;
};

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // --- Convites de staff pendentes ---
  // Busca sem join de profiles (invited_by referencia auth.users, não profiles)
  const { data: rawStaff } = await supabase
    .from("championship_staff")
    .select("id, invited_by, can_qrcode, can_inscricoes, can_chaveamento, championships(id, nome)")
    .eq("user_id", user.id)
    .eq("status", "pendente")
    .order("created_at", { ascending: false });

  const staffRows = (rawStaff ?? []) as unknown as StaffRow[];

  // Busca perfis dos organizadores que enviaram o convite
  const inviterIds = [...new Set(staffRows.map((r) => r.invited_by))];
  const { data: inviterProfiles } = inviterIds.length > 0
    ? await supabase.from("profiles").select("id, nome, username").in("id", inviterIds)
    : { data: [] };
  const inviterMap = Object.fromEntries((inviterProfiles ?? []).map((p) => [p.id, p]));

  const staffConvites = staffRows.map((r) => ({
    ...r,
    inviter: inviterMap[r.invited_by] ?? null,
  }));

  // --- Convites de dupla pendentes ---
  const { data: convitesRaw } = await supabase
    .from("teams")
    .select("id, atleta1_id, championship_id, category_id, championships(nome), championship_categories(nome)")
    .eq("atleta2_id", user.id)
    .eq("status", "convite_pendente");

  const convitesBase = (convitesRaw ?? []) as unknown as ConviteRow[];

  const atleta1Ids = [...new Set(convitesBase.map((c) => c.atleta1_id))];
  const { data: atleta1Profiles } = atleta1Ids.length > 0
    ? await supabase.from("profiles").select("id, nome, username").in("id", atleta1Ids)
    : { data: [] };
  const profMap = Object.fromEntries((atleta1Profiles ?? []).map((p) => [p.id, p]));

  const convites = convitesBase.map((c) => ({
    ...c,
    atleta1: profMap[c.atleta1_id] ?? null,
  }));

  // --- Notificações gerais da tabela notifications ---
  const { data: notifRows } = await supabase
    .from("notifications")
    .select("id, tipo, titulo, mensagem, lida, championship_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const notifs = notifRows ?? [];

  // Marca todas as notificações gerais como lidas ao abrir a página
  if (notifs.some((n) => !n.lida)) {
    void marcarTodasLidas();
  }

  const total = staffConvites.length + convites.length + notifs.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8 pb-32">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-blue-100">
          <Bell className="size-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notificações</h1>
          {total > 0 && (
            <p className="text-sm text-gray-500">{total} {total === 1 ? "pendente" : "pendentes"}</p>
          )}
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-50 py-16 text-center ring-1 ring-black/5">
          <Bell className="size-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Tudo em dia</p>
          <p className="text-xs text-gray-400">Nenhuma notificação pendente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Convites de staff */}
          {staffConvites.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <ShieldCheck className="size-4" /> Convites de staff
              </h2>
              {staffConvites.map((c) => {
                const perms = [
                  c.can_qrcode      && "QR Code",
                  c.can_inscricoes  && "Inscrições",
                  c.can_chaveamento && "Chaveamento",
                ].filter(Boolean).join(", ");
                return (
                  <div key={c.id} className="rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <ShieldCheck className="size-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{c.championships?.nome ?? "Campeonato"}</p>
                        {c.inviter && (
                          <p className="text-sm text-gray-500">
                            Convidado por{" "}
                            <span className="font-medium">{c.inviter.nome}</span>
                            {" "}<span className="text-gray-400">@{c.inviter.username}</span>
                          </p>
                        )}
                        {perms && (
                          <p className="mt-1 text-xs font-medium text-blue-600">Acesso: {perms}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <form action={aceitarConviteStaff.bind(null, c.id)}>
                        <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          Aceitar
                        </button>
                      </form>
                      <form action={recusarConviteStaff.bind(null, c.id)}>
                        <button type="submit" className="rounded-xl bg-white px-5 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50">
                          Recusar
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Convites de dupla */}
          {convites.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Users className="size-4" /> Convites de dupla
              </h2>
              {convites.map((c) => (
                <div key={c.id} className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <Users className="size-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{c.championships?.nome ?? "Campeonato"}</p>
                      <p className="text-sm text-gray-500">Categoria {c.championship_categories?.nome ?? "—"}</p>
                      {c.atleta1 && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          Convite de{" "}
                          <span className="font-medium">{c.atleta1.nome}</span>
                          {" "}<span className="text-gray-400">@{c.atleta1.username}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <form action={aceitarConvite}>
                      <input type="hidden" name="team_id" value={c.id} />
                      <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Aceitar
                      </button>
                    </form>
                    <form action={recusarConvite}>
                      <input type="hidden" name="team_id" value={c.id} />
                      <button type="submit" className="rounded-xl bg-white px-5 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50">
                        Recusar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </section>
          )}
          {/* Notificações gerais */}
          {notifs.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Bell className="size-4" /> Avisos
              </h2>
              {notifs.map((n) => {
                const champLink = n.tipo === "convite_pagina" && n.championship_id
                  ? `/painel/campeonatos/${n.championship_id}`
                  : null;
                return (
                  <div key={n.id} className={`rounded-2xl p-4 ring-1 ${n.lida ? "bg-gray-50 ring-gray-100" : "bg-blue-50 ring-blue-200"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${n.lida ? "bg-gray-100" : "bg-blue-100"}`}>
                        <Link2 className={`size-4 ${n.lida ? "text-gray-400" : "text-blue-600"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">{n.titulo}</p>
                        <p className="mt-0.5 text-sm text-gray-600">{n.mensagem}</p>
                        {champLink && (
                          <Link
                            href={champLink}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            Ver no painel do campeonato →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
