import { formatBRL } from "./format";

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

export function checkPartnerChangeEligibility(
  context: PartnerChangeRuleContext,
  now = new Date(),
): PartnerChangeEligibility {
  // 1. Ingressos estornados, cancelados ou expirados não aceitam troca
  if (context.statusPagamento && !["pendente", "pago"].includes(context.statusPagamento)) {
    return {
      allowed: false,
      reason: "Este ingresso não aceita mais alterações.",
    };
  }

  // 2. Check-in já realizado trava a alteração
  if (context.checkedIn) {
    return {
      allowed: false,
      reason: "Não é possível alterar a dupla após a realização do check-in no evento.",
    };
  }

  // 3. Proibição explícita pelo organizador no regulamento do campeonato
  if (context.permiteTrocaDupla === false) {
    return {
      allowed: false,
      reason: "O regulamento deste campeonato não permite a alteração de parceiro após a inscrição.",
    };
  }

  // 4. Prazo customizado definido pelo organizador
  if (context.prazoLimiteTrocaDupla) {
    const deadline = new Date(context.prazoLimiteTrocaDupla);
    if (!isNaN(deadline.getTime()) && now.getTime() > deadline.getTime()) {
      const deadlineStr = formatDateTimeBR(context.prazoLimiteTrocaDupla);
      return {
        allowed: false,
        reason: `O prazo limite para troca de dupla encerrou em ${deadlineStr}.`,
        deadlineFormatted: deadlineStr,
      };
    }
  }

  // 5. Chaveamento confirmado da categoria
  if (context.bracketConfirmedAt) {
    return {
      allowed: false,
      reason: "O chaveamento desta categoria já foi confirmado. Não é possível alterar a dupla.",
    };
  }

  // 6. Início do campeonato (limite padrão caso organizador não tenha definido outro prazo)
  if (context.dataInicio) {
    const todaySaoPaulo = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(now);
    if (context.dataInicio <= todaySaoPaulo) {
      return {
        allowed: false,
        reason: "O campeonato já começou. Não é mais possível alterar a dupla.",
      };
    }
  }

  const deadlineFormatted = context.prazoLimiteTrocaDupla
    ? formatDateTimeBR(context.prazoLimiteTrocaDupla)
    : undefined;

  return {
    allowed: true,
    deadlineFormatted,
  };
}
