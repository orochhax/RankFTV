// Calendário REAL da temporada 2026 de futevôlei (circuitos Brasil Open, IRL,
// Circuito Brasileiro de Futevôlei e BSW Cup). São eventos informativos — não
// são campeonatos da nossa plataforma, então não têm inscrição nem página de
// detalhe. Quando um evento ainda não tem sede, cidade fica "Local a definir"
// e estado vazio.
//
// Datas e cidades vêm do calendário oficial; os nomes de circuito são a melhor
// leitura dos logos e podem ser ajustados.

export type RealEvent = {
  id: string;
  circuito: string; // nome do circuito/série (vira o título no chip)
  cidade: string; // "Local a definir" quando ainda não anunciado
  estado: string; // "" quando o local não foi definido
  dataInicio: string; // "YYYY-MM-DD"
  dataFim: string; // "YYYY-MM-DD"
};

export const REAL_EVENTS: RealEvent[] = [
  // ── 1º semestre ───────────────────────────────────────────────
  { id: "ev-2026-02-xangrila",     circuito: "BSW Cup",                          cidade: "Xangri-lá",       estado: "RS", dataInicio: "2026-02-06", dataFim: "2026-02-08" },
  { id: "ev-2026-02-joao-pessoa",  circuito: "IRL",                              cidade: "João Pessoa",     estado: "PB", dataInicio: "2026-02-26", dataFim: "2026-03-01" },
  { id: "ev-2026-03-nova-lima",    circuito: "Brasil Open",                      cidade: "Nova Lima",       estado: "MG", dataInicio: "2026-03-13", dataFim: "2026-03-15" },
  { id: "ev-2026-03-cuiaba",       circuito: "Circuito Brasileiro de Futevôlei", cidade: "Cuiabá",          estado: "MT", dataInicio: "2026-03-26", dataFim: "2026-03-29" },
  { id: "ev-2026-05-sorriso",      circuito: "IRL",                              cidade: "Sorriso",         estado: "MT", dataInicio: "2026-05-14", dataFim: "2026-05-17" },
  { id: "ev-2026-05-cuiaba",       circuito: "Brasil Open",                      cidade: "Cuiabá",          estado: "MT", dataInicio: "2026-05-29", dataFim: "2026-05-31" },
  { id: "ev-2026-06-icara",        circuito: "IRL",                              cidade: "Içara",           estado: "SC", dataInicio: "2026-06-11", dataFim: "2026-06-14" },
  { id: "ev-2026-06-bh",           circuito: "Brasil Open",                      cidade: "Belo Horizonte",  estado: "MG", dataInicio: "2026-06-18", dataFim: "2026-06-21" },
  { id: "ev-2026-07-porto-alegre", circuito: "BSW Cup",                          cidade: "Porto Alegre",    estado: "RS", dataInicio: "2026-07-16", dataFim: "2026-07-19" },

  // ── 2º semestre ───────────────────────────────────────────────
  { id: "ev-2026-08-a",            circuito: "Brasil Open",                      cidade: "Local a definir", estado: "",   dataInicio: "2026-08-14", dataFim: "2026-08-16" },
  { id: "ev-2026-08-b",            circuito: "IRL",                              cidade: "Local a definir", estado: "",   dataInicio: "2026-08-21", dataFim: "2026-08-23" },
  { id: "ev-2026-09-palmas",       circuito: "Circuito Brasileiro de Futevôlei", cidade: "Palmas",          estado: "TO", dataInicio: "2026-09-11", dataFim: "2026-09-13" },
  { id: "ev-2026-09-sorriso",      circuito: "Circuito Brasileiro de Futevôlei", cidade: "Sorriso",         estado: "MT", dataInicio: "2026-09-18", dataFim: "2026-09-20" },
  { id: "ev-2026-10-a",            circuito: "Brasil Open",                      cidade: "Local a definir", estado: "",   dataInicio: "2026-10-23", dataFim: "2026-10-25" },
  { id: "ev-2026-10-nov",          circuito: "IRL",                              cidade: "Local a definir", estado: "",   dataInicio: "2026-10-30", dataFim: "2026-11-01" },
  { id: "ev-2026-11-a",            circuito: "Brasil Open",                      cidade: "Local a definir", estado: "",   dataInicio: "2026-11-13", dataFim: "2026-11-15" },
  { id: "ev-2026-11-b",            circuito: "BSW Cup",                          cidade: "Local a definir", estado: "",   dataInicio: "2026-11-20", dataFim: "2026-11-22" },
  { id: "ev-2026-12-rio",          circuito: "IRL",                              cidade: "Rio de Janeiro",  estado: "RJ", dataInicio: "2026-12-18", dataFim: "2026-12-20" },
];
