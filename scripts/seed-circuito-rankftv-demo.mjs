import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CHAMPIONSHIP_ID = "c1000000-0000-4000-8000-000000000001";
const CEO_USER_ID     = "f58de881-3c02-4748-847c-d4d945e527a8";
const CAT_OPEN_PRO_ID = "c1000000-0000-4000-8000-000000000010";
const CAT_A_ID        = "c1000000-0000-4000-8000-000000000011";
const CAT_B_ID        = "c1000000-0000-4000-8000-000000000012";
const CAT_MISTO_ID    = "c1000000-0000-4000-8000-000000000013";

const TICKET_ARQUIBANCADA_ID = "c1000000-0000-4000-8000-000000000020";
const TICKET_CAMAROTE_ID    = "c1000000-0000-4000-8000-000000000021";
const TICKET_COMBO_ID       = "c1000000-0000-4000-8000-000000000022";
const TICKET_PASSAPORTE_ID  = "c1000000-0000-4000-8000-000000000023";

function loadLocalEnv() {
  const raw = readFileSync(".env.local");
  const contents = raw[0] === 0xff && raw[1] === 0xfe
    ? raw.toString("utf16le")
    : raw.toString("utf8");
  for (const sourceLine of contents.split(/\r?\n/)) {
    const line = sourceLine.replace(/^\uFEFF/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadLocalEnv();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseSecretKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Supabase credentials not found in .env.local");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseSecretKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function generateBracketMatchesForCategory(championshipId, categoryId, participants, courtNames) {
  const p = participants;
  return [
    // Oitavas de Final (8 partidas)
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 0,
      match_index: 0,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: courtNames[0],
      participant_a_id: p[0].id,
      participant_b_id: p[15].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 12 }, { a: 18, b: 14 }],
      winner_participant_id: p[0].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 0,
      match_index: 1,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: courtNames[1],
      participant_a_id: p[1].id,
      participant_b_id: p[14].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 16 }, { a: 15, b: 18 }, { a: 18, b: 13 }],
      winner_participant_id: p[1].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 0,
      match_index: 2,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: courtNames[2],
      participant_a_id: p[2].id,
      participant_b_id: p[13].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 11 }, { a: 18, b: 13 }],
      winner_participant_id: p[2].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 0,
      match_index: 3,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: courtNames[3],
      participant_a_id: p[3].id,
      participant_b_id: p[12].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 15 }, { a: 16, b: 18 }, { a: 18, b: 14 }],
      winner_participant_id: p[3].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 0,
      match_index: 4,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: courtNames[0],
      participant_a_id: p[4].id,
      participant_b_id: p[11].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 14 }, { a: 18, b: 15 }],
      winner_participant_id: p[4].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 0,
      match_index: 5,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: courtNames[1],
      participant_a_id: p[5].id,
      participant_b_id: p[10].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 13 }, { a: 18, b: 16 }],
      winner_participant_id: p[5].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 0,
      match_index: 6,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: courtNames[2],
      participant_a_id: p[6].id,
      participant_b_id: p[9].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 17 }, { a: 14, b: 18 }, { a: 18, b: 15 }],
      winner_participant_id: p[6].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 0,
      match_index: 7,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: courtNames[3],
      participant_a_id: p[7].id,
      participant_b_id: p[8].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 12 }, { a: 18, b: 15 }],
      winner_participant_id: p[7].id,
      operational_status: "finished",
    },

    // Quartas de Final (4 partidas)
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 1,
      match_index: 0,
      bracket_section: "winners",
      section_round_index: 1,
      court_label: courtNames[0],
      participant_a_id: p[0].id,
      participant_b_id: p[7].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 16 }, { a: 17, b: 19 }, { a: 18, b: 15 }],
      winner_participant_id: p[0].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 1,
      match_index: 1,
      bracket_section: "winners",
      section_round_index: 1,
      court_label: courtNames[1],
      participant_a_id: p[1].id,
      participant_b_id: p[6].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 14 }, { a: 18, b: 12 }],
      winner_participant_id: p[1].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 1,
      match_index: 2,
      bracket_section: "winners",
      section_round_index: 1,
      court_label: courtNames[0],
      participant_a_id: p[2].id,
      participant_b_id: p[5].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 15 }, { a: 14, b: 18 }, { a: 18, b: 16 }],
      winner_participant_id: p[2].id,
      operational_status: "finished",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 1,
      match_index: 3,
      bracket_section: "winners",
      section_round_index: 1,
      court_label: courtNames[1],
      participant_a_id: p[3].id,
      participant_b_id: p[4].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 13 }, { a: 18, b: 15 }],
      winner_participant_id: p[3].id,
      operational_status: "finished",
    },

    // Semifinais (2 partidas)
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 2,
      match_index: 0,
      bracket_section: "winners",
      section_round_index: 2,
      court_label: "Quadra Central",
      participant_a_id: p[0].id,
      participant_b_id: p[1].id,
      sets_a: 1,
      sets_b: 1,
      set_details: [{ a: 18, b: 16 }, { a: 16, b: 18 }],
      winner_participant_id: null,
      operational_status: "in_progress",
    },
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 2,
      match_index: 1,
      bracket_section: "winners",
      section_round_index: 2,
      court_label: "Quadra Central",
      participant_a_id: p[2].id,
      participant_b_id: p[3].id,
      sets_a: null,
      sets_b: null,
      set_details: null,
      winner_participant_id: null,
      operational_status: "scheduled",
    },

    // Grande Final (1 partida)
    {
      championship_id: championshipId,
      category_id: categoryId,
      round_index: 3,
      match_index: 0,
      bracket_section: "winners",
      section_round_index: 3,
      court_label: "Quadra Central",
      participant_a_id: null,
      participant_b_id: null,
      sets_a: null,
      sets_b: null,
      set_details: null,
      winner_participant_id: null,
      operational_status: "scheduled",
    },
  ];
}

