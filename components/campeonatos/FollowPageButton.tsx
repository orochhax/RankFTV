"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function formatSeguidores(n: number): string {
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
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleToggle() {
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
        .eq("page_id", pageId);
      setSeguindo(false);
      setSeguidores((n) => Math.max(0, n - 1));
    } else {
      await supabase
        .from("page_followers")
        .insert({ user_id: userId, page_id: pageId });
      setSeguindo(true);
      setSeguidores((n) => n + 1);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {showCount && initialSeguidores !== undefined && (
        <span className="flex items-center gap-1 text-xs text-white/50">
          <Users className="size-3" />
          {formatSeguidores(seguidores)} seguidores
        </span>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          seguindo
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {loading ? "..." : seguindo ? "Seguindo" : "Seguir"}
      </button>
    </div>
  );
}
