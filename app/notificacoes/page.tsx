import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { marcarTodasLidas } from "./actions";

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, titulo, mensagem, tipo, lida, created_at, championship_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const lista = notifs ?? [];
  const temNaoLidas = lista.some((n) => !n.lida);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 60) return `${min} min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h atrás`;
    const d = Math.floor(h / 24);
    return `${d}d atrás`;
  }

  return (
    <div className="min-h-screen">
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <ChevronLeft className="size-4" /> Início
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white">Notificações</h1>
            {temNaoLidas && (
              <form action={marcarTodasLidas}>
                <input type="hidden" name="user_id" value={user.id} />
                <button
                  type="submit"
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Marcar todas como lidas
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-white px-6 pb-24 pt-6 shadow-sm">
        <div className="mx-auto max-w-2xl">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <Bell className="size-8 text-gray-300" />
              </div>
              <p className="font-medium text-gray-600">Sem notificações</p>
              <p className="text-sm text-gray-400">Avisos do campeonato vão aparecer aqui.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {lista.map((n) => (
                <li key={n.id} className={`py-4 ${!n.lida ? "relative" : ""}`}>
                  {!n.lida && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />
                  )}
                  <div className={!n.lida ? "pl-5" : ""}>
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm font-semibold ${n.lida ? "text-gray-700" : "text-gray-900"}`}>
                        {n.titulo}
                      </p>
                      <span className="shrink-0 text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{n.mensagem}</p>
                    {n.championship_id && (
                      <Link
                        href={`/campeonatos/${n.championship_id}`}
                        className="mt-1 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Ver campeonato →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