async function seed() {
  console.log("Iniciando seed do Circuito RankFTV Open Pro 2026...");

  // 1. Obter ID do organizador (CEO oficial primeiro, evitando pegar perfis de alunos demo)
  let { data: orgUser } = await supabase
    .from("profiles")
    .select("id, nome, username")
    .eq("id", CEO_USER_ID)
    .maybeSingle();

  if (!orgUser) {
    const { data: fallbackCeo } = await supabase
      .from("profiles")
      .select("id, nome, username")
      .eq("role", "ceo")
      .limit(1)
      .maybeSingle();
    orgUser = fallbackCeo;
  }

  if (!orgUser) {
    throw new Error("Não foi possível encontrar o perfil CEO de organizador no banco.");
  }

  const organizadorId = orgUser.id;
  console.log(`Organizador vinculado: ${orgUser.nome} (@${orgUser.username}) [${organizadorId}]`);

  // Garantir organizer_account ativo com chave Pix
  await supabase
    .from("organizer_accounts")
    .upsert({
      user_id: organizadorId,
      habilitado: true,
      chave_pix: "contato@rankftv.com",
      status_verificacao: "aprovado",
      telefone: "73999999999",
    }, { onConflict: "user_id" });

  const hoje = new Date();
  const dataInicio = new Date(hoje.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // Ontem
  const dataFim = new Date(hoje.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // Daqui a 2 dias
  const prevendaInicio = new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const prevendaFim = new Date(hoje.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const inscricoesInicio = new Date(hoje.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const inscricoesFim = new Date(hoje.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const descricaoCompleta = `A maior e mais esperada etapa do ano do Circuito Nacional de Futevôlei! O Circuito RankFTV Open Pro 2026 chega às areias paradisíacas da Praia da Pitinga em Arraial d'Ajuda, com 4 quadras oficiais de padrão internacional, arquibancada coberta para mais de 500 espectadores, camarote VIP Open Bar e cobertura multimídia completa com telão de pontuação ao vivo e transmissão oficial.

🏆 PREMIAÇÃO TOTAL: R$ 30.000,00 EM DINHEIRO + TROFÉUS E MEDALHAS
Distribuída em todas as categorias oficiais:

🥇 CATEGORIA OPEN PRO MASCULINO (Premiação Total: R$ 20.000,00)
• 1º Lugar: R$ 10.000,00 + Troféu Ouro Circuito RankFTV + Kit Especial de Patrocinadores
• 2º Lugar: R$ 5.000,00 + Troféu Prata Circuito RankFTV + Kit de Patrocinadores
• 3º Lugar: R$ 3.000,00 + Troféu Bronze Circuito RankFTV
• 4º Lugar: R$ 2.000,00 + Medalha de Honra ao Mérito

🥇 CATEGORIA A MASCULINO (Premiação Total: R$ 5.000,00)
• 1º Lugar: R$ 3.000,00 + Troféu Ouro
• 2º Lugar: R$ 1.500,00 + Troféu Prata
• 3º Lugar: R$ 500,00 + Troféu Bronze

🥇 CATEGORIA B MASCULINO (Premiação Total: R$ 3.000,00)
• 1º Lugar: R$ 1.800,00 + Troféu Ouro
• 2º Lugar: R$ 800,00 + Troféu Prata
• 3º Lugar: R$ 400,00 + Troféu Bronze

🥇 CATEGORIA MISTO INICIANTE (Premiação Total: R$ 2.000,00)
• 1º Lugar: R$ 1.200,00 + Troféu Ouro
• 2º Lugar: R$ 500,00 + Troféu Prata
• 3º Lugar: R$ 300,00 + Troféu Bronze

👕 KITS E UNIFORMES
Todas as duplas inscritas recebem 2 regatas oficiais de jogo do Circuito RankFTV nos tamanhos escolhidos na confirmação (P, M, G, GG), além de hidratação ilimitada com isotônicos e frutas durante os 2 dias de torneio.`;

  const regulamentoCompleto = `REGULAMENTO OFICIAL — CIRCUITO RANKFTV OPEN PRO 2026

1. DISPOSIÇÕES GERAIS E ARBITRAGEM
1.1 O torneio será regido pelas Regras Oficiais da Confederação Brasileira de Futevôlei (CBFv), salvo disposições específicas deste regulamento.
1.2 A arbitragem será composta por árbitros oficiais credenciados. As decisões da arbitragem de quadra são soberanas e incontestáveis no momento do lance.
1.3 Cada dupla tem direito a solicitar até 1 pedido de tempo técnico (time-out) de 1 minuto por set.

2. FORMATO DE DISPUTA E SISTEMA DE SETS
2.1 Oitavas de Final e Quartas de Final: Disputadas em set único de 21 pontos (diferença mínima de 2 pontos para fechamento, com teto máximo de 25 pontos).
2.2 Semifinais, Disputa de 3º Lugar e Grande Final: Disputadas no sistema melhor de 3 sets (melhor de 3), sendo os dois primeiros sets até 18 pontos (diferença de 2 pontos) e o terceiro set decisivo (tie-break) até 15 pontos.
2.3 Troca de lado de quadra a cada 7 pontos no set de 21 pontos, e a cada 6 pontos nos sets até 18 pontos.

3. TOLERÂNCIA E W.O.
3.1 A chamada das duplas será anunciada pelo sistema de som e no telão eletrônico oficial da quadra principal com antecedência mínima de 10 minutos.
3.2 A tolerância máxima para entrada em quadra é de 15 (quinze) minutos a partir do horário oficial convocado.
3.3 Esgotado o prazo de tolerância, será decretado W.O. com pontuação oficial de 18x0 e 18x0 em favor da dupla presente.

4. UNIFORME OFICIAL
4.1 É obrigatório o uso das camisetas/regatas oficiais fornecidas pela organização em todas as partidas da competição.
4.2 É vedada a alteração substancial (corte de logos de patrocinadores oficiais) do uniforme oficial.

5. CONDUTA ESPORTIVA, FAIR PLAY E DISCIPLINA
5.1 Exige-se conduta ética e esportiva irrepreensível de atletas, comissão e convidados.
5.2 Atitudes antidesportivas, ofensas verbais ao árbitro, adversários ou público estarão sujeitas a:
   - 1ª Ocorrência: Advertência verbal e Cartão Amarelo.
   - 2ª Ocorrência: Ponto de penalidade imediato para o adversário (Cartão Vermelho disciplinar).
   - Reincidência grave: Desclassificação imediata da dupla no campeonato e perda da premiação.

6. POLÍTICA DE INGRESSOS E REEMBOLSOS
6.1 Ingressos de plateia e camarote VIP são nominais e validados eletronicamente na portaria via QR Code no app ou e-mail.
6.2 Trocas de parceiro de dupla podem ser realizadas pelo titular pagante diretamente pelo painel até 24h antes do início do primeiro jogo da categoria.`;

  // 2. Criar ou atualizar o Campeonato
  const { error: champErr } = await supabase
    .from("championships")
    .upsert({
      id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      nome: "Circuito RankFTV Open Pro 2026",
      descricao: descricaoCompleta,
      regulamento: regulamentoCompleto,
      data_inicio: dataInicio,
      data_fim: dataFim,
      hora_inicio: "08:00",
      hora_fim: "19:00",
      prevenda_inicio: prevendaInicio,
      prevenda_fim: prevendaFim,
      prevenda_hora_inicio: "10:00",
      inscricoes_inicio: inscricoesInicio,
      inscricoes_fim: inscricoesFim,
      inscricoes_hora_inicio: "12:00",
      cidade: "Porto Seguro",
      estado: "BA",
      local: "Praia da Pitinga, Arraial d'Ajuda - BA",
      status: "em_andamento",
      taxa_plataforma: 7.0,
      is_elite: true,
      is_vitrine: false,
      live_url: "https://www.youtube.com",
      banner_url: "/banners/circuito-rankftv-arraial.png",
      banner_position_x: 50,
      banner_position_y: 50,
      total_courts: 4,
      primary_court_number: 1,
      max_parcelas_inscricao: 6,
      max_parcelas_ingresso: 6,
      premium_fee_pendente: 0,
    }, { onConflict: "id" });

  if (champErr) throw champErr;
  console.log("Campeonato Circuito RankFTV upserted com sucesso!");

  // 3. Categorias
  const categories = [
    {
      id: CAT_OPEN_PRO_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Open Pro Masculino",
      genero: "masculino",
      valor_inscricao: 240.00,
      corte_rating_min: 1600,
      corte_rating_max: 9999,
      max_duplas: 16,
    },
    {
      id: CAT_A_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Categoria A",
      genero: "masculino",
      valor_inscricao: 180.00,
      corte_rating_min: 1200,
      corte_rating_max: 1650,
      max_duplas: 16,
    },
    {
      id: CAT_B_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Categoria B",
      genero: "masculino",
      valor_inscricao: 160.00,
      corte_rating_min: 800,
      corte_rating_max: 1250,
      max_duplas: 16,
    },
    {
      id: CAT_MISTO_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Misto Iniciante",
      genero: "mista",
      valor_inscricao: 140.00,
      corte_rating_min: 0,
      corte_rating_max: 900,
      max_duplas: 16,
    },
  ];

  for (const cat of categories) {
    const { error: catErr } = await supabase.from("championship_categories").upsert(cat, { onConflict: "id" });
    if (catErr) {
      console.error(`Erro ao inserir categoria ${cat.nome}:`, catErr);
      throw catErr;
    }
  }
  console.log("Categorias cadastradas com sucesso!");

  // 4. Tipos de Ingresso de Plateia
  const ticketTypes = [
    {
      id: TICKET_ARQUIBANCADA_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Arquibancada Geral",
      valor: 25.00,
      ativo: true,
      ordem: 1,
      max_quantidade: 200,
      vendidos: 130,
    },
    {
      id: TICKET_CAMAROTE_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Camarote VIP Open Bar",
      valor: 90.00,
      ativo: true,
      ordem: 2,
      max_quantidade: 60,
      vendidos: 45,
    },
    {
      id: TICKET_COMBO_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Camarote VIP + Camisa Oficial",
      valor: 150.00,
      ativo: true,
      ordem: 3,
      max_quantidade: 50,
      vendidos: 40,
    },
    {
      id: TICKET_PASSAPORTE_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Passaporte Final de Semana Completo",
      valor: 70.00,
      ativo: true,
      ordem: 4,
      max_quantidade: 60,
      vendidos: 45,
    },
  ];

  for (const t of ticketTypes) {
    await supabase.from("spectator_ticket_types").upsert(t, { onConflict: "id" });
  }
  console.log("Tipos de ingressos de plateia cadastrados!");

  // 5. Limpeza de dados antigos do torneio demo (sem deixar órfãos em receivables)
  await supabase.from("organizer_receivables").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("bracket_matches").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("bracket_participants").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("athlete_tickets").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("spectator_tickets").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("championship_expenses").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("coupons").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("championship_notices").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("pricing_tiers").delete().in("category_id", [CAT_OPEN_PRO_ID, CAT_A_ID, CAT_B_ID, CAT_MISTO_ID]);
  await supabase.from("pricing_tiers").delete().in("ticket_type_id", [TICKET_ARQUIBANCADA_ID, TICKET_CAMAROTE_ID, TICKET_COMBO_ID, TICKET_PASSAPORTE_ID]);

  // 6. Inserir Inscrições de Atletas (Duplas) para as 4 CATEGORIAS
  const duplasOpenPro = [
    ["Tavinho", "Franklin"],
    ["Bruninho", "Sandrey"],
    ["Hiltinho", "Franklin Jr"],
    ["Paraná", "Felipinho"],
    ["Anderson Águia", "Tatá"],
    ["Juninho", "Neguebinha"],
    ["Lalazinho", "Diego"],
    ["Guigui", "Vitinho"],
    ["Cinho", "Marcelinho"],
    ["Lukinhas", "Paulinho"],
    ["Zé Luís", "Renan"],
    ["Dudu", "Thiaguinho"],
    ["Caio", "Rodrigo"],
    ["Rafael", "Leo"],
    ["Fabinho", "Marcão"],
    ["Alex", "Biel"],
  ];

  const duplasCatA = [
    ["Biel", "Matheus"],
    ["Vitinho", "Leo"],
    ["Guto", "Rodrigo"],
    ["Pezão", "Marcos"],
    ["Caio", "Felipe"],
    ["Renan", "Danilo"],
    ["Dudu", "Vini"],
    ["Juninho", "Lucas"],
    ["Paulinho", "Natan"],
    ["Tiago", "Bruno"],
    ["Arthur", "Gabriel"],
    ["Marcelo", "Yuri"],
    ["Daniel", "Henrique"],
    ["Igor", "Samuel"],
    ["Gustavo", "Eduardo"],
    ["Bernardo", "Felipe Jr"],
  ];

  const duplasCatB = [
    ["Lucas", "Davi"],
    ["Gui", "Enzo"],
    ["Pedro", "Thiago"],
    ["Rafa", "Gabriel"],
    ["Felipe", "Bruno"],
    ["Murilo", "João"],
    ["Cauã", "Caio"],
    ["Leo", "Renan"],
    ["Otávio", "Yan"],
    ["Heitor", "Vitor"],
    ["Nicolas", "Breno"],
    ["Diego", "Theo"],
    ["Lorenzo", "Arthur"],
    ["Bernardo", "Caio Jr"],
    ["Miguel", "Davi Lucca"],
    ["Samuel", "Henrique"],
  ];

  const duplasMisto = [
    ["Caio", "Bia"],
    ["Lucas", "Carol"],
    ["Rodrigo", "Fernanda"],
    ["Leo", "Mariana"],
    ["Felipe", "Larissa"],
    ["Bruno", "Camila"],
    ["Gabriel", "Letícia"],
    ["Rafael", "Juliana"],
    ["Thiago", "Amanda"],
    ["Vinícius", "Bruna"],
    ["Matheus", "Isabella"],
    ["Pedro", "Sofia"],
    ["Arthur", "Gabriela"],
    ["Eduardo", "Rafaela"],
    ["Gustavo", "Giovanna"],
    ["Daniel", "Luiza"],
  ];

  const tamanhosCamiseta = ["P", "M", "G", "GG"];
  const athleteTickets = [];

  // Open Pro (16 duplas @ R$ 240 = R$ 3.840)
  for (let i = 0; i < duplasOpenPro.length; i++) {
    const [atleta1, atleta2] = duplasOpenPro[i];
    const ticketId = `c1000000-0000-4000-8000-0000000010${i < 10 ? "0" + i : i}`;
    const isCredit = i % 2 === 0;

    athleteTickets.push({
      id: ticketId,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      categoria_nome: "Open Pro Masculino",
      comprador_nome: atleta1,
      comprador_cpf: `111222333${i < 10 ? "0" + i : i}`,
      comprador_email: `${atleta1.toLowerCase().replace(/[\sáàâãéèêíóòôõúüç]+/g, "")}@demo.rankftv.com`,
      comprador_zap: "71999887766",
      comprador_genero: "masculino",
      parceiro_nome: atleta2,
      parceiro_cpf: `444555666${i < 10 ? "0" + i : i}`,
      parceiro_email: `${atleta2.toLowerCase().replace(/[\sáàâãéèêíóòôõúüç]+/g, "")}@demo.rankftv.com`,
      parceiro_zap: "71988776655",
      parceiro_genero: "masculino",
      valor: 240.00,
      status_pagamento: "pago",
      billing_type: isCredit ? "CREDIT_CARD" : "PIX",
      asaas_payment_id: `pay_demo_pro_${i}`,
      repasse_status: isCredit ? "aguardando_liquidacao" : "disponivel",
      repasse_data_prevista: isCredit
        ? new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
        : hoje.toISOString(),
      code: `PRO-${100 + i}`,
      access_token: crypto.randomUUID(),
      comprador_camisa: tamanhosCamiseta[i % 4],
      parceiro_camisa: tamanhosCamiseta[(i + 1) % 4],
      checked_in: i < 14,
      checkin_at: i < 14 ? new Date(hoje.getTime() - 2 * 60 * 60 * 1000).toISOString() : null,
      created_at: new Date(hoje.getTime() - (10 - i * 0.3) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Categoria A (16 duplas @ R$ 180 = R$ 2.880)
  for (let i = 0; i < duplasCatA.length; i++) {
    const [atleta1, atleta2] = duplasCatA[i];
    const ticketId = `c1000000-0000-4000-8000-0000000020${i < 10 ? "0" + i : i}`;
    const isCredit = i % 3 === 0;

    athleteTickets.push({
      id: ticketId,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_A_ID,
      categoria_nome: "Categoria A",
      comprador_nome: atleta1,
      comprador_cpf: `222333444${i < 10 ? "0" + i : i}`,
      comprador_email: `${atleta1.toLowerCase().replace(/[\sáàâãéèêíóòôõúüç]+/g, "")}a@demo.rankftv.com`,
      comprador_zap: "71991112233",
      comprador_genero: "masculino",
      parceiro_nome: atleta2,
      parceiro_cpf: `555666777${i < 10 ? "0" + i : i}`,
      parceiro_email: `${atleta2.toLowerCase().replace(/[\sáàâãéèêíóòôõúüç]+/g, "")}a@demo.rankftv.com`,
      parceiro_zap: "71992223344",
      parceiro_genero: "masculino",
      valor: 180.00,
      status_pagamento: "pago",
      billing_type: isCredit ? "CREDIT_CARD" : "PIX",
      asaas_payment_id: `pay_demo_a_${i}`,
      repasse_status: isCredit ? "aguardando_liquidacao" : "disponivel",
      repasse_data_prevista: isCredit
        ? new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
        : hoje.toISOString(),
      code: `CTA-${100 + i}`,
      access_token: crypto.randomUUID(),
      comprador_camisa: tamanhosCamiseta[(i + 1) % 4],
      parceiro_camisa: tamanhosCamiseta[(i + 2) % 4],
      checked_in: i < 13,
      checkin_at: i < 13 ? new Date(hoje.getTime() - 3 * 60 * 60 * 1000).toISOString() : null,
      created_at: new Date(hoje.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Categoria B (16 duplas @ R$ 160 = R$ 2.560)
  for (let i = 0; i < duplasCatB.length; i++) {
    const [atleta1, atleta2] = duplasCatB[i];
    const ticketId = `c1000000-0000-4000-8000-0000000030${i < 10 ? "0" + i : i}`;
    const isCredit = i % 4 === 0;

    athleteTickets.push({
      id: ticketId,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_B_ID,
      categoria_nome: "Categoria B",
      comprador_nome: atleta1,
      comprador_cpf: `333444555${i < 10 ? "0" + i : i}`,
      comprador_email: `${atleta1.toLowerCase().replace(/[\sáàâãéèêíóòôõúüç]+/g, "")}b@demo.rankftv.com`,
      comprador_zap: "71993334455",
      comprador_genero: "masculino",
      parceiro_nome: atleta2,
      parceiro_cpf: `666777888${i < 10 ? "0" + i : i}`,
      parceiro_email: `${atleta2.toLowerCase().replace(/[\sáàâãéèêíóòôõúüç]+/g, "")}b@demo.rankftv.com`,
      parceiro_zap: "71994445566",
      parceiro_genero: "masculino",
      valor: 160.00,
      status_pagamento: "pago",
      billing_type: isCredit ? "CREDIT_CARD" : "PIX",
      asaas_payment_id: `pay_demo_b_${i}`,
      repasse_status: isCredit ? "aguardando_liquidacao" : "disponivel",
      repasse_data_prevista: isCredit
        ? new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
        : hoje.toISOString(),
      code: `CTB-${100 + i}`,
      access_token: crypto.randomUUID(),
      comprador_camisa: tamanhosCamiseta[(i + 2) % 4],
      parceiro_camisa: tamanhosCamiseta[i % 4],
      checked_in: i < 14,
      checkin_at: i < 14 ? new Date(hoje.getTime() - 4 * 60 * 60 * 1000).toISOString() : null,
      created_at: new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Misto Iniciante (16 duplas @ R$ 140 = R$ 2.240)
  for (let i = 0; i < duplasMisto.length; i++) {
    const [atleta1, atleta2] = duplasMisto[i];
    const ticketId = `c1000000-0000-4000-8000-0000000040${i < 10 ? "0" + i : i}`;

    athleteTickets.push({
      id: ticketId,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_MISTO_ID,
      categoria_nome: "Misto Iniciante",
      comprador_nome: atleta1,
      comprador_cpf: `444555666${i < 10 ? "0" + i : i}`,
      comprador_email: `${atleta1.toLowerCase().replace(/[\sáàâãéèêíóòôõúüç]+/g, "")}m@demo.rankftv.com`,
      comprador_zap: "71995556677",
      comprador_genero: "masculino",
      parceiro_nome: atleta2,
      parceiro_cpf: `777888999${i < 10 ? "0" + i : i}`,
      parceiro_email: `${atleta2.toLowerCase().replace(/[\sáàâãéèêíóòôõúüç]+/g, "")}m@demo.rankftv.com`,
      parceiro_zap: "71996667788",
      parceiro_genero: "feminino",
      valor: 140.00,
      status_pagamento: "pago",
      billing_type: "PIX",
      asaas_payment_id: `pay_demo_m_${i}`,
      repasse_status: "disponivel",
      repasse_data_prevista: hoje.toISOString(),
      code: `MIS-${100 + i}`,
      access_token: crypto.randomUUID(),
      comprador_camisa: tamanhosCamiseta[(i + 3) % 4],
      parceiro_camisa: tamanhosCamiseta[i % 4],
      checked_in: i < 13,
      checkin_at: i < 13 ? new Date(hoje.getTime() - 2 * 60 * 60 * 1000).toISOString() : null,
      created_at: new Date(hoje.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Inserir os athlete_tickets em lotes de 20
  for (let i = 0; i < athleteTickets.length; i += 20) {
    const batch = athleteTickets.slice(i, i + 20);
    const { error: insErr } = await supabase.from("athlete_tickets").insert(batch);
    if (insErr) throw insErr;
  }
  console.log(`Inseridas ${athleteTickets.length} duplas pagas com camisetas e repasses!`);

  // 7. Ingressos de Plateia e Camarote VIP (260 ingressos = R$ 16.450,00 — volume realista)
  const spectatorTickets = [];

  // 130 ingressos arquibancada a R$ 25 = R$ 3.250
  for (let i = 0; i < 130; i++) {
    spectatorTickets.push({
      id: crypto.randomUUID(),
      championship_id: CHAMPIONSHIP_ID,
      ticket_type_id: TICKET_ARQUIBANCADA_ID,
      tipo_nome: "Arquibancada Geral",
      comprador_nome: `Espectador Arquibancada ${i + 1}`,
      comprador_email: `torcedor${i + 1}@demo.rankftv.com`,
      comprador_cpf: `888999111${(i % 90) < 10 ? "0" + (i % 90) : (i % 90)}`,
      valor: 25.00,
      status_pagamento: "pago",
      billing_type: i % 3 === 0 ? "CREDIT_CARD" : "PIX",
      asaas_payment_id: `spec_demo_arq_${i}`,
      code: `ARQ-${1000 + i}`,
      access_token: crypto.randomUUID(),
      qr_token: crypto.randomUUID(),
      checked_in: i < 105,
      checkin_at: i < 105 ? new Date().toISOString() : null,
      repasse_status: i % 3 === 0 ? "aguardando_liquidacao" : "disponivel",
      repasse_data_prevista: i % 3 === 0
        ? new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : hoje.toISOString(),
      created_at: new Date(hoje.getTime() - (5 - (i % 5)) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 45 ingressos camarote VIP a R$ 90 = R$ 4.050
  for (let i = 0; i < 45; i++) {
    spectatorTickets.push({
      id: crypto.randomUUID(),
      championship_id: CHAMPIONSHIP_ID,
      ticket_type_id: TICKET_CAMAROTE_ID,
      tipo_nome: "Camarote VIP Open Bar",
      comprador_nome: `Convidado VIP ${i + 1}`,
      comprador_email: `vip${i + 1}@demo.rankftv.com`,
      comprador_cpf: `999000222${(i % 90) < 10 ? "0" + (i % 90) : (i % 90)}`,
      valor: 90.00,
      status_pagamento: "pago",
      billing_type: "CREDIT_CARD",
      asaas_payment_id: `spec_demo_vip_${i}`,
      code: `VIP-${500 + i}`,
      access_token: crypto.randomUUID(),
      qr_token: crypto.randomUUID(),
      checked_in: i < 38,
      checkin_at: i < 38 ? new Date().toISOString() : null,
      repasse_status: "aguardando_liquidacao",
      repasse_data_prevista: new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(hoje.getTime() - (4 - (i % 4)) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 40 ingressos Camarote VIP + Camisa Oficial a R$ 150 = R$ 6.000
  for (let i = 0; i < 40; i++) {
    spectatorTickets.push({
      id: crypto.randomUUID(),
      championship_id: CHAMPIONSHIP_ID,
      ticket_type_id: TICKET_COMBO_ID,
      tipo_nome: "Camarote VIP + Camisa Oficial",
      comprador_nome: `Torcedor VIP Camisa ${i + 1}`,
      comprador_email: `vipcamisa${i + 1}@demo.rankftv.com`,
      comprador_cpf: `777888333${(i % 90) < 10 ? "0" + (i % 90) : (i % 90)}`,
      valor: 150.00,
      status_pagamento: "pago",
      billing_type: i % 2 === 0 ? "CREDIT_CARD" : "PIX",
      asaas_payment_id: `spec_demo_combo_${i}`,
      code: `VPC-${700 + i}`,
      access_token: crypto.randomUUID(),
      qr_token: crypto.randomUUID(),
      checked_in: i < 34,
      checkin_at: i < 34 ? new Date().toISOString() : null,
      repasse_status: i % 2 === 0 ? "aguardando_liquidacao" : "disponivel",
      repasse_data_prevista: i % 2 === 0
        ? new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : hoje.toISOString(),
      created_at: new Date(hoje.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 45 ingressos Passaporte Final de Semana a R$ 70 = R$ 3.150
  for (let i = 0; i < 45; i++) {
    spectatorTickets.push({
      id: crypto.randomUUID(),
      championship_id: CHAMPIONSHIP_ID,
      ticket_type_id: TICKET_PASSAPORTE_ID,
      tipo_nome: "Passaporte Final de Semana Completo",
      comprador_nome: `Torcedor Passaporte ${i + 1}`,
      comprador_email: `passaporte${i + 1}@demo.rankftv.com`,
      comprador_cpf: `666555444${(i % 90) < 10 ? "0" + (i % 90) : (i % 90)}`,
      valor: 70.00,
      status_pagamento: "pago",
      billing_type: "PIX",
      asaas_payment_id: `spec_demo_pass_${i}`,
      code: `PAS-${800 + i}`,
      access_token: crypto.randomUUID(),
      qr_token: crypto.randomUUID(),
      checked_in: i < 36,
      checkin_at: i < 36 ? new Date().toISOString() : null,
      repasse_status: "disponivel",
      repasse_data_prevista: hoje.toISOString(),
      created_at: new Date(hoje.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Inserir spectator_tickets em batches de 100
  for (let i = 0; i < spectatorTickets.length; i += 100) {
    const batch = spectatorTickets.slice(i, i + 100);
    const { error: specErr } = await supabase.from("spectator_tickets").insert(batch);
    if (specErr) throw specErr;
  }
  console.log(`Inseridos ${spectatorTickets.length} ingressos de plateia e camarote VIP!`);

  // 7B. Despesas operacionais padrão (DRE completo para calls comerciais)
  const dayISO = (offsetDays) =>
    new Date(hoje.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);

  const expensesSeed = [
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Arbitragem",
      nome: "Equipe de Arbitragem Oficial (6 árbitros x 4 dias)",
      valor: 3600.00,
      status: "pago",
      data_vencimento: dayISO(-2),
      data_pagamento: dayISO(-3),
      observacao: "3 árbitros principais + 3 apontadores de quadra (diárias + deslocamento).",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Marketing & Mídia",
      nome: "Transmissão ao Vivo YouTube (câmeras, switcher e narração)",
      valor: 2850.00,
      status: "pago",
      data_vencimento: dayISO(-3),
      data_pagamento: dayISO(-4),
      observacao: "Produção Full HD 3 câmeras na Quadra Central, replay instantâneo e narrador.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Quadra & Estrutura",
      nome: "Locação de Tendas, Gerador, Sonorização e Refletores",
      valor: 3200.00,
      status: "pago",
      data_vencimento: dayISO(-4),
      data_pagamento: dayISO(-5),
      observacao: "2 tendas 10x10m (atletas + Camarote VIP), som line array e refletores LED.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Quadra & Estrutura",
      nome: "Equipamentos de Quadra (redes oficiais, linhas, antenas e bolas)",
      valor: 1150.00,
      status: "pendente",
      data_vencimento: dayISO(2),
      data_pagamento: null,
      observacao: "12 bolas oficiais Mikasa FT5, 4 redes de competição, fitas e placares manuais.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Alimentação & Hidratação",
      nome: "Água Mineral, Isotônicos, Gelo e Frutas (Atletas & Staff)",
      valor: 890.00,
      status: "pago",
      data_vencimento: dayISO(-1),
      data_pagamento: dayISO(-1),
      observacao: "45 fardos de água 500ml, isotônicos, gelo em barra e mesa de frutas diária.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Kits & Camisas",
      nome: "Confecção de Uniformes Oficiais (160 regatas + staff)",
      valor: 2640.00,
      status: "pago",
      data_vencimento: dayISO(-7),
      data_pagamento: dayISO(-8),
      observacao: "128 regatas dry-fit com numeração + 32 camisas para organização e árbitros.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Premiação",
      nome: "Troféus, Medalhas Personalizadas e Premiação Open/Categorias",
      valor: 4100.00,
      status: "pendente",
      data_vencimento: dayISO(1),
      data_pagamento: null,
      observacao: "Bônus financeiro pódio Open Pro + troféus em metal/acrílico 1º ao 3º lugar.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Marketing & Mídia",
      nome: "Fotógrafo Esportivo, Social Media e Cobertura Reels",
      valor: 1250.00,
      status: "pago",
      data_vencimento: dayISO(0),
      data_pagamento: dayISO(-1),
      observacao: "Banco de fotos em alta resolução para atletas e cortes verticais diários.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Outros",
      nome: "Staff Operacional, Segurança Diurna/Noturna e Limpeza",
      valor: 1650.00,
      status: "pendente",
      data_vencimento: dayISO(3),
      data_pagamento: null,
      observacao: "Controle de acesso QR Code na portaria, segurança noturna e manutenção da areia.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      categoria: "Outros",
      nome: "Posto Médico / Brigadista de Plantão (4 dias de evento)",
      valor: 920.00,
      status: "pago",
      data_vencimento: dayISO(0),
      data_pagamento: dayISO(0),
      observacao: "Equipe de primeiros socorros, crioterapia pós-jogo e apoio ambulatorial.",
    },
  ];
  const { error: expErr } = await supabase.from("championship_expenses").insert(expensesSeed);
  if (expErr) throw expErr;
  console.log(`Inseridas ${expensesSeed.length} despesas realistas (pagas e a vencer) no DRE!`);

  // 7C. Lotes escalonados (pricing_tiers) + Cupons + Comunicados
  const pricingTiersSeed = [
    {
      category_id: CAT_OPEN_PRO_ID,
      ticket_type_id: null,
      nome: "1º Lote (Promocional)",
      valor: 210.00,
      ordem: 1,
      quantidade_maxima: 8,
      vendidos: 8,
      data_fim: new Date(hoje.getTime() - 7 * 86_400_000).toISOString(),
      ativo: false,
    },
    {
      category_id: CAT_OPEN_PRO_ID,
      ticket_type_id: null,
      nome: "2º Lote (Oficial)",
      valor: 240.00,
      ordem: 2,
      quantidade_maxima: 8,
      vendidos: 8,
      data_fim: new Date(hoje.getTime() + 1 * 86_400_000).toISOString(),
      ativo: true,
    },
    {
      category_id: null,
      ticket_type_id: TICKET_CAMAROTE_ID,
      nome: "1º Lote VIP",
      valor: 75.00,
      ordem: 1,
      quantidade_maxima: 20,
      vendidos: 20,
      data_fim: new Date(hoje.getTime() - 5 * 86_400_000).toISOString(),
      ativo: false,
    },
    {
      category_id: null,
      ticket_type_id: TICKET_CAMAROTE_ID,
      nome: "2º Lote VIP",
      valor: 90.00,
      ordem: 2,
      quantidade_maxima: 40,
      vendidos: 25,
      data_fim: new Date(hoje.getTime() + 2 * 86_400_000).toISOString(),
      ativo: true,
    },
  ];
  const { error: tierErr } = await supabase.from("pricing_tiers").insert(pricingTiersSeed);
  if (tierErr) throw tierErr;

  const couponsSeed = [
    {
      championship_id: CHAMPIONSHIP_ID,
      codigo: "ARRAIAL10",
      tipo_desconto: "percentual",
      valor_desconto: 10,
      aplica_em: "ambos",
      quantidade_maxima: 50,
      usos_atuais: 27,
      data_fim: new Date(hoje.getTime() + 5 * 86_400_000).toISOString(),
      ativo: true,
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      codigo: "VIP20",
      tipo_desconto: "valor_fixo",
      valor_desconto: 20,
      aplica_em: "plateia",
      quantidade_maxima: 30,
      usos_atuais: 14,
      data_fim: new Date(hoje.getTime() + 5 * 86_400_000).toISOString(),
      ativo: true,
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      codigo: "DUPLAFTV",
      tipo_desconto: "valor_fixo",
      valor_desconto: 25,
      aplica_em: "atleta",
      quantidade_maxima: 20,
      usos_atuais: 11,
      data_fim: new Date(hoje.getTime() + 5 * 86_400_000).toISOString(),
      ativo: true,
    },
  ];
  const { error: couponErr } = await supabase.from("coupons").insert(couponsSeed);
  if (couponErr) throw couponErr;

  const noticesSeed = [
    {
      championship_id: CHAMPIONSHIP_ID,
      created_by: organizadorId,
      dedupe_key: "demo_checkin_camisas_2026",
      kind: "schedule",
      title: "Retirada de Kits e Check-in Oficial",
      message: "Apresente o QR Code do painel na tenda da organização até 40 minutos antes da sua primeira chamada para retirar a regata oficial e validar a dupla.",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      created_by: organizadorId,
      dedupe_key: "demo_transmissao_youtube_2026",
      kind: "important",
      title: "Transmissão ao vivo da Quadra Central no YouTube",
      message: "Semifinais e finais de todas as categorias serão transmitidas com 3 câmeras e placar integrado. Compartilhe o link com sua torcida!",
    },
  ];
  const { error: noticeErr } = await supabase.from("championship_notices").insert(noticesSeed);
  if (noticeErr) throw noticeErr;

  // 8. Chaveamento Oficial Ativo para as 4 CATEGORIAS
  const categoryConfigs = [
    {
      categoryId: CAT_OPEN_PRO_ID,
      nome: "Open Pro Masculino",
      courts: ["Quadra 1", "Quadra 2", "Quadra 3", "Quadra 4"],
    },
    {
      categoryId: CAT_A_ID,
      nome: "Categoria A",
      courts: ["Quadra 2", "Quadra 3", "Quadra 4", "Quadra 1"],
    },
    {
      categoryId: CAT_B_ID,
      nome: "Categoria B",
      courts: ["Quadra 3", "Quadra 4", "Quadra 1", "Quadra 2"],
    },
    {
      categoryId: CAT_MISTO_ID,
      nome: "Misto Iniciante",
      courts: ["Quadra 4", "Quadra 1", "Quadra 2", "Quadra 3"],
    },
  ];

  const allBracketMatches = [];

  for (const cfg of categoryConfigs) {
    // Obter os 16 participantes criados automaticamente pelo trigger ao inserir athlete_tickets
    const { data: participantsData, error: partErr } = await supabase
      .from("bracket_participants")
      .select("id, athlete_ticket_id, display_name_snapshot")
      .eq("championship_id", CHAMPIONSHIP_ID)
      .eq("category_id", cfg.categoryId)
      .order("athlete_ticket_id", { ascending: true });

    if (partErr || !participantsData || participantsData.length !== 16) {
      throw new Error(`Esperava 16 participantes para ${cfg.nome}, obteve ${participantsData?.length}: ${partErr?.message}`);
    }

    console.log(`16 duplas vinculadas para ${cfg.nome}: ${participantsData[0].display_name_snapshot} até ${participantsData[15].display_name_snapshot}`);

    // Marcar categoria com bracket_confirmed_at
    await supabase
      .from("championship_categories")
      .update({ bracket_confirmed_at: new Date().toISOString() })
      .eq("id", cfg.categoryId);

    const matches = generateBracketMatchesForCategory(
      CHAMPIONSHIP_ID,
      cfg.categoryId,
      participantsData,
      cfg.courts,
    );
    allBracketMatches.push(...matches);
  }

  // Inserir todas as 60 partidas de chaveamento
  for (let i = 0; i < allBracketMatches.length; i += 20) {
    const batch = allBracketMatches.slice(i, i + 20);
    const { error: bracketErr } = await supabase.from("bracket_matches").insert(batch);
    if (bracketErr) throw bracketErr;
  }
  console.log(`Chaveamento oficial das 4 categorias inserido com sucesso (${allBracketMatches.length} partidas)!`);

  // 9. Garantir que o Circuito RankFTV esteja nos destaques da Home
  const { data: configData } = await supabase
    .from("platform_config")
    .select("destaques_ids")
    .eq("id", 1)
    .maybeSingle();

  const currentDestaques = configData?.destaques_ids || [];
  if (!currentDestaques.includes(CHAMPIONSHIP_ID)) {
    const updatedDestaques = [CHAMPIONSHIP_ID, ...currentDestaques.filter((id) => id !== CHAMPIONSHIP_ID)];
    await supabase
      .from("platform_config")
      .update({ destaques_ids: updatedDestaques })
      .eq("id", 1);
    console.log("Circuito RankFTV adicionado ao topo dos destaques da Home!");
  }

  // Recalcular totais e exibir balanço final
  const totalAtletas = athleteTickets.reduce((acc, t) => acc + t.valor, 0);
  const totalPlateia = spectatorTickets.reduce((acc, t) => acc + t.valor, 0);
  const totalGeral = totalAtletas + totalPlateia;
  const totalDespesas = expensesSeed.reduce((acc, e) => acc + e.valor, 0);

  console.log("==========================================");
  console.log("🏆 CIRCUITO RANKFTV OPEN PRO 2026 ATIVO!");
  console.log(`Faturamento de Atletas: R$ ${totalAtletas.toFixed(2)} (64 duplas nas 4 categorias)`);
  console.log(`Faturamento de Plateia / Camarote: R$ ${totalPlateia.toFixed(2)} (${spectatorTickets.length} ingressos)`);
  console.log(`FATURAMENTO BRUTO TOTAL: R$ ${totalGeral.toFixed(2)}`);
  console.log(`DESPESAS REGISTRADAS: R$ ${totalDespesas.toFixed(2)} (${expensesSeed.length} itens — lucro líquido ~R$ ${(totalGeral - totalDespesas).toFixed(2)})`);
  console.log("Chaveamento: 4 CATEGORIAS ATIVAS (Open Pro, A, B e Misto - todas nas Semifinais!)");
  console.log(`Link Chaveamento: /campeonatos/${CHAMPIONSHIP_ID}/chaveamento`);
  console.log(`Painel Geral: /painel/campeonatos/${CHAMPIONSHIP_ID}`);
  console.log(`Painel Financeiro: /painel/campeonatos/${CHAMPIONSHIP_ID}/financeiro`);
  console.log("==========================================");
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
