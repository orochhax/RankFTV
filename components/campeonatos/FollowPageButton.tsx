"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function FollowPageButton({
  pageId,
  userId,
  initialFollowing,
}: {
  pageId: string;
  userId: string | null;
  initialFollowing: boolean;
}) {
  const [seguindo, setSeguindo] = useState(initialFollowing);
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
    } else {
      await supabase
        .from("page_followers")
        .insert({ user_id: userId, page_id: pageId });
      setSeguindo(true);
    }
    setLoading(false);
    router.refresh();
  }

  return (
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
  );
}
