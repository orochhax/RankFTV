export function formatYoutubeDate(value: string | Date | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    dateStyle: "short",
    timeStyle: "short",
    ...options,
  }).format(new Date(value));
}

export function relativeYoutubeDate(value: string | Date | null) {
  if (!value) return "data desconhecida";
  const diffMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
  const hours = Math.round(diffMinutes / 60);
  if (Math.abs(hours) < 48) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}
