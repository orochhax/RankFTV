import {
  Building2,
  CalendarCheck,
  CreditCard,
  LayoutGrid,
  Network,
  QrCode,
  Shirt,
  Smartphone,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

export type ParaVoceTab = "campeonato" | "arena";

export type BenefitItem = {
  icon: typeof Trophy;
  titulo: string;
  descricao: string;
  tag: string;
};

export type HighlightItem = {
  valor: string;
  titulo: string;
  detalhe: string;
};

export type TabCopy = {
  heroTitle: string;
  heroSubtitle: string;
  highlights: HighlightItem[];
  benefitsEyebrow: string;
  benefitsHeading: string;
  benefits: BenefitItem[];
  finalHeading: string;
  finalSubtitle: string;
  switchLabel: string;
};

export const PARA_VOCE_CONTENT: Record<ParaVoceTab, TabCopy> = {
  campeonato: {
    heroTitle: "Organize campeonatos profissionais do anúncio ao pódio",
    heroSubtitle:
      "Publique sem mensalidade fixa, receba inscrições via Pix ou cartão em até 12x, conduza jogos quadra a quadra e acompanhe o lucro real no bolso.",
    highlights: [
      {
        valor: "R$ 0 / mês",
        titulo: "Sem mensalidade fixa",
        detalhe: "Crie rascunho grátis e publique sem assinatura mensal.",
      },
      {
        valor: "100% do ingresso",
        titulo: "Valor cheio para você",
        detalhe: "Taxa de serviço é paga pelo comprador no checkout.",
      },
      {
        valor: "Até 70% antes",
        titulo: "Saque rápido via Pix",
        detalhe: "Adiantamento pré-evento e 30% liberados 2 dias úteis após o fim.",
      },
    ],
    benefitsEyebrow: "Benefícios para organizadores",
    benefitsHeading: "Tudo para vender mais inscrições e rodar o torneio sem sufoco",
    benefits: [
      {
        icon: CreditCard,
        titulo: "Inscrições Online, Lotes & Cupons",
        descricao:
          "Atletas pagam via Pix ou cartão em até 12x com virada automática de lotes, cupons promocionais e fila de espera FIFO.",
        tag: "Venda sem WhatsApp",
      },
      {
        icon: Wallet,
        titulo: "Central Financeira Cockpit & DRE",
        descricao:
          "Acompanhe faturamento líquido, despesas lançadas, lucro real no bolso, gráficos financeiros e exportação customizada em CSV e PDF.",
        tag: "Controle financeiro real",
      },
      {
        icon: Network,
        titulo: "Chaveamento & Telão ao Vivo",
        descricao:
          "Monte grupos e dupla eliminação com placar por set em tempo real para atletas e plateia acompanharem no celular.",
        tag: "Sem planilha na mesa",
      },
      {
        icon: LayoutGrid,
        titulo: "Operação ao Vivo por Quadras",
        descricao:
          "Organize a fila de jogos por quadra em um quadro visual simples, chamando duplas e registrando vencedores na hora.",
        tag: "Fluxo ágil no dia",
      },
      {
        icon: QrCode,
        titulo: "Check-in Digital por QR Code",
        descricao:
          "Leitor único na portaria para dar baixa rápida tanto nas credenciais individuais dos atletas quanto nos ingressos da plateia.",
        tag: "Portaria sem fila",
      },
      {
        icon: Shirt,
        titulo: "Camisas, Equipe & Plateia",
        descricao:
          "Contagem automática de camisas por tamanho, acessos dedicados para equipe/staff e monetização com ingressos de arquibancada.",
        tag: "Operação 360°",
      },
    ],
    finalHeading: "Coloque seu próximo campeonato no ar hoje",
    finalSubtitle:
      "Salve o rascunho gratuitamente, monte suas categorias e libere as inscrições quando estiver tudo pronto.",
    switchLabel: "Ver benefícios para Arena",
  },
  arena: {
    heroTitle: "Gerencie sua arena com menos trabalho manual e turmas cheias",
    heroSubtitle:
      "Organize alunos, chamada pelo celular, aluguéis de quadra e cobranças recorrentes com Pix no WhatsApp em um painel feito para o dia a dia da areia.",
    highlights: [
      {
        valor: "2 minutos",
        titulo: "Onboarding sem cartão",
        detalhe: "Cadastre sua estrutura em 2 etapas rápidas e libere seu painel.",
      },
      {
        valor: "100% da mensalidade",
        titulo: "Direto para sua arena",
        detalhe: "O valor das mensalidades dos alunos fica integralmente com você.",
      },
      {
        valor: "Start ou Pro",
        titulo: "Escale no seu ritmo",
        detalhe: "Comece sem custo fixo no Start ou ative alunos ilimitados no Pro.",
      },
    ],
    benefitsEyebrow: "Benefícios para donos de arena",
    benefitsHeading: "Tudo para profissionalizar suas turmas e parar de cobrar aluno no braço",
    benefits: [
      {
        icon: CreditCard,
        titulo: "Zero Constrangimento de Cobrança",
        descricao:
          "Envie lembretes automáticos no WhatsApp com Pix Copia e Cola antes e no dia do vencimento para reduzir inadimplência (Plano Pro).",
        tag: "Cobrança automática",
      },
      {
        icon: Smartphone,
        titulo: "Chamada & Reposição pelo Celular",
        descricao:
          "Registre presença direto da quadra em segundos e acompanhe reposições sem depender de fichas de papel ou planilhas.",
        tag: "Na palma da mão",
      },
      {
        icon: TrendingUp,
        titulo: "Radar Anti-Desistência",
        descricao:
          "Receba alertas quando alunos acumulam faltas consecutivas para agir rápido e proteger a receita recorrente do seu CT (Plano Pro).",
        tag: "Retenção de alunos",
      },
      {
        icon: CalendarCheck,
        titulo: "Aluguéis de Quadra & Diárias Avulsas",
        descricao:
          "Controle horários disponíveis para aluguel, reservas avulsas e diárias de treino no mesmo ambiente.",
        tag: "Agenda unificada",
      },
      {
        icon: Trophy,
        titulo: "Torneios Internos & Rei da Praia",
        descricao:
          "Promova competições entre turmas e eventos internos da sua comunidade direto no painel da arena (Plano Pro).",
        tag: "Engajamento na areia",
      },
      {
        icon: Users,
        titulo: "Equipe Multi-Professor & Busca Regional",
        descricao:
          "Dê logins separados para professores e apareça para atletas da sua região com Selo Verificado no diretório RankFTV.",
        tag: "Visibilidade regional",
      },
    ],
    finalHeading: "Configure sua arena em menos de 2 minutos",
    finalSubtitle:
      "Experimente o painel completo com turmas, presenças, aluguéis e cobranças em um só lugar.",
    switchLabel: "Ver benefícios para Campeonato",
  },
};

export function resolveParaVoceCtas(
  tab: ParaVoceTab,
  isLoggedIn: boolean,
  hasArena: boolean,
) {
  if (tab === "campeonato") {
    return {
      primary: {
        href: isLoggedIn ? "/painel/novo-campeonato" : "/cadastro?modo=organizador",
        label: isLoggedIn ? "Criar meu campeonato" : "Criar conta de organizador",
      },
      secondary: isLoggedIn
        ? { href: "/painel", label: "Ir para meus campeonatos" }
        : { href: "/login?next=/painel/novo-campeonato", label: "Já tenho conta · Entrar" },
    };
  }

  return {
    primary: {
      href: hasArena
        ? "/arena"
        : isLoggedIn
          ? "/arenas/cadastro"
          : "/cadastro?next=/arenas/cadastro",
      label: hasArena
        ? "Acessar painel da minha arena"
        : isLoggedIn
          ? "Cadastrar minha arena grátis"
          : "Criar conta e cadastrar arena",
    },
    secondary: isLoggedIn
      ? { href: "/arenas", label: "Ver diretório de arenas" }
      : { href: "/login?next=/arenas/cadastro", label: "Já tenho conta · Entrar" },
  };
}

export const TAB_ICONS: Record<ParaVoceTab, typeof Trophy> = {
  campeonato: Trophy,
  arena: Building2,
};
