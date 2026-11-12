export type RiscoEvasao = "critico" | "atencao" | "saudavel";

export type RadarStudentInput = {
  userId: string;
  nome: string;
  username: string;
  telefone: string | null;
  dataEntrada: string | null;
  valorMensalidade: number | null;
  planoNome: string | null;
};

export type RadarAttendanceInput = {
  userId: string;
  data: string; // YYYY-MM-DD
  status: string;
};

export type RadarChargeInput = {
  userId: string;
  statusPagamento: string;
  competencia: string;
  valor: number;
};

export type RadarAlunoAlerta = {
  userId: string;
  nome: string;
  username: string;
  telefone: string | null;
  planoNome: string | null;
  mensalidade: number;
  ultimoTreinoISO: string | null;
  diasSemTreinar: number;
  aulasUltimos30d: number;
  aulas30a60d: number;
  cobrancaPendente: boolean;
  risco: RiscoEvasao;
  motivo: string;
  acaoSugerida: string;
  mensagemWhatsapp: string;
};

export type RadarEvasaoReport = {
  todayISO: string;
  resumo: {
    totalAtivos: number;
    emAlerta: number;
    riscoCritico: number;
    riscoAtencao: number;
    saudaveis: number;
    receitaMensalEmRisco: number;
    taxaEngajamentoPercent: number;
  };
  alunos: RadarAlunoAlerta[];
};

