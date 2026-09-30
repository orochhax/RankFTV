type DatabaseError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const PARTICIPANT_CONFLICT = /PARTICIPANT_ALREADY_REGISTERED|championship_participant_one_per_category|teams_one_active_category/i;

export function isParticipantCategoryConflict(error: DatabaseError | null | undefined): boolean {
  if (!error || error.code !== "23505") return false;
  return PARTICIPANT_CONFLICT.test([
    error.message,
    error.details,
    error.hint,
  ].filter(Boolean).join(" "));
}

export const participantCategoryConflictMessage =
  "Você ou seu parceiro já possui uma inscrição ativa nesta categoria.";

export function resolveCheckoutAthleteUserId(input: {
  sessionUserId: string | null | undefined;
  profileCpf: string | null | undefined;
  athleteCpf: string;
}): string | null {
  if (!input.sessionUserId) return null;
  const profileCpf = (input.profileCpf ?? "").replace(/\D/g, "");
  const athleteCpf = input.athleteCpf.replace(/\D/g, "");
  if (profileCpf.length !== 11 || athleteCpf.length !== 11) return null;
  return profileCpf === athleteCpf ? input.sessionUserId : null;
}
