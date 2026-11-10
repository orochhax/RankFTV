import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CHAMPIONSHIP_ID = "c1000000-0000-4000-8000-000000000001";
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

async function seed() {
  console.log("Iniciando seed do Circuito RankFTV Open Pro 2026...");

  // 1. Obter ID do organizador (Carlos Rocha ou primeiro da lista de organizadores)
  const { data: orgUser, error: orgError } = await supabase
    .from("profiles")
    .select("id, nome, username")
    .limit(1)
    .single();

  if (orgError || !orgUser) {
    throw new Error("Não foi possível encontrar um perfil de organizador no banco.");
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
  const dataFim = new Date(hoje.getTime() + 2 * 24 * 60 * 1000).toISOString().split("T")[0];    // Daqui a 2 dias

  // 2. Criar ou atualizar o Campeonato
  const { error: champErr } = await supabase
    .from("championships")
    .upsert({
      id: CHAMPIONSHIP_ID,
      organizador_id: organizadorId,
      nome: "Circuito RankFTV Open Pro 2026",
      descricao: "A maior etapa oficial do ano! 16 duplas de elite disputando R$ 30.000,00 em premiação na Arena Central com telão ao vivo e cobertura completa.",
      regulamento: "Regras oficiais de futevôlei nacional. Partidas de quartas, semifinais e finais em melhor de 3 sets até 18 pontos.",
      data_inicio: dataInicio,
      data_fim: dataFim,
      cidade: "Salvador",
      estado: "BA",
      local: "Arena Central RankFTV",
      status: "em_andamento",
      taxa_plataforma: 7.0,
      is_elite: true,
      is_vitrine: true,
      banner_url: "/banners/circuito-rankftv-open.png",
      banner_position_x: 50,
      banner_position_y: 50,
      total_courts: 4,
      primary_court_number: 1,
      max_parcelas_inscricao: 6,
      max_parcelas_ingresso: 6,
      premium_fee_pendente: 0, // Plano PRO já quitado!
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
    },
    {
      id: TICKET_CAMAROTE_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Camarote VIP Open Bar",
      valor: 90.00,
      ativo: true,
      ordem: 2,
    },
    {
      id: TICKET_COMBO_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Camarote VIP + Camisa Oficial",
      valor: 150.00,
      ativo: true,
      ordem: 3,
    },
    {
      id: TICKET_PASSAPORTE_ID,
      championship_id: CHAMPIONSHIP_ID,
      nome: "Passaporte Final de Semana Completo",
      valor: 70.00,
      ativo: true,
      ordem: 4,
    },
  ];

  for (const t of ticketTypes) {
    await supabase.from("spectator_ticket_types").upsert(t, { onConflict: "id" });
  }
  console.log("Tipos de ingressos de plateia cadastrados!");

  // 5. Inserir Inscrições de Atletas (Duplas) com Faturamento Financeiro
  // Limpar dados antigos desse camp demo em ordem correta de FKs
  await supabase.from("bracket_matches").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("bracket_participants").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("athlete_tickets").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("spectator_tickets").delete().eq("championship_id", CHAMPIONSHIP_ID);

  const athleteTickets = [];
  const duplasNomes = [
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

  const tamanhosCamiseta = ["P", "M", "G", "GG"];

  // 16 duplas Open Pro (R$ 240 cada = R$ 3.840)
  for (let i = 0; i < duplasNomes.length; i++) {
    const [atleta1, atleta2] = duplasNomes[i];
    const ticketId = `c1000000-0000-4000-8000-0000000010${i < 10 ? "0" + i : i}`;
    const valor = 240.00;
    const isCredit = i % 2 === 0;

    athleteTickets.push({
      id: ticketId,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      categoria_nome: "Open Pro Masculino",
      comprador_nome: atleta1,
      comprador_cpf: `111222333${i < 10 ? "0" + i : i}`,
      comprador_email: `${atleta1.toLowerCase().replace(/\s+/g, "")}@demo.rankftv.com`,
      comprador_zap: "71999887766",
      comprador_genero: "masculino",
      parceiro_nome: atleta2,
      parceiro_cpf: `444555666${i < 10 ? "0" + i : i}`,
      parceiro_email: `${atleta2.toLowerCase().replace(/\s+/g, "")}@demo.rankftv.com`,
      parceiro_zap: "71988776655",
      parceiro_genero: "masculino",
      valor: valor,
      status_pagamento: "pago",
      billing_type: isCredit ? "CREDIT_CARD" : "PIX",
      asaas_payment_id: `pay_demo_${i}`,
      repasse_status: isCredit ? "aguardando_liquidacao" : "disponivel",
      repasse_data_prevista: new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      code: `PRO-${100 + i}`,
      access_token: crypto.randomUUID(),
      comprador_camisa: tamanhosCamiseta[i % 4],
      parceiro_camisa: tamanhosCamiseta[(i + 1) % 4],
      created_at: new Date(hoje.getTime() - (10 - i * 0.3) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 16 duplas Categoria A (R$ 180 cada = R$ 2.880)
  for (let i = 0; i < 16; i++) {
    const ticketId = `c1000000-0000-4000-8000-0000000020${i < 10 ? "0" + i : i}`;
    athleteTickets.push({
      id: ticketId,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_A_ID,
      categoria_nome: "Categoria A",
      comprador_nome: `Atleta A${i + 1} Titular`,
      comprador_cpf: `222333444${i < 10 ? "0" + i : i}`,
      comprador_email: `atletaa${i + 1}@demo.rankftv.com`,
      comprador_zap: "71991112233",
      comprador_genero: "masculino",
      parceiro_nome: `Atleta A${i + 1} Parceiro`,
      parceiro_cpf: `555666777${i < 10 ? "0" + i : i}`,
      parceiro_email: `parceiroa${i + 1}@demo.rankftv.com`,
      parceiro_zap: "71992223344",
      parceiro_genero: "masculino",
      valor: 180.00,
      status_pagamento: "pago",
      billing_type: "PIX",
      asaas_payment_id: `pay_demo_a_${i}`,
      repasse_status: "disponivel",
      repasse_data_prevista: hoje.toISOString(),
      code: `CTA-${100 + i}`,
      access_token: crypto.randomUUID(),
      comprador_camisa: "M",
      parceiro_camisa: "G",
      created_at: new Date(hoje.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 16 duplas Categoria B (R$ 160 cada = R$ 2.560)
  for (let i = 0; i < 16; i++) {
    const ticketId = `c1000000-0000-4000-8000-0000000030${i < 10 ? "0" + i : i}`;
    athleteTickets.push({
      id: ticketId,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_B_ID,
      categoria_nome: "Categoria B",
      comprador_nome: `Atleta B${i + 1} Titular`,
      comprador_cpf: `333444555${i < 10 ? "0" + i : i}`,
      comprador_email: `atletab${i + 1}@demo.rankftv.com`,
      comprador_zap: "71993334455",
      comprador_genero: "masculino",
      parceiro_nome: `Atleta B${i + 1} Parceiro`,
      parceiro_cpf: `666777888${i < 10 ? "0" + i : i}`,
      parceiro_email: `parceirob${i + 1}@demo.rankftv.com`,
      parceiro_zap: "71994445566",
      parceiro_genero: "masculino",
      valor: 160.00,
      status_pagamento: "pago",
      billing_type: "PIX",
      asaas_payment_id: `pay_demo_b_${i}`,
      repasse_status: "disponivel",
      repasse_data_prevista: hoje.toISOString(),
      code: `CTB-${100 + i}`,
      access_token: crypto.randomUUID(),
      comprador_camisa: "G",
      parceiro_camisa: "M",
      created_at: new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 16 duplas Misto Iniciante (R$ 140 cada = R$ 2.240)
  for (let i = 0; i < 16; i++) {
    const ticketId = `c1000000-0000-4000-8000-0000000040${i < 10 ? "0" + i : i}`;
    athleteTickets.push({
      id: ticketId,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_MISTO_ID,
      categoria_nome: "Misto Iniciante",
      comprador_nome: `Atleta Misto ${i + 1} Masc`,
      comprador_cpf: `444555666${i < 10 ? "0" + i : i}`,
      comprador_email: `misto${i + 1}@demo.rankftv.com`,
      comprador_zap: "71995556677",
      comprador_genero: "masculino",
      parceiro_nome: `Atleta Misto ${i + 1} Fem`,
      parceiro_cpf: `777888999${i < 10 ? "0" + i : i}`,
      parceiro_email: `parceiromisto${i + 1}@demo.rankftv.com`,
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
      comprador_camisa: "GG",
      parceiro_camisa: "P",
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

  // 6. Ingressos de Plateia e Camarote VIP
  // 380 ingressos Arquibancada a R$ 25 = R$ 9.500
  // 95 ingressos Camarote VIP a R$ 90 = R$ 8.550
  // Ingressos agrupados para compor o faturamento de +R$ 50.000:
  const spectatorTickets = [];
  
  // 380 ingressos arquibancada
  for (let i = 0; i < 380; i++) {
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
      checked_in: i < 280, // 280 já fizeram check-in na portaria!
      checkin_at: i < 280 ? new Date().toISOString() : null,
      repasse_status: i % 3 === 0 ? "aguardando_liquidacao" : "disponivel",
      repasse_data_prevista: hoje.toISOString(),
      created_at: new Date(hoje.getTime() - (5 - (i % 5)) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 95 ingressos camarote VIP
  for (let i = 0; i < 95; i++) {
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
      checked_in: i < 75, // 75 já no camarote
      checkin_at: i < 75 ? new Date().toISOString() : null,
      repasse_status: "aguardando_liquidacao",
      repasse_data_prevista: new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(hoje.getTime() - (4 - (i % 4)) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 110 ingressos Camarote VIP + Camisa Oficial (R$ 150 = R$ 16.500)
  for (let i = 0; i < 110; i++) {
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
      checked_in: i < 90,
      checkin_at: i < 90 ? new Date().toISOString() : null,
      repasse_status: i % 2 === 0 ? "aguardando_liquidacao" : "disponivel",
      repasse_data_prevista: hoje.toISOString(),
      created_at: new Date(hoje.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 100 ingressos Passaporte Final de Semana Completo (R$ 70 = R$ 7.000)
  for (let i = 0; i < 100; i++) {
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
      checked_in: i < 80,
      checkin_at: i < 80 ? new Date().toISOString() : null,
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

  // 7. Chaveamento Oficial Ativo nas SEMIFINAIS (Open Pro)
  await supabase.from("bracket_matches").delete().eq("championship_id", CHAMPIONSHIP_ID);
  await supabase.from("bracket_participants").delete().eq("championship_id", CHAMPIONSHIP_ID);

  const participantsData = [];
  for (let i = 0; i < duplasNomes.length; i++) {
    const [a1, a2] = duplasNomes[i];
    const ticketId = `c1000000-0000-4000-8000-0000000010${i < 10 ? "0" + i : i}`;
    participantsData.push({
      id: `c1000000-0000-4000-8000-0000000090${i < 10 ? "0" + i : i}`,
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      athlete_ticket_id: ticketId,
      display_name_snapshot: `${a1} & ${a2}`,
      source_type: "athlete_ticket",
      active: true,
    });
  }

  for (const p of participantsData) {
    const { error: partErr } = await supabase.from("bracket_participants").upsert(p, { onConflict: "id" });
    if (partErr) throw partErr;
  }
  console.log("16 duplas registradas em bracket_participants!");

  // Marcar categoria com bracket_confirmed_at
  await supabase
    .from("championship_categories")
    .update({ bracket_confirmed_at: new Date().toISOString() })
    .eq("id", CAT_OPEN_PRO_ID);

  // Bracket Matches:
  // Round 0: Oitavas (8 partidas, índices 0 a 7) - Todas finalizadas com vencedor!
  // Round 1: Quartas (4 partidas, índices 0 a 3) - Todas finalizadas com vencedor!
  // Round 2: Semifinais (2 partidas, índices 0 e 1):
  //          - Match 0: Tavinho/Franklin (p[0]) vs Bruninho/Sandrey (p[1]) -> 1x1 em sets (AO VIVO NO TELÃO!)
  //          - Match 1: Hiltinho/Franklin Jr (p[2]) vs Paraná/Felipinho (p[3]) -> Aguardando início!
  // Round 3: Grande Final (1 partida, índice 0) -> Aguardando vencedores das semifinais!

  const bracketMatches = [
    // Oitavas
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 0,
      match_index: 0,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: "1",
      participant_a_id: participantsData[0].id,
      participant_b_id: participantsData[15].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 12 }, { a: 18, b: 14 }],
      winner_participant_id: participantsData[0].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 0,
      match_index: 1,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: "2",
      participant_a_id: participantsData[1].id,
      participant_b_id: participantsData[14].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 16 }, { a: 15, b: 18 }, { a: 18, b: 13 }],
      winner_participant_id: participantsData[1].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 0,
      match_index: 2,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: "3",
      participant_a_id: participantsData[2].id,
      participant_b_id: participantsData[13].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 11 }, { a: 18, b: 13 }],
      winner_participant_id: participantsData[2].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 0,
      match_index: 3,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: "4",
      participant_a_id: participantsData[3].id,
      participant_b_id: participantsData[12].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 15 }, { a: 16, b: 18 }, { a: 18, b: 14 }],
      winner_participant_id: participantsData[3].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 0,
      match_index: 4,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: "1",
      participant_a_id: participantsData[4].id,
      participant_b_id: participantsData[11].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 14 }, { a: 18, b: 15 }],
      winner_participant_id: participantsData[4].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 0,
      match_index: 5,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: "2",
      participant_a_id: participantsData[5].id,
      participant_b_id: participantsData[10].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 13 }, { a: 18, b: 16 }],
      winner_participant_id: participantsData[5].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 0,
      match_index: 6,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: "3",
      participant_a_id: participantsData[6].id,
      participant_b_id: participantsData[9].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 17 }, { a: 14, b: 18 }, { a: 18, b: 15 }],
      winner_participant_id: participantsData[6].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 0,
      match_index: 7,
      bracket_section: "winners",
      section_round_index: 0,
      court_label: "4",
      participant_a_id: participantsData[7].id,
      participant_b_id: participantsData[8].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 12 }, { a: 18, b: 15 }],
      winner_participant_id: participantsData[7].id,
      operational_status: "finished",
    },

    // Quartas de Final
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 1,
      match_index: 0,
      bracket_section: "winners",
      section_round_index: 1,
      court_label: "1",
      participant_a_id: participantsData[0].id,
      participant_b_id: participantsData[7].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 16 }, { a: 17, b: 19 }, { a: 18, b: 15 }],
      winner_participant_id: participantsData[0].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 1,
      match_index: 1,
      bracket_section: "winners",
      section_round_index: 1,
      court_label: "2",
      participant_a_id: participantsData[1].id,
      participant_b_id: participantsData[6].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 14 }, { a: 18, b: 12 }],
      winner_participant_id: participantsData[1].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 1,
      match_index: 2,
      bracket_section: "winners",
      section_round_index: 1,
      court_label: "1",
      participant_a_id: participantsData[2].id,
      participant_b_id: participantsData[5].id,
      sets_a: 2,
      sets_b: 1,
      set_details: [{ a: 18, b: 15 }, { a: 14, b: 18 }, { a: 18, b: 16 }],
      winner_participant_id: participantsData[2].id,
      operational_status: "finished",
    },
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 1,
      match_index: 3,
      bracket_section: "winners",
      section_round_index: 1,
      court_label: "2",
      participant_a_id: participantsData[3].id,
      participant_b_id: participantsData[4].id,
      sets_a: 2,
      sets_b: 0,
      set_details: [{ a: 18, b: 13 }, { a: 18, b: 15 }],
      winner_participant_id: participantsData[3].id,
      operational_status: "finished",
    },

    // SEMIFINAIS (AO VIVO NO TELÃO!)
    // Semifinal 1: Tavinho/Franklin vs Bruninho/Sandrey (Empatado em 1x1 em sets!)
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 2,
      match_index: 0,
      bracket_section: "winners",
      section_round_index: 2,
      court_label: "Quadra Central",
      participant_a_id: participantsData[0].id,
      participant_b_id: participantsData[1].id,
      sets_a: 1,
      sets_b: 1,
      set_details: [{ a: 18, b: 16 }, { a: 16, b: 18 }],
      winner_participant_id: null, // AO VIVO!
      operational_status: "in_progress",
    },
    // Semifinal 2: Hiltinho/Franklin Jr vs Paraná/Felipinho (Aguardando término da Semi 1)
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
      round_index: 2,
      match_index: 1,
      bracket_section: "winners",
      section_round_index: 2,
      court_label: "Quadra Central",
      participant_a_id: participantsData[2].id,
      participant_b_id: participantsData[3].id,
      sets_a: null,
      sets_b: null,
      set_details: null,
      winner_participant_id: null,
      operational_status: "scheduled",
    },

    // GRANDE FINAL
    {
      championship_id: CHAMPIONSHIP_ID,
      category_id: CAT_OPEN_PRO_ID,
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

  const { error: bracketErr } = await supabase.from("bracket_matches").insert(bracketMatches);
  if (bracketErr) throw bracketErr;
  console.log("Chaveamento oficial de Semifinais inserido com sucesso!");

  // Garantir que o Circuito RankFTV esteja nos destaques da Home
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

  console.log("==========================================");
  console.log("🏆 CIRCUITO RANKFTV OPEN PRO 2026 ATIVO!");
  console.log(`Faturamento de Atletas: R$ ${totalAtletas.toFixed(2)}`);
  console.log(`Faturamento de Plateia / Camarote: R$ ${totalPlateia.toFixed(2)}`);
  console.log(`FATURAMENTO TOTAL DO CAMPEONATO: R$ ${totalGeral.toFixed(2)} (+R$ 50k!)`);
  console.log("Status: EM ANDAMENTO (SEMIFINAIS AO VIVO!)");
  console.log(`Link: /campeonatos/${CHAMPIONSHIP_ID}`);
  console.log(`Painel: /painel/campeonatos/${CHAMPIONSHIP_ID}`);
  console.log("==========================================");
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
