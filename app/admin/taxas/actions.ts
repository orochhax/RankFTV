"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/roles";

export async function salvarTaxas(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase  = await createClient();
  const admin     = createAdminClient();

  if (!(await isAdminUser(supabase))) {
    return { ok: false, error: "Acesso negado." };
  }

  const parse = (key: string) => {
    const v = parseFloat(formData.get(key) as string);
    if (isNaN(v) || v < 0) throw new Error(`Valor inválido para ${key}`);
    return v;
  };

  try {
    const payload = {
      // Plano gratuito
      plataforma_pix_fixo:         parse("plataforma_pix_fixo"),
      plataforma_debito_percent:   parse("plataforma_debito_percent"),
      plataforma_debito_fixo:      parse("plataforma_debito_fixo"),
      plataforma_credito_percent:  parse("plataforma_credito_percent"),
      plataforma_credito_fixo:     parse("plataforma_credito_fixo"),
      atleta_credito_7a12_extra:   parse("atleta_credito_7a12_extra"),
      // Plano premium
      premium_pix_fixo:            parse("premium_pix_fixo"),
      premium_debito_percent:      parse("premium_debito_percent"),
      premium_debito_fixo:         parse("premium_debito_fixo"),
      premium_credito_percent:     parse("premium_credito_percent"),
      premium_credito_fixo:        parse("premium_credito_fixo"),
      updated_at:                  new Date().toISOString(),
    };

    const { error } = await admin
      .from("platform_config")
      .update(payload)
      .eq("id", 1);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  revalidatePath("/admin/taxas");
  return { ok: true };
}
