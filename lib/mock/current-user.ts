import { getAthleteById } from "./athletes";

// Ainda não tem login de verdade (isso entra com o Supabase Auth — ver ftv.md
// seção 8.2). Por enquanto, fixamos "quem está logado" pra dar vida ao
// protótipo: Lucas Andrade, que joga E organiza um campeonato (mostra bem a
// ideia de conta única atleta+organizador da seção 2 do ftv.md).
export const CURRENT_ATHLETE_ID = "a01";

export function getCurrentAthlete() {
  const athlete = getAthleteById(CURRENT_ATHLETE_ID);
  if (!athlete) throw new Error("Atleta demo não encontrado — checar lib/mock/athletes.ts");
  return athlete;
}

// Campos "privados" do Profile (ftv.md seção 6) que só aparecem pro próprio
// dono, na página /perfil — nunca no perfil público (/atletas/[username]).
export const CURRENT_USER_PRIVATE_INFO = {
  email: "lucas.andrade@example.com",
  telefone: "(13) 99876-5432",
  tamanhoCamisa: "M",
  parceiroFixoId: "a03",
};

export type Notification = {
  id: string;
  texto: string;
  data: string; // ISO
  lida: boolean;
};

export const CURRENT_USER_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    texto: "Sua dupla com Gabriel Costa foi confirmada na Copa Litoral FTV.",
    data: "2026-06-10",
    lida: false,
  },
  {
    id: "n2",
    texto: "Inscrições abertas para o Torneio Internacional de Santos.",
    data: "2026-06-05",
    lida: false,
  },
  {
    id: "n3",
    texto: "Sua dupla com Leonardo Ribeiro foi confirmada no Torneio Internacional de Santos.",
    data: "2026-06-02",
    lida: true,
  },
];
