const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isValidAthleteName(value: string | null | undefined): boolean {
  const name = value?.trim() ?? "";
  return name.length > 0 && !EMAIL_LIKE.test(name);
}

export function athleteDisplayName(value: string | null | undefined): string {
  const name = value?.trim() ?? "";
  return isValidAthleteName(name) ? name : "Atleta não informado";
}
