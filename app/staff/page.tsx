import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateRangeBR } from "@/lib/format";

type StaffRow = {
  id: string;
  championship_id: string;
  can_qrcode: boolean;
  can_inscricoes: boolean;
  can_chaveamento: boolean;
  championships: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim: string | null;
    cidade: string;
    estado: string;
    status: string;
  } | null;
};

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawStaff } = await supabase
    .from("championship_staff")
    .select(`
      id, championship_id, can_qrcode, can_inscricoes, can_chaveamento,
      championships(id, nome, data_inicio, data_fim, cidade, estado, status)
    `)
    .eq("user_id", user.id)
    .eq("status", "aceito")
    .order("created_at", { ascending: false });

  const entries: StaffRow[] = ((rawStaff ?? []) as unknown as StaffRow[])
    .filter((s) => s.championships?.status !== "encerrado");

  return (
    <div className="min-h-screen">
      {/* Cabeçalho preto */}
      <div className="bg-[#0f0f13] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-white/10">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Staff</h1>
              <p className="text-sm text-white/40">Campeonatos em que você é staff</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo branco */}
      <div className="relative -mt-6 min-h-64 rounded-t-3xl bg-app-bg px-6 pb-24 pt-8 shadow-sm">
        <div className="mx-auto max-w-2xl">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gray-100">
                <ShieldCheck className="size-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">Nenhum campeonato como staff</p>
              <p className="max-w-xs text-xs text-gray-400">
                Quando um organizador te convidar para a equipe e você aceitar, os campeonatos aparecerão aqui.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {entries.map((s) => {
                const camp = s.championships;
                if (!camp) return null;
                const perms = [
                  s.can_qrcode      && "QR Code",
                  s.can_inscricoes  && "Inscrições",
                  s.can_chaveamento && "Chaveamento",
                ].filter(Boolean).join(" · ");

                return (
                  <li key={s.id}>
                    <Link
                      href={`/staff/${camp.id}`}
                      className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <ShieldCheck className="size-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{camp.nome}</p>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3" />
                            {formatDateRangeBR(camp.data_inicio, camp.data_fim ?? camp.data_inicio)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {camp.cidade} — {camp.estado}
                          </span>
                        </div>
                        {perms && (
                          <p className="mt-1 text-[11px] font-medium text-blue-600">{perms}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-gray-300">›</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
