import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type VercelConfig = {
  crons?: { path?: string; schedule?: string }[];
};

test("Vercel Hobby keeps every configured cron at a daily cadence", () => {
  const config = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  ) as VercelConfig;

  assert.ok(config.crons?.length, "vercel.json must declare the production jobs");
  for (const cron of config.crons) {
    assert.match(cron.path ?? "", /^\/api\/cron\//);
    assert.match(
      cron.schedule ?? "",
      /^\d{1,2} \d{1,2} \* \* \*$/,
      `${cron.path ?? "cron"} must run at most once per day on Vercel Hobby`,
    );
  }
});
