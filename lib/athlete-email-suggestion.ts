export type AthleteEmailField = "comprador_email" | "parceiro_email";

/**
 * Atualiza somente o e-mail do atleta escolhido. A mesma função atende o
 * clique na sugestão da conta e as edições manuais feitas depois no campo.
 */
export function setAthleteEmail(
  currentValues: Record<string, string>,
  field: AthleteEmailField,
  email: string,
): Record<string, string> {
  return { ...currentValues, [field]: email };
}
