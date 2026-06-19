"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { togglePageFollow } from "@/app/campeonatos/paginas/actions";

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
  return String(n);
}

export function FollowPageButton({
  pageId,
  userId,
  initialFollowing,
  initialSeguidores,
  showCount = true,
}: {
  pageId: string;
  userId: string | null;
  initialFollowing: boolean;
  initialSeguidores?: number;
  showCount?: boolean;
}) {
  const [seguindo, setSeguindo] = useState(initialFollowing);
  const [seguidores, setSeguidores] = useState(initialSeguidores ?? 0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    if (!userId) { router.push("/login"); return; }

    // Otimista imediato
    setSeguindo((f) => !f);
    setSeguidores((n) => seguindo ? Math.max(0, n - 1) : n + 1);

    startTransition(async () => {
      const result = await togglePageFollow(pageId);
      // Corrige com valor real do servidor
      setSeguindo(result.following);
      setSeguidores(result.count);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {showCount && initialSeguidores !== undefined && (
        <span className="flex items-center gap-1 text-xs text-white/50">
          <Users className="size-3" />
          {fmt(seguidores)} seguidores
        </span>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          seguindo
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {seguindo ? "Seguindo" : "Seguir"}
      </button>
    </div>
  );
}
