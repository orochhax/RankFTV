"use client";

import { useEffect, useRef } from "react";
import { trackPublicFunnel } from "@/lib/public-funnel-client";
import type { PublicFunnelEvent as FunnelEvent } from "@/lib/public-funnel";

export function PublicFunnelEvent({
  event,
  championshipId,
  categoryId,
}: {
  event: FunnelEvent;
  championshipId?: string | null;
  categoryId?: string | null;
}) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackPublicFunnel({ event, championshipId, categoryId });
  }, [categoryId, championshipId, event]);
  return null;
}
