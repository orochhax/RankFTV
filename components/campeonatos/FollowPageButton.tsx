"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePageFollow } from "@/app/campeonatos/paginas/actions";

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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    if (!userId) { router.push("/login"); return; }

    setSeguindo((f) => !f);
    startTransition(async () => {
      const result = await togglePageFollow(pageId);
      setSeguindo(result.following);
    });
  }

  return (
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
  );
}
