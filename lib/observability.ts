import { makeOperationalPayload } from "@/lib/observability-core";

export type OperationalEvent = Parameters<typeof makeOperationalPayload>[0] & {
  alert?: boolean;
};

async function postJson(url: string, payload: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`observability_http_${response.status}`);
}

export async function reportOperationalEvent(input: OperationalEvent) {
  const payload = makeOperationalPayload(input);
  const serialized = JSON.stringify(payload);
  if (input.level === "error" || input.level === "critical") console.error(serialized);
  else if (input.level === "warn") console.warn(serialized);
  else console.info(serialized);

  const requests: Promise<unknown>[] = [];
  const providerEndpoint = process.env.OBSERVABILITY_HTTP_ENDPOINT?.trim();
  if (providerEndpoint) {
    requests.push(postJson(providerEndpoint, payload, process.env.OBSERVABILITY_HTTP_TOKEN));
  }

  const alertEndpoint = input.alert ? process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim() : undefined;
  if (alertEndpoint) {
    requests.push(postJson(alertEndpoint, {
      ...payload,
      text: `[RankFTV] ${String(payload.event)}: ${String(payload.message ?? payload.level)}`,
    }));
  }

  if (requests.length > 0) {
    const results = await Promise.allSettled(requests);
    for (const result of results) {
      if (result.status === "rejected") {
        console.warn(JSON.stringify(makeOperationalPayload({
          level: "warn",
          event: "observability.delivery_failed",
          error: result.reason,
        })));
      }
    }
  }

  return payload;
}
