"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Surface } from "@/components/shell/Surface";
import { createClient } from "@/lib/supabase/client";

type UsernameStatus = "checking" | "ok" | "taken" | "invalid";

export default function EscolherUsuarioPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<UsernameStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const suggested = typeof user.user_metadata.username === "string"
        ? user.user_metadata.username.toLowerCase()
        : "";
      if (active) setUsername(suggested);
    });
    return () => { active = false; };
  }, [router, supabase]);

  useEffect(() => {
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    const timer = setTimeout(() => {
      void supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle()
        .then(({ data }) => setStatus(data ? "taken" : "ok"));
    }, 350);
    return () => clearTimeout(timer);
  }, [supabase, username]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status !== "ok" || loading) return;
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id);
    if (updateError?.code === "23505") {
      setStatus("taken");
      setLoading(false);
      return;
    }
    if (updateError) {
      setError("Não foi possível salvar o @usuário. Tente novamente.");
      setLoading(false);
      return;
    }
    router.replace("/");
  }

  return (
    <div className="flex min-h-[calc(100dvh-48px)] items-center justify-center px-6 py-10">
      <Surface padding="lg" className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900">Escolha outro @usuário</h1>
        <p className="mt-1 text-sm text-gray-500">
          Outra pessoa confirmou este @usuário antes. Sua conta está confirmada; escolha um disponível para continuar.
        </p>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            @usuário
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
            <input
              id="username"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/\s/g, ""))}
              className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-8 text-sm focus:border-blue-500 focus:outline-none"
            />
            {status === "checking" && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-400" />}
            {status === "ok" && <CheckCircle2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-blue-500" />}
            {(status === "taken" || status === "invalid") && <XCircle className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-red-500" />}
          </div>
          {status === "taken" && <p className="text-xs text-red-600">Esse @usuário já existe — escolha outro.</p>}
          {status === "invalid" && <p className="text-xs text-red-600">Use de 3 a 30 letras minúsculas, números, . ou _.</p>}
          <button
            type="submit"
            disabled={status !== "ok" || loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Salvando..." : "Continuar"}
          </button>
        </form>
      </Surface>
    </div>
  );
}
