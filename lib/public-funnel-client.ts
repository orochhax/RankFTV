"use client";

import type { PublicFunnelEvent } from "@/lib/public-funnel";

type FunnelPayload = {
  event: PublicFunnelEvent;
  championshipId?: string | null;
  categoryId?: string | null;
};

const SESSION_KEY = "rankftv:funnel-session";

function sessionId() {
  const current = window.sessionStorage.getItem(SESSION_KEY);
  if (current) return current;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function trackPublicFunnel(payload: FunnelPayload) {
  const body = JSON.stringify({
    ...payload,
    sessionId: sessionId(),
    experienceVersion: "discovery_v2",
    occurredAt: new Date().toISOString(),
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/public-funnel", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics/public-funnel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}
