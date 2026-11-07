/**
 * Configuração dos Planos da Plataforma para Arenas (RankFTV Arena SaaS).
 * Define preços, limites de capacidade, regras de alerta e expansões futuras.
 */

export type ArenaPlatformTierId = "start" | "pro";

export interface ArenaBenefitDetail {
  id: string;
  titulo: string;
  descricaoCurta: string;
  startValor: string;
  proValor: string;
  startIncluso: boolean;
  proIncluso: boolean;
  destaque?: boolean;
}

export interface ArenaPlatformTier {
  id: ArenaPlatformTierId;
  nome: string;
  descricao: string;
  precoMensal: number;
  taxaPorAlunoMes: number;
  limiteAlunos: number | null; // null = ilimitado
  limiteAlertaAlunos: number | null; // gatilho de aviso preventivo
  destaque?: boolean;
}

export const ARENA_PLATFORM_TIERS: Record<ArenaPlatformTierId, ArenaPlatformTier> = {
  start: {
    id: "start",
    nome: "Plano Start",
    descricao: "Ideal para professores e arenas que estão começando a organizar suas turmas.",
    precoMensal: 0,
    taxaPorAlunoMes: 4.90,
    limiteAlunos: 30,
    limiteAlertaAlunos: 25, // Faltando 5 vagas para o teto de 30
  },
  pro: {
    id: "pro",
    nome: "Plano Pro",
    descricao: "A solução completa para arenas em crescimento: alunos ilimitados e automação diária.",
    precoMensal: 139.00,
    taxaPorAlunoMes: 0,
    limiteAlunos: null, // Ilimitado (de 0 a quantos quiser)
    limiteAlertaAlunos: null,
    destaque: true,
  },
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ESTRUTURA PARA EXPANSÕES FUTURAS (Placeholder / Registro arquitetural)
 * ─────────────────────────────────────────────────────────────────────────────
 * No futuro, caso seja necessário segmentar arenas de grande porte:
 * - PLANO ULTRA: Teto de até 150 alunos (ex: R$ 249/mês fixo).
 * - PLANO MAX: Alunos ilimitados + consultoria de campeonatos + suporte dedicado (ex: R$ 399/mês).
 *
 * Exemplo de estrutura preparada:
 * export const ARENA_TIER_ULTRA_PLACEHOLDER = {
 *   id: "ultra",
 *   nome: "Plano Ultra",
 *   precoMensal: 249.00,
 *   limiteAlunos: 150,
 *   taxaPorAlunoMes: 0,
 * };
 * export const ARENA_TIER_MAX_PLACEHOLDER = {
 *   id: "max",
 *   nome: "Plano Max",
 *   precoMensal: 399.00,
 *   limiteAlunos: null,
 *   taxaPorAlunoMes: 0,
 * };
 */

/**
 * Lista dos 9 Benefícios comparativos entre Start e Pro.
 * NOTA: O "Selo de Verificado & Topo da Busca" está estrategicamente posicionado
 * na posição #3 para máximo destaque visual.
 */
export const ARENA_BENEFITS_COMPARISON: ArenaBenefitDetail[] = [
  {
    id: "limite_alunos",
    titulo: "Limite de Alunos Ativos",
    descricaoCurta: "Capacidade máxima de alunos simultâneos matriculados nas turmas da sua arena.",
    startValor: "Até 30 alunos",
    proValor: "Ilimitado",
    startIncluso: true,
    proIncluso: true,
  },
  {
    id: "taxa_aluno",
    titulo: "Taxa por Aluno Ativo",
    descricaoCurta: "Valor cobrado mensalmente por cada aluno ativo gerenciado no sistema.",
    startValor: "R$ 4,90 por aluno / mês (recorrente)",
    proValor: "R$ 0,00 (100% isento)",
    startIncluso: true,
    proIncluso: true,
  },
  {
    id: "selo_verificado",
    titulo: "Selo de Verificado & Topo da Busca",
    descricaoCurta: "Sua arena ganha o selo oficial de confiança e aparece com destaque prioritário no topo quando atletas buscarem arenas na sua cidade.",
    startValor: "Listagem padrão",
    proValor: "Selo Oficial Dourado + Topo da Busca",
    startIncluso: false,
    proIncluso: true,
    destaque: true,
  },
  {
    id: "lembretes_whatsapp",
    titulo: "Lembretes Automáticos no WhatsApp",
    descricaoCurta: "Notificações automáticas enviadas para os alunos com chave Pix Copia e Cola antes e no dia do vencimento. Zero constrangimento de cobrança manual.",
    startValor: "Não incluso",
    proValor: "Cobranças & Pix automáticos",
    startIncluso: false,
    proIncluso: true,
  },
  {
    id: "acessos_equipe",
    titulo: "Acessos de Professores e Equipe",
    descricaoCurta: "Contas e logins separados para cada professor da arena, permitindo que cada um gerencie sua própria chamada e turmas.",
    startValor: "1 Professor / Dono",
    proValor: "Professores e Gerentes Ilimitados",
    startIncluso: true,
    proIncluso: true,
  },
  {
    id: "reposicao_vagas",
    titulo: "Reposição Automática de Vagas",
    descricaoCurta: "Quando um aluno desmarca com antecedência no app, a vaga é liberada automaticamente para outro aluno agendar reposição, mantendo a quadra sempre cheia.",
    startValor: "Manual via WhatsApp",
    proValor: "100% Automática pelo app",
    startIncluso: false,
    proIncluso: true,
  },
  {
    id: "radar_evasao",
    titulo: "Radar Anti-Desistência (Evasão)",
    descricaoCurta: "Alertas inteligentes quando um aluno falta 3 treinos seguidos, com botão direto para enviar uma mensagem acolhedora no WhatsApp antes dele cancelar.",
    startValor: "Não incluso",
    proValor: "Alertas inteligentes no painel",
    startIncluso: false,
    proIncluso: true,
  },
  {
    id: "torneios_internos",
    titulo: "Torneios Internos & Rei da Praia",
    descricaoCurta: "Crie copinhas internas e desafios de Rei da Praia em 2 minutos, com sorteio de duplas e tabela de chaveamento automática do RankFTV.",
    startValor: "Não incluso",
    proValor: "Ilimitados com chaveamento auto",
    startIncluso: false,
    proIncluso: true,
  },
  {
    id: "relatorios_dre",
    titulo: "Relatórios Financeiros & DRE",
    descricaoCurta: "Acompanhe a previsão de receita recorrente (MRR), taxa de ocupação das quadras por horário e exporte tudo para Excel para o seu contador.",
    startValor: "Resumo básico",
    proValor: "Relatório gerencial completo",
    startIncluso: false,
    proIncluso: true,
  },
];

export interface ArenaCapacidadeStatus {
  tierId: ArenaPlatformTierId;
  totalAlunosAtivos: number;
  limiteMaximo: number | null;
  vagasRestantes: number | null;
  percentualOcupacao: number;
  isAviso: boolean;
  isBloqueado: boolean;
  mensagem: string;
}

/**
 * Avalia a capacidade de alunos ativos de uma arena com base no seu plano atual.
 * - Start: 0 a 30 alunos.
 * - Avisos preventivos: a partir de 25 alunos (<= 5 vagas restantes).
 * - Bloqueio de novas inscrições: aos 30 alunos.
 * - Pro: ilimitado.
 */
export function avaliarCapacidadeArena(
  totalAlunosAtivos: number,
  tierId: ArenaPlatformTierId = "start"
): ArenaCapacidadeStatus {
  const tier = ARENA_PLATFORM_TIERS[tierId] ?? ARENA_PLATFORM_TIERS.start;

  if (tier.limiteAlunos === null) {
    // Plano Pro ou ilimitado
    return {
      tierId,
      totalAlunosAtivos,
      limiteMaximo: null,
      vagasRestantes: null,
      percentualOcupacao: 0,
      isAviso: false,
      isBloqueado: false,
      mensagem: "Plano Pro com capacidade ilimitada de alunos.",
    };
  }

  const limite = tier.limiteAlunos;
  const vagasRestantes = Math.max(0, limite - totalAlunosAtivos);
  const percentualOcupacao = Math.min(100, Math.round((totalAlunosAtivos / limite) * 100));
  const isBloqueado = totalAlunosAtivos >= limite;
  const isAviso = !isBloqueado && tier.limiteAlertaAlunos !== null && totalAlunosAtivos >= tier.limiteAlertaAlunos;

  let mensagem = `${totalAlunosAtivos} de ${limite} alunos ativos (${vagasRestantes} vagas restantes).`;
  if (isBloqueado) {
    mensagem = `Limite de ${limite} alunos atingido no Plano Start. Novas inscrições de alunos estão travadas. Faça o upgrade para o Plano Pro para ter alunos ilimitados.`;
  } else if (isAviso) {
    mensagem = `Atenção: restam apenas ${vagasRestantes} vagas para o limite de ${limite} alunos do Plano Start. Garanta inscrições ilimitadas com o Plano Pro.`;
  }

  return {
    tierId,
    totalAlunosAtivos,
    limiteMaximo: limite,
    vagasRestantes,
    percentualOcupacao,
    isAviso,
    isBloqueado,
    mensagem,
  };
}
