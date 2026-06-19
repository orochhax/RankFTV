"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LiveFollowerCount({
  pageId,
  initial,
}: {
  pageId: string;
  initial: number;
}) {
  const [count, setCount] = useState(initial);
  const router = useRouter();
  const supabase = createClient();
  // Mantém referência estável para evitar re-subscribe desnecessário
  const pageIdRef = useRef(pageId);

  useEffect(() => {
    // Atualiza ao voltar para a aba
    function onFocus() {
      router.refresh();
    }
    window.addEventListener("focus", onFocus);

    // Subscrição em tempo real via Supabase Realtime
    const channel = supabase
      .channel(`page-followers-${pageIdRef.current}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "page_followers",
          filter: `page_id=eq.${pageIdRef.current}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCount((n) => n + 1);
          } else if (payload.eventType === "DELETE") {
            setCount((n) => Math.max(0, n - 1));
          }
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmt(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
    return String(n);
  }

  return <>{fmt(count)}</>;
}
