import { formatBRL } from "./format";

const EURO_AMOUNT = /€\s*([\d.]+(?:,\d{1,2})?)/g;

export function withBRLConversions(text: string, exchangeRate: number): string {
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return text;

  return text.replace(EURO_AMOUNT, (euroText, amountText: string) => {
    const euros = Number(amountText.replaceAll(".", "").replace(",", "."));
    if (!Number.isFinite(euros)) return euroText;
    return `${euroText} (≈ ${formatBRL(euros * exchangeRate)})`;
  });
}
