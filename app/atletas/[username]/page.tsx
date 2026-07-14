import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";

export default async function PerfilPublicoPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, username, cidade, estado, bio, foto_url, rating")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const { data: history } = await supabase
    .from("rating_history")
    .select("id, rating_antes, rating_depois, resultado, created_at, championships(nome)")
    .eq("atleta_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const avatarColors = ["bg-blue-500","bg-blue-500","bg-violet-500","bg-orange-500","bg-rose-500","bg-teal-500"];
  function avatarColor(str: string) {
    let h = 0;
    for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
    return avatarColors[Math.abs(h) % avatarColors.length];
  }

  function categoriaFromRating(r: number) {
    if (r >= 1850) return "A";
    if (r >= 1550) return "B";
    return "C";
  }

  const cidade = profile.cidade ?? null;
  const estado = profile.estado ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-8 pb-32">
      <div className="flex items-center gap-4">
        <Avatar
          nome={profile.nome}
          color={avatarColor(profile.id)}
          size="lg"
          fotoUrl={profile.foto_url ?? null}
        />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{profile.nome}</h1>
          <p className="text-gray-500">@{profile.username}</p>
          {(cidade || estado) && (
            <p className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="size-3.5" />
              {[cidade, estado].filter(Boolean).join(" - ")}
            </p>
          )}
          {profile.bio && (
            <p className="mt-1 text-sm text-gray-600">{profile.bio}</p>
          )}
        </div>
      </div>

      {profile.rating > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Nível</h2>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white">
              {categoriaFromRating(profile.rating)}
            </span>
            <span className="text-sm text-gray-600">{profile.rating} pontos</span>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Histórico</h2>
        {(history ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma partida registrada.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {(history ?? []).map((item) => {
              const championship = Array.isArray(item.championships)
                ? item.championships[0]
                : item.championships;
              const delta = item.rating_depois - item.rating_antes;
              return (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{championship?.nome ?? "Campeonato"}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      {" · "}{item.resultado === "vitoria" ? "Vitória" : "Derrota"}
                    </p>
                  </div>
                  <span className={delta >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                    {delta >= 0 ? "+" : ""}{delta} pts
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
