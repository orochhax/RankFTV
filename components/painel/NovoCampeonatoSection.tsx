"use client";

import { useState } from "react";
import { ElitePlanCard } from "./ElitePlanCard";
import { NovoCampeonatoForm } from "./NovoCampeonatoForm";
import type { PageWithStats } from "@/lib/supabase/pages";

type MinhaPage = Pick<PageWithStats, "id" | "nome" | "handle">;

export function NovoCampeonatoSection({ minhasPages }: { minhasPages: MinhaPage[] }) {
  const [elite, setElite] = useState(false);

  return (
    <div className="space-y-4">
      <ElitePlanCard elite={elite} onToggle={setElite} />
      <NovoCampeonatoForm minhasPages={minhasPages} elite={elite} />
    </div>
  );
}
