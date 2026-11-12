export const DEMO_ARENA_ID = "a1000000-0000-4000-8000-000000000001";
export const DEMO_ARENA_HANDLE = "rank-football";
export const DEMO_ARENA_NOME = "Rank Football";

export function isDemoArenaIdentifier(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === DEMO_ARENA_ID || normalized === DEMO_ARENA_HANDLE;
}
