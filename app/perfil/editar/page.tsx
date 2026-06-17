import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EditProfileForm } from "@/components/perfil/EditProfileForm";
import {
  ConquistasDestaqueSelector,
  type ConquistaOpcao,
} from "@/components/perfil/ConquistasDestaqueSelector";
import { createClient } from "@/lib/supabase/server";

export default async function EditarPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: conquistas }] = await Promise.all([
    supabase
      .from("profiles")
      .select("nome, bio, data_nascimento, foto_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("conquistas")
      .select("id, titulo, icone, destaque_ordem")
      .eq("user_id", user.id)
      .order("data_conquistada", { ascending: false }),
  ]);

  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="size-4" /> Voltar ao perfil
      </Link>

      <h1 className="text-xl font-semibold text-gray-900">Editar perfil</h1>

      <EditProfileForm
        userId={user.id}
        initialNome={profile.nome}
        initialBio={profile.bio ?? null}
        initialDataNascimento={profile.data_nascimento ?? null}
        initialFotoUrl={profile.foto_url ?? null}
      />

      <ConquistasDestaqueSelector
        userId={user.id}
        conquistas={(conquistas ?? []) as ConquistaOpcao[]}
      />
    </div>
  );
}
