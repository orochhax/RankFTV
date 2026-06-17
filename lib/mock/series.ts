export type ChampionshipSeries = {
  id: string;
  nome: string;
  descricao: string;
  estado: string;
  organizadorNome: string;
  seguidores: number;
  edicoes: number;
  bannerFrom: string;
  bannerTo: string;
};

export const SERIES: ChampionshipSeries[] = [
  {
    id: "copa-litoral-ftv",
    nome: "Copa Litoral FTV",
    descricao: "Etapa clássica do litoral paulista, realizada todos os anos em Santos.",
    estado: "SP",
    organizadorNome: "Rafael Andrade",
    seguidores: 2431,
    edicoes: 12,
    bannerFrom: "from-blue-500",
    bannerTo: "to-cyan-400",
  },
  {
    id: "mikasa-open-nacional",
    nome: "Mikasa Open Nacional",
    descricao: "O maior circuito nacional de futevôlei, com etapas em todo o Brasil.",
    estado: "Nacional",
    organizadorNome: "Mikasa Sports BR",
    seguidores: 5120,
    edicoes: 8,
    bannerFrom: "from-violet-500",
    bannerTo: "to-purple-400",
  },
  {
    id: "floripa-beach-cup",
    nome: "Floripa Beach Cup",
    descricao: "Um dos maiores eventos do sul, sempre em agosto na Praia Mole.",
    estado: "SC",
    organizadorNome: "Pedro Matos",
    seguidores: 1843,
    edicoes: 6,
    bannerFrom: "from-emerald-500",
    bannerTo: "to-teal-400",
  },
  {
    id: "circuito-nordeste",
    nome: "Circuito Nordeste FTV",
    descricao: "Reunindo as melhores duplas do nordeste em etapas únicas.",
    estado: "CE",
    organizadorNome: "FTV Nordeste",
    seguidores: 934,
    edicoes: 4,
    bannerFrom: "from-orange-500",
    bannerTo: "to-amber-400",
  },
  {
    id: "torneio-santista",
    nome: "Torneio Internacional de Santos",
    descricao: "Tradição santista com duplas convidadas de outros estados e países.",
    estado: "SP",
    organizadorNome: "Clube de Futevôlei Santos",
    seguidores: 3210,
    edicoes: 15,
    bannerFrom: "from-slate-500",
    bannerTo: "to-slate-400",
  },
];
