export interface PartnerChangeRuleContext {
  permiteTrocaDupla?: boolean | null;
  prazoLimiteTrocaDupla?: string | null;
  dataInicio?: string | null;
  bracketConfirmedAt?: string | null;
  checkedIn?: boolean | null;
  statusPagamento?: string | null;
}

export interface PartnerChangeEligibility {
  allowed: boolean;
  reason?: string;
  deadlineFormatted?: string;
}

export function formatDateTimeBR(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

function isOrganizerDeadlineExpired(prazoIso: string, now: Date): boolean {
  const deadline = new Date(prazoIso);
  return !isNaN(deadline.getTime()) && now.getTime() > deadline.getTime();
}

function isChampionshipStarted(dataInicioIso: string, now: Date): boolean {
  const todaySaoPaulo = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(now);
  return dataInicioIso <= todaySaoPaulo;
}

export function checkPartnerChangeEligibility(
  context: PartnerChangeRuleContext,
  now = new Date(),
): PartnerChangeEligibility {
  if (context.statusPagamento && !["pendente", "pago"].includes(context.statusPagamento)) {
    return { allowed: false, reason: "Este ingresso não aceita mais alterações." };
  }

  if (context.checkedIn) {
    return { allowed: false, reason: "Não é possível alterar a dupla após a realização do check-in no evento." };
  }

  if (context.permiteTrocaDupla === false) {
    return { allowed: false, reason: "O regulamento deste campeonato não permite a alteração de parceiro após a inscrição." };
  }

  if (context.prazoLimiteTrocaDupla && isOrganizerDeadlineExpired(context.prazoLimiteTrocaDupla, now)) {
    const deadlineStr = formatDateTimeBR(context.prazoLimiteTrocaDupla);
    return {
      allowed: false,
      reason: `O prazo limite para troca de dupla encerrou em ${deadlineStr}.`,
      deadlineFormatted: deadlineStr,
    };
  }

  if (context.bracketConfirmedAt) {
    return { allowed: false, reason: "O chaveamento desta categoria já foi confirmado. Não é possível alterar a dupla." };
  }

  if (context.dataInicio && isChampionshipStarted(context.dataInicio, now)) {
    return { allowed: false, reason: "O campeonato já começou. Não é mais possível alterar a dupla." };
  }

  const deadlineFormatted = context.prazoLimiteTrocaDupla
    ? formatDateTimeBR(context.prazoLimiteTrocaDupla)
    : undefined;

  return { allowed: true, deadlineFormatted };
}
