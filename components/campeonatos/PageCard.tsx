"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { PageWithStats } from "@/lib/supabase/pages";

function formatSeguidores(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return String(n);
}

export function PageCard({
  page,
  initialFollowing = false,
  userId,
}: {
  page: PageWithStats;
  initialFollowing?: boolean;
  userId: string | null;
}) {
  const [seguindo, setSeguindo] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    if (!userId) {
      router.push("/login");
      return;
    }
    setLoading(true);
    if (seguindo) {
      await supabase
        .from("page_followers")
        .delete()
        .eq("user_id", userId)
        .eq("page_id", page.id);
      setSeguindo(false);
    } else {
      await supabase
        .from("page_followers")
        .insert({ user_id: userId, page_id: page.id });
      setSeguindo(true);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <Link
      href={`/campeonatos/paginas/${page.handle}`}
      className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-shadow hover:shadow-sm"
    >
      {/* Mini-banner */}
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${page.bannerFrom} ${page.bannerTo}`}
      >
        <span className="text-xl font-bold text-white/90">{page.nome.charAt(0)}</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{page.nome}</p>
        <p className="truncate text-sm text-gray-500">{page.descricao || `@${page.handle}`}</p>
        <div className="mt-1 flex items-center gap-3 overflow-hidden whitespace-nowrap text-xs text-gray-400">
          <span className="flex shrink-0 items-center gap-1">
            <Users className="size-3" />
            {formatSeguidores(page.seguidores)} seguidores
          </span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">{page.edicoes} edições</span>
        </div>
      </div>

      {/* Botão seguir */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          seguindo
            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {loading ? "..." : seguindo ? "Seguindo" : "Seguir"}
      </button>
    </Link>
  );
}
