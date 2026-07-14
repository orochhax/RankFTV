import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  trial:       "Período de avaliação",
  ativo:       "Ativo",
  inadimplente:"Inadimplente",
  cancelado:   "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  trial:       "bg-blue-50 text-blue-700 ring-blue-100",
  ativo:       "bg-blue-50 text-blue-700 ring-blue-100",
  inadimplente:"bg-red-50 text-red-700 ring-red-100",
  cancelado:   "bg-gray-50 text-gray-500 ring-gray-100",
};

export default async function AssinaturaPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/arena/${handle}/assinatura`);

  const { data: arena } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("handle", handle)
    .eq("dono_id", user.id)
    .maybeSingle();
  if (!arena) redirect("/arena");

  const { data: sub } = await supabase
    .from("arena_subscriptions")
    .select("plano, status, proximo_vencimento, created_at")
    .eq("arena_id", arena.id)
    .maybeSingle();

  const status      = sub?.status ?? "trial";
  const vencimento  = sub?.proximo_vencimento;
  const colorClass  = STATUS_COLOR[status] ?? STATUS_COLOR.trial;
  const statusLabel = STATUS_LABEL[status] ?? status;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Assinatura</h1>
        <p className="text-sm text-gray-400">{arena.nome}</p>
      </div>

      <div className={`flex items-start gap-3 rounded-2xl px-5 py-4 ring-1 ${colorClass}`}>
        {status === "ativo" || status === "trial"
          ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          : <AlertCircle className="mt-0.5 size-5 shrink-0" />}
        <div>
          <p className="font-semibold">{statusLabel}</p>
          {vencimento && (
            <p className="mt-0.5 text-sm">
              {status === "trial" ? "Avaliação até " : "Próximo vencimento: "}
              {new Date(vencimento + "T12:00:00").toLocaleDateString("pt-BR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}
          {!vencimento && status === "trial" && (
            <p className="mt-0.5 text-sm">
              Seu período de avaliação está ativo. O valor da assinatura mensal será definido em breve.
            </p>
          )}
        </div>
      </div>

      <section>
        <p className="mb-3 text-sm font-semibold text-gray-700">Planos disponíveis</p>
        <div className="rounded-2xl bg-gray-50 p-5 ring-1 ring-black/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">Plano Básico</p>
              <ul className="mt-2 space-y-1 text-sm text-gray-500">
                <li>• Alunos ilimitados</li>
                <li>• Gestão de presenças</li>
                <li>• Cobranças de mensalidade</li>
                <li>• 100% do valor das mensalidades para você</li>
              </ul>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold text-gray-900">A definir</p>
              <p className="text-xs text-gray-400">por mês</p>
            </div>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-gray-400">
        O valor da assinatura e o botão de contratação serão ativados em breve.
        Durante o período de avaliação, o uso é gratuito.
      </p>
    </div>
  );
}
