import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await createAdminClient().rpc("checkout_server_now");
  if (error || typeof data !== "string") {
    return Response.json(
      { error: "server_time_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
  return Response.json(
    { now: data },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
