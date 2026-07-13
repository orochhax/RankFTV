import "server-only"; // faz o build quebrar se isso for importado por um Client Component

// Série 4389 do SGS/Banco Central: taxa CDI anualizada (base 252), em %.
// Ex.: valor "14.90" significa 14,90% ao ano — já no formato usado direto
// pela fórmula de lib/personal-finance-investments.ts.
const BCB_CDI_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json";

export type CdiRate = { annual: number; referenceDate: string }; // referenceDate = "YYYY-MM-DD"

type BcbRow = { data: string; valor: string };

function parseBcbDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split("/");
  return `${y}-${m}-${d}`;
}

/**
 * Busca a taxa CDI anual mais recente no Banco Central. Cache de 24h via
 * fetch do Next — nunca bate na API a cada request. Retorna null se a API
 * falhar ou responder algo inesperado; quem chama deve cair pro último valor
 * salvo em personal_finance_investment_settings (fallback).
 */
export async function fetchCdiAnual(): Promise<CdiRate | null> {
  try {
    const res = await fetch(BCB_CDI_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = (await res.json()) as BcbRow[];
    const row = data?.[0];
    if (!row?.valor || !row?.data) return null;

    const annual = parseFloat(row.valor);
    if (!Number.isFinite(annual)) return null;

    return { annual, referenceDate: parseBcbDate(row.data) };
  } catch {
    return null;
  }
}
