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
    proValor: "Ilimitados",
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
    id: "lembretes_email",
    titulo: "Lembretes Automáticos por E-mail",
    descricaoCurta: "Notificações automáticas enviadas para os alunos com link de pagamento e Pix antes e no vencimento.",
    startValor: "Não incluso",
    proValor: "Disparo automático por e-mail",
    startIncluso: false,
    proIncluso: true,
  },
  {
    id: "reposicao_vagas",
    titulo: "Reposição de Aulas & Fila de Espera",
    descricaoCurta: "Gestão inteligente de vagas quando um aluno avisa ausência com antecedência no app.",
    startValor: "Vaga avulsa aberta",
    proValor: "Fila Inteligente (3 vagas, 30 min cada)",
    startIncluso: true,
    proIncluso: true,
  },
  {
    id: "torneios_internos",
    titulo: "Torneios Internos & Rei da Praia",
    descricaoCurta: "Crie copinhas internas e desafios de Rei da Praia em 2 minutos, com sorteio de duplas e chaveamento automático do RankFTV.",
    startValor: "Não incluso",
    proValor: "Ilimitados com chaveamento auto",
    startIncluso: false,
    proIncluso: true,
  },
  {
    id: "radar_evasao",
    titulo: "Radar de Frequência & Retenção",
    descricaoCurta: "Alertas inteligentes quando um aluno falta múltiplos treinos seguidos, permitindo reengajamento proativo.",
    startValor: "Não incluso",
    proValor: "Alertas inteligentes no painel",
    startIncluso: false,
    proIncluso: true,
  },
  {
    id: "relatorios_dre",
    titulo: "Relatórios Financeiros & Exportação",
    descricaoCurta: "Extratos detalhados com filtros e exportação para Excel para seu controle contábil.",
    startValor: "Totais básicos",
    proValor: "Relatórios completos com exportação Excel",
    startIncluso: false,
    proIncluso: true,
  },
  {
    id: "pagina_diretorio",
    titulo: "Página Pública da Arena no Diretório",
    descricaoCurta: "Perfil indexado na busca de arenas por cidade em rankftv.com com fotos, endereço e botão de matrícula.",
    startValor: "Incluso",
    proValor: "Incluso",
    startIncluso: true,
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
