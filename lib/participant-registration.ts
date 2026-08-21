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