function parseISODateUTC(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function diffDaysISO(fromISO: string, toISO: string): number {
  const from = parseISODateUTC(fromISO);
  const to = parseISODateUTC(toISO);
  if (!from || !to) return 0;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

export function shiftDaysISO(iso: string, deltaDays: number): string {
  const base = parseISODateUTC(iso) ?? new Date();
  const next = new Date(base.getTime() + deltaDays * 86_400_000);
  return next.toISOString().slice(0, 10);
}

const RISCO_ORDEM: Record<RiscoEvasao, number> = {
  critico: 0,
  atencao: 1,
  saudavel: 2,
};

/**
 * Calcula risco de evasão aluno a aluno combinando recência de check-in,
 * queda de frequência entre os últimos 30 dias e os 30 anteriores,
 * e pendência financeira recente.
 */
export function buildRadarEvasaoReport({
  arenaNome,
  students,
  attendance,
  charges,
  todayISO,
}: {
  arenaNome: string;
  students: RadarStudentInput[];
  attendance: RadarAttendanceInput[];
  charges: RadarChargeInput[];
  todayISO: string;
}): RadarEvasaoReport {
  const corte30d = shiftDaysISO(todayISO, -29);
  const corte60d = shiftDaysISO(todayISO, -59);
  const corteAntes30d = shiftDaysISO(todayISO, -30);

  const presencasPorAluno = new Map<string, string[]>();
  for (const row of attendance) {
    if (row.data > todayISO) continue;
    if (row.status !== "presente" && row.status !== "reservado") continue;
    const list = presencasPorAluno.get(row.userId) ?? [];
    list.push(row.data);
    presencasPorAluno.set(row.userId, list);
  }

  const pendentePorAluno = new Set<string>();
  for (const ch of charges) {
    if (ch.statusPagamento === "pendente") {
      pendentePorAluno.add(ch.userId);
    }
  }

  const alunos: RadarAlunoAlerta[] = students.map((student) => {
    const datas = (presencasPorAluno.get(student.userId) ?? []).sort();
    const ultimoTreinoISO = datas.length > 0 ? datas[datas.length - 1] : null;
    const referenciaRecencia = ultimoTreinoISO ?? student.dataEntrada ?? todayISO;
    const diasSemTreinar = diffDaysISO(referenciaRecencia, todayISO);

    const aulasUltimos30d = datas.filter((d) => d >= corte30d && d <= todayISO).length;
    const aulas30a60d = datas.filter((d) => d >= corte60d && d <= corteAntes30d).length;
    const cobrancaPendente = pendentePorAluno.has(student.userId);
    const mensalidade = Number(student.valorMensalidade ?? 0);

    const quedaBrusca = aulas30a60d >= 4 && aulasUltimos30d === 0;
    const quedaMetade = aulas30a60d >= 4 && aulasUltimos30d <= Math.floor(aulas30a60d / 2);

    let risco: RiscoEvasao = "saudavel";
    let motivo = "Frequência estável nos treinos recentes.";
    let acaoSugerida = "Manter acompanhamento normal.";

    if (
      diasSemTreinar >= 21 ||
      (diasSemTreinar >= 14 && (cobrancaPendente || quedaBrusca))
    ) {
      risco = "critico";
      if (!ultimoTreinoISO) {
        motivo = `Matriculado há ${diasSemTreinar} dias e ainda não realizou o primeiro check-in.`;
      } else if (quedaBrusca && cobrancaPendente) {
        motivo = `Há ${diasSemTreinar} dias sem treinar (fazia ${aulas30a60d} aulas/mês) e com mensalidade em aberto.`;
      } else if (quedaBrusca) {
        motivo = `Há ${diasSemTreinar} dias sem aparecer — caiu de ${aulas30a60d} treinos para 0 nos últimos 30 dias.`;
      } else {
        motivo = `Ausente há ${diasSemTreinar} dias consecutivos na areia.`;
      }
      acaoSugerida = "Enviar mensagem acolhedora hoje e oferecer horário experimental com a turma.";
    } else if (diasSemTreinar >= 10 || quedaMetade || cobrancaPendente) {
      risco = "atencao";
      if (diasSemTreinar >= 10 && quedaMetade) {
        motivo = `${diasSemTreinar} dias desde o último treino; ritmo caiu de ${aulas30a60d} para ${aulasUltimos30d} aulas.`;
      } else if (diasSemTreinar >= 10) {
        motivo = `${diasSemTreinar} dias sem check-in na arena.`;
      } else if (cobrancaPendente) {
        motivo = "Mensalidade atual em aberto — risco de interrupção no próximo ciclo.";
      } else {
        motivo = `Queda de ritmo: ${aulasUltimos30d} aulas nos últimos 30d vs. ${aulas30a60d} no período anterior.`;
      }
      acaoSugerida = "Convidar para o treino desta semana antes de completar 21 dias fora.";
    }

    const primeiroNome = (student.nome || "Atleta").trim().split(/\s+/)[0];
    const mensagemWhatsapp =
      risco === "critico"
        ? `Fala, ${primeiroNome}! Tudo bem? Sentimos sua falta aqui na ${arenaNome} — já faz ${diasSemTreinar} dias do seu último treino. Quer que eu já reserve sua vaga na turma dessa semana?`
        : risco === "atencao"
          ? `Oi, ${primeiroNome}! Tudo certo? Vimos que sua frequência deu uma diminuída nos últimos dias aqui na ${arenaNome}. Bora voltar para a areia essa semana?`
          : `Fala, ${primeiroNome}! Show de bola sua constância nos treinos da ${arenaNome}!`;

    return {
      userId: student.userId,
      nome: student.nome,
      username: student.username,
      telefone: student.telefone,
      planoNome: student.planoNome,
      mensalidade,
      ultimoTreinoISO,
      diasSemTreinar,
      aulasUltimos30d,
      aulas30a60d,
      cobrancaPendente,
      risco,
      motivo,
      acaoSugerida,
      mensagemWhatsapp,
    };
  });

  alunos.sort((a, b) => {
    const diffOrdem = RISCO_ORDEM[a.risco] - RISCO_ORDEM[b.risco];
    if (diffOrdem !== 0) return diffOrdem;
    if (b.diasSemTreinar !== a.diasSemTreinar) return b.diasSemTreinar - a.diasSemTreinar;
    return b.mensalidade - a.mensalidade;
  });

  const riscoCritico = alunos.filter((a) => a.risco === "critico").length;
  const riscoAtencao = alunos.filter((a) => a.risco === "atencao").length;
  const saudaveis = alunos.filter((a) => a.risco === "saudavel").length;
  const emAlerta = riscoCritico + riscoAtencao;
  const totalAtivos = alunos.length;
  const receitaMensalEmRisco = alunos
    .filter((a) => a.risco !== "saudavel")
    .reduce((acc, a) => acc + a.mensalidade, 0);
  const taxaEngajamentoPercent =
    totalAtivos > 0 ? Math.round((saudaveis / totalAtivos) * 100) : 100;

  return {
    todayISO,
    resumo: {
      totalAtivos,
      emAlerta,
      riscoCritico,
      riscoAtencao,
      saudaveis,
      receitaMensalEmRisco,
      taxaEngajamentoPercent,
    },
    alunos,
  };
}
