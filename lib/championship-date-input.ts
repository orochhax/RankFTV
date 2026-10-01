/**
 * Mantém o campo de término coerente com o início do campeonato.
 * Datas de inputs nativos usam ISO (`YYYY-MM-DD`), portanto a comparação
 * lexicográfica é segura e evita conversão de fuso horário no navegador.
 */
export function championshipEndDateMinimum(startDate: string): string | undefined {
  return startDate || undefined;
}

export function reconcileChampionshipEndDate(startDate: string, endDate: string): string {
  return startDate && endDate < startDate ? "" : endDate;
}
