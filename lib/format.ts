// Helpers de formatação — sempre seguindo a convenção do ftv.md (seção 9):
// moeda em BRL como "R$ 1.234,56", valores monetários sempre arredondados.

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const MESES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateBR(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MESES_ABREV[d.getMonth()]} ${d.getFullYear()}`;
}

export function generoLabel(genero: "masculino" | "feminino" | "mista"): string {
  return { masculino: "Masculina", feminino: "Feminina", mista: "Mista" }[genero];
}

// "18 a 19 jul 2026" (mesmo mês) ou "30 jul a 02 ago 2026" (virando o mês).
export function formatDateRangeBR(startISO: string, endISO: string): string {
  if (startISO === endISO) return formatDateBR(startISO);
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} a ${end.getDate()} ${MESES_ABREV[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${formatDateBR(startISO)} a ${formatDateBR(endISO)}`;
}
