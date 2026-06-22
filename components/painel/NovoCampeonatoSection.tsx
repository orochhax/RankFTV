import { NovoCampeonatoForm } from "./NovoCampeonatoForm";
import type { PageWithStats } from "@/lib/supabase/pages";

type MinhaPage = Pick<PageWithStats, "id" | "nome" | "handle">;

// O wizard inteiro (incluindo a escolha de plano Elite/Padrão) vive no form.
export function NovoCampeonatoSection({ minhasPages }: { minhasPages: MinhaPage[] }) {
  return <NovoCampeonatoForm minhasPages={minhasPages} />;
}
