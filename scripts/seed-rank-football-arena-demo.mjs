import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CEO_USER_ID = "f58de881-3c02-4748-847c-d4d945e527a8";
const DEMO_ARENA_ID = "a1000000-0000-4000-8000-000000000001";
const DEMO_ARENA_HANDLE = "rank-football";

const PLAN_2X_ID = "a1000000-0000-4000-8000-000000000101";
const PLAN_3X_ID = "a1000000-0000-4000-8000-000000000102";
const PLAN_ILIMITADO_ID = "a1000000-0000-4000-8000-000000000103";
const PLAN_DIARIA_ID = "a1000000-0000-4000-8000-000000000104";
const PLAN_ALUGUEL_ID = "a1000000-0000-4000-8000-000000000105";

const CLASS_IDS = {
  iniciacaoManha: "a1000000-0000-4000-8000-000000000201",
  interManha: "a1000000-0000-4000-8000-000000000202",
  avancadoNoite: "a1000000-0000-4000-8000-000000000203",
  femininoNoite: "a1000000-0000-4000-8000-000000000204",
  mistaNoite: "a1000000-0000-4000-8000-000000000205",
  sabadoVip: "a1000000-0000-4000-8000-000000000206",
};

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function pad2(n) {
  return String(n).padStart(2, "0");
}

function addDaysISO(baseISO, deltaDays) {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function getDayOfWeekUTC(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function monthKeysBetween(startMonth, endMonth) {
  const [sy, sm] = startMonth.split("-").map(Number);
  const [ey, em] = endMonth.split("-").map(Number);
  const result = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${pad2(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result;
}

const DEMO_STUDENTS = [
  // Risco crítico (pararam de treinar entre 22 e 34 dias atrás)
  { slug: "01", nome: "Lucas Ferreira", username: "lucas_ferreira_rf", genero: "masculino", rating: 1580, tel: "71998110001", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 11, profileType: "critico", stopDaysAgo: 28, unpaidCurrent: true, classId: CLASS_IDS.mistaNoite },
  { slug: "02", nome: "Bruno Oliveira", username: "bruno_oliveira_rf", genero: "masculino", rating: 1710, tel: "71998110002", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 10, profileType: "critico", stopDaysAgo: 24, unpaidCurrent: true, classId: CLASS_IDS.avancadoNoite },
  { slug: "03", nome: "Camila Costa", username: "camila_costa_rf", genero: "feminino", rating: 1420, tel: "71998110003", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 9, profileType: "critico", stopDaysAgo: 31, unpaidCurrent: false, classId: CLASS_IDS.femininoNoite },
  { slug: "04", nome: "Rafael Santos", username: "rafael_santos_rf", genero: "masculino", rating: 1640, tel: "71998110004", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 12, profileType: "critico", stopDaysAgo: 22, unpaidCurrent: false, classId: CLASS_IDS.interManha },
  { slug: "05", nome: "Thiago Almeida", username: "thiago_almeida_rf", genero: "masculino", rating: 1320, tel: "71998110005", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 6, profileType: "critico", stopDaysAgo: 26, unpaidCurrent: true, classId: CLASS_IDS.iniciacaoManha },

  // Em atenção (ausentes entre 12 e 17 dias ou queda de ritmo)
  { slug: "06", nome: "Mariana Ribeiro", username: "mari_ribeiro_rf", genero: "feminino", rating: 1510, tel: "71998110006", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 8, profileType: "atencao", stopDaysAgo: 14, unpaidCurrent: false, classId: CLASS_IDS.femininoNoite },
  { slug: "07", nome: "Gustavo Mendes", username: "gustavo_mendes_rf", genero: "masculino", rating: 1690, tel: "71998110007", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 11, profileType: "atencao", stopDaysAgo: 16, unpaidCurrent: false, classId: CLASS_IDS.mistaNoite },
  { slug: "08", nome: "Larissa Souza", username: "larissa_souza_rf", genero: "feminino", rating: 1260, tel: "71998110008", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 4, profileType: "atencao", stopDaysAgo: 12, unpaidCurrent: true, classId: CLASS_IDS.iniciacaoManha },
  { slug: "09", nome: "Danilo Martins", username: "danilo_martins_rf", genero: "masculino", rating: 1750, tel: "71998110009", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 12, profileType: "atencao", stopDaysAgo: 15, unpaidCurrent: false, classId: CLASS_IDS.avancadoNoite },

  // Assíduos (treinando regularmente nos últimos 12 meses até essa semana)
  { slug: "10", nome: "Matheus Carvalho", username: "matheus_carv_rf", genero: "masculino", rating: 1940, tel: "71998110010", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 12, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.avancadoNoite },
  { slug: "11", nome: "Juliana Andrade", username: "ju_andrade_rf", genero: "feminino", rating: 1790, tel: "71998110011", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 12, profileType: "assiduo", stopDaysAgo: 0, unpaidCurrent: false, classId: CLASS_IDS.femininoNoite },
  { slug: "12", nome: "Gabriel Barbosa", username: "gabriel_barb_rf", genero: "masculino", rating: 1880, tel: "71998110012", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 12, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.avancadoNoite },
  { slug: "13", nome: "Pedro Henrique", username: "pedro_h_rf", genero: "masculino", rating: 1820, tel: "71998110013", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 12, profileType: "assiduo", stopDaysAgo: 2, unpaidCurrent: false, classId: CLASS_IDS.mistaNoite },
  { slug: "14", nome: "Beatriz Nogueira", username: "bia_nogueira_rf", genero: "feminino", rating: 1620, tel: "71998110014", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 11, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.femininoNoite },
  { slug: "15", nome: "Felipe Rocha", username: "felipe_rocha_rf", genero: "masculino", rating: 1850, tel: "71998110015", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 11, profileType: "assiduo", stopDaysAgo: 0, unpaidCurrent: false, classId: CLASS_IDS.sabadoVip },
  { slug: "16", nome: "Amanda Teixeira", username: "amanda_tx_rf", genero: "feminino", rating: 1540, tel: "71998110016", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 11, profileType: "assiduo", stopDaysAgo: 2, unpaidCurrent: false, classId: CLASS_IDS.femininoNoite },
  { slug: "17", nome: "Rodrigo Vieira", username: "rodrigo_vieira_rf", genero: "masculino", rating: 1730, tel: "71998110017", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 10, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.interManha },
  { slug: "18", nome: "Fernanda Lima", username: "fer_lima_rf", genero: "feminino", rating: 1470, tel: "71998110018", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 10, profileType: "assiduo", stopDaysAgo: 3, unpaidCurrent: false, classId: CLASS_IDS.interManha },
  { slug: "19", nome: "Diego Nascimento", username: "diego_nasc_rf", genero: "masculino", rating: 1910, tel: "71998110019", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 10, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.avancadoNoite },
  { slug: "20", nome: "Caio Santana", username: "caio_santana_rf", genero: "masculino", rating: 1660, tel: "71998110020", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 9, profileType: "assiduo", stopDaysAgo: 2, unpaidCurrent: false, classId: CLASS_IDS.mistaNoite },
  { slug: "21", nome: "Leticia Moreira", username: "leticia_m_rf", genero: "feminino", rating: 1380, tel: "71998110021", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 9, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.iniciacaoManha },
  { slug: "22", nome: "Vinicius Cardoso", username: "vini_cardoso_rf", genero: "masculino", rating: 1770, tel: "71998110022", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 8, profileType: "assiduo", stopDaysAgo: 0, unpaidCurrent: false, classId: CLASS_IDS.mistaNoite },
  { slug: "23", nome: "Sofia Araújo", username: "sofia_araujo_rf", genero: "feminino", rating: 1490, tel: "71998110023", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 8, profileType: "assiduo", stopDaysAgo: 2, unpaidCurrent: false, classId: CLASS_IDS.femininoNoite },
  { slug: "24", nome: "Henrique Gomes", username: "henrique_g_rf", genero: "masculino", rating: 1610, tel: "71998110024", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 7, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: true, classId: CLASS_IDS.interManha },
  { slug: "25", nome: "Bruna Tavares", username: "bruna_tav_rf", genero: "feminino", rating: 1350, tel: "71998110025", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 7, profileType: "assiduo", stopDaysAgo: 3, unpaidCurrent: false, classId: CLASS_IDS.iniciacaoManha },
  { slug: "26", nome: "Eduardo Nunes", username: "edu_nunes_rf", genero: "masculino", rating: 1840, tel: "71998110026", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 6, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.sabadoVip },
  { slug: "27", nome: "Natalia Freitas", username: "nat_freitas_rf", genero: "feminino", rating: 1590, tel: "71998110027", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 6, profileType: "assiduo", stopDaysAgo: 2, unpaidCurrent: false, classId: CLASS_IDS.femininoNoite },
  { slug: "28", nome: "Igor Batista", username: "igor_batista_rf", genero: "masculino", rating: 1700, tel: "71998110028", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 5, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.mistaNoite },
  { slug: "29", nome: "Carolina Duarte", username: "carol_duarte_rf", genero: "feminino", rating: 1410, tel: "71998110029", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 5, profileType: "assiduo", stopDaysAgo: 0, unpaidCurrent: false, classId: CLASS_IDS.iniciacaoManha },
  { slug: "30", nome: "Arthur Pacheco", username: "arthur_pach_rf", genero: "masculino", rating: 1650, tel: "71998110030", planId: PLAN_3X_ID, valor: 259.90, monthsAgo: 4, profileType: "assiduo", stopDaysAgo: 2, unpaidCurrent: false, classId: CLASS_IDS.interManha },
  { slug: "31", nome: "Luana Correia", username: "luana_corr_rf", genero: "feminino", rating: 1290, tel: "71998110031", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 3, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: true, classId: CLASS_IDS.iniciacaoManha },
  { slug: "32", nome: "Bernardo Dias", username: "bernardo_d_rf", genero: "masculino", rating: 1780, tel: "71998110032", planId: PLAN_ILIMITADO_ID, valor: 329.90, monthsAgo: 3, profileType: "assiduo", stopDaysAgo: 1, unpaidCurrent: false, classId: CLASS_IDS.avancadoNoite },
  { slug: "33", nome: "Isabela Monteiro", username: "isa_monteiro_rf", genero: "feminino", rating: 1520, tel: "71998110033", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 2, profileType: "assiduo", stopDaysAgo: 2, unpaidCurrent: false, classId: CLASS_IDS.femininoNoite },
  { slug: "34", nome: "Murilo Azevedo", username: "murilo_az_rf", genero: "masculino", rating: 1390, tel: "71998110034", planId: PLAN_2X_ID, valor: 199.90, monthsAgo: 1, profileType: "assiduo", stopDaysAgo: 0, unpaidCurrent: false, classId: CLASS_IDS.mistaNoite },
];

async function findOrCreateDemoUser(student) {
  const email = `aluno${student.slug}.rankfootball@demo.rankftv.internal`;
  const existing = await supabase
    .from("profiles")
    .select("id")
    .eq("username", student.username)
    .maybeSingle();

  let userId = existing.data?.id ?? null;

  if (!userId) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: `${crypto.randomUUID()}!Aa1`,
      email_confirm: true,
      ban_duration: "876000h",
      user_metadata: {
        nome: student.nome,
        username: student.username,
        demo_arena_student: true,
      },
    });
    if (createErr) {
      // Se email já existir sem profile correspondente, recupera pela paginação de auth
      const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = listed?.users?.find((u) => u.email?.toLowerCase() === email);
      if (!found) throw createErr;
      userId = found.id;
    } else {
      userId = created.user.id;
    }
  }

  const { error: profErr } = await supabase.from("profiles").upsert({
    id: userId,
    nome: student.nome,
    username: student.username,
    genero: student.genero,
    rating: student.rating,
    cidade: "Salvador",
    estado: "BA",
    role: "user",
  }, { onConflict: "id" });
  if (profErr) throw profErr;

  const { error: privErr } = await supabase.from("profiles_private").upsert({
    user_id: userId,
    telefone: student.tel,
  }, { onConflict: "user_id" });
  if (privErr) throw privErr;

  return userId;
}

async function seed() {
  console.log("Iniciando limpeza das arenas antigas do CEO e criação da arena Rank Football (Plano Pro)...");

  // 1. Verificar perfil CEO
  const { data: ceoProfile } = await supabase
    .from("profiles")
    .select("id, nome, username")
    .eq("id", CEO_USER_ID)
    .maybeSingle();
  if (!ceoProfile) {
    throw new Error(`Perfil CEO ${CEO_USER_ID} não encontrado.`);
  }
  console.log(`CEO confirmado: ${ceoProfile.nome} (@${ceoProfile.username})`);

  // 2. Remover TODAS as arenas antigas do CEO (inclusive a própria DEMO_ARENA_ID se for re-execução)
  const { data: existingCeoArenas, error: listArenaErr } = await supabase
    .from("arenas")
    .select("id, nome, handle")
    .eq("dono_id", CEO_USER_ID);
  if (listArenaErr) throw listArenaErr;

  const idsToDelete = new Set((existingCeoArenas ?? []).map((a) => a.id));
  idsToDelete.add(DEMO_ARENA_ID);

  for (const arena of existingCeoArenas ?? []) {
    console.log(`Removendo arena antiga do CEO: ${arena.nome} (@${arena.handle}) [${arena.id}]`);
  }

  for (const arenaId of idsToDelete) {
    await supabase.from("arena_attendance").delete().eq("arena_id", arenaId);
    await supabase.from("student_charges").delete().eq("arena_id", arenaId);
    await supabase.from("arena_daily_passes").delete().eq("arena_id", arenaId);
    await supabase.from("arena_rentals").delete().eq("arena_id", arenaId);
    await supabase.from("arena_subscriptions").delete().eq("arena_id", arenaId);
    await supabase.from("arena_students").delete().eq("arena_id", arenaId);
    await supabase.from("arena_classes").delete().eq("arena_id", arenaId);
    await supabase.from("arena_plans").delete().eq("arena_id", arenaId);
    await supabase.from("arena_photos").delete().eq("arena_id", arenaId);
    await supabase.from("arena_staff").delete().eq("arena_id", arenaId);
    await supabase.from("arena_accounts").delete().eq("arena_id", arenaId);
    const { error: delErr } = await supabase.from("arenas").delete().eq("id", arenaId);
    if (delErr) throw delErr;
  }

  // Também garantir que handle 'rank-football' não esteja ocupado
  await supabase.from("arenas").delete().eq("handle", DEMO_ARENA_HANDLE);

  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const currentMonth = todayISO.slice(0, 7);
  const oneYearAgoISO = addDaysISO(todayISO, -365);

  // 3. Criar nova Arena Demo "Rank Football"
  const { error: arenaErr } = await supabase.from("arenas").insert({
    id: DEMO_ARENA_ID,
    dono_id: CEO_USER_ID,
    nome: "Rank Football",
    handle: DEMO_ARENA_HANDLE,
    cidade: "Salvador",
    estado: "BA",
    descricao:
      "CT Oficial Rank Football — 3 quadras de areia profissional com iluminação LED, turmas do iniciante ao alto rendimento, mensalidade recorrente automática e torneios internos.",
    banner_url: "/arenas/rank-football-destaque.webp",
    invite_code: "RANKFTV1",
    cancel_horas_antes: 2,
    created_at: `${oneYearAgoISO}T10:00:00-03:00`,
  });
  if (arenaErr) throw arenaErr;

  // 4. Ativar assinatura Plano Pro e conta de repasse
  const nextMonthISO = addDaysISO(todayISO, 25);
  const { error: subErr } = await supabase.from("arena_subscriptions").insert({
    arena_id: DEMO_ARENA_ID,
    user_id: CEO_USER_ID,
    plano: "pro",
    status: "ativo",
    asaas_subscription_id: "sub_demo_rank_football_pro",
    proximo_vencimento: nextMonthISO,
  });
  if (subErr) throw subErr;

  const { error: accErr } = await supabase.from("arena_accounts").upsert({
    arena_id: DEMO_ARENA_ID,
    user_id: CEO_USER_ID,
    cpf_cnpj: "00000000000",
    telefone: "71999000000",
    habilitado: true,
    chave_pix: "financeiro@rankfootball.demo",
  }, { onConflict: "arena_id" });
  if (accErr) throw accErr;

  // 5. Cadastrar Planos da Arena
  const plansSeed = [
    {
      id: PLAN_2X_ID,
      arena_id: DEMO_ARENA_ID,
      tipo: "mensalidade",
      nome: "Plano 2x na Semana",
      descricao: "Direito a 2 treinos semanais com professor em qualquer horário da sua categoria.",
      valor: 199.90,
      ativo: true,
      ordem: 1,
      aceita_credito: true,
      aceita_debito: true,
      dia_vencimento: 10,
      aulas_por_semana: 2,
    },
    {
      id: PLAN_3X_ID,
      arena_id: DEMO_ARENA_ID,
      tipo: "mensalidade",
      nome: "Plano 3x na Semana",
      descricao: "Ideal para evolução consistente: 3 aulas semanais com acompanhamento tático.",
      valor: 259.90,
      ativo: true,
      ordem: 2,
      aceita_credito: true,
      aceita_debito: true,
      dia_vencimento: 10,
      aulas_por_semana: 3,
    },
    {
      id: PLAN_ILIMITADO_ID,
      arena_id: DEMO_ARENA_ID,
      tipo: "mensalidade",
      nome: "Plano Ilimitado Pro",
      descricao: "Acesso livre a todos os treinos da semana, rachões de sábado e prioridade em copinhas internas.",
      valor: 329.90,
      ativo: true,
      ordem: 3,
      aceita_credito: true,
      aceita_debito: true,
      dia_vencimento: 5,
      aulas_por_semana: null,
    },
    {
      id: PLAN_DIARIA_ID,
      arena_id: DEMO_ARENA_ID,
      tipo: "diaria",
      nome: "Diária / Treino Avulso",
      descricao: "Participe de 1 aula avulsa com professor sem compromisso mensal.",
      valor: 45.00,
      ativo: true,
      ordem: 4,
      aceita_credito: true,
      aceita_debito: false,
      dia_vencimento: 10,
      aulas_por_semana: null,
    },
    {
      id: PLAN_ALUGUEL_ID,
      arena_id: DEMO_ARENA_ID,
      tipo: "aluguel",
      nome: "Locação de Quadra de Areia (1h)",
      descricao: "Reserva exclusiva de 1 hora de quadra oficial com bolas e iluminação noturna inclusa.",
      valor: 140.00,
      ativo: true,
      ordem: 5,
      aceita_credito: true,
      aceita_debito: false,
      dia_vencimento: 10,
      aulas_por_semana: null,
    },
  ];
  const { error: planErr } = await supabase.from("arena_plans").insert(plansSeed);
  if (planErr) throw planErr;

  // 6. Cadastrar Turmas / Aulas Recorrentes
  const classesSeed = [
    {
      id: CLASS_IDS.iniciacaoManha,
      arena_id: DEMO_ARENA_ID,
      titulo: "Fundamentos & Iniciação (Manhã)",
      dias_semana: [1, 3, 5],
      horario: "07:00",
      hora_inicio: "07:00",
      hora_fim: "08:00",
      duracao_minutos: 60,
      nivel: "iniciante",
      publico: "misto",
      max_alunos: 12,
      valor_avulso: 45.00,
      ativo: true,
    },
    {
      id: CLASS_IDS.interManha,
      arena_id: DEMO_ARENA_ID,
      titulo: "Evolução Intermediário (Manhã)",
      dias_semana: [2, 4, 6],
      horario: "08:00",
      hora_inicio: "08:00",
      hora_fim: "09:00",
      duracao_minutos: 60,
      nivel: "intermediario",
      publico: "misto",
      max_alunos: 12,
      valor_avulso: 45.00,
      ativo: true,
    },
    {
      id: CLASS_IDS.avancadoNoite,
      arena_id: DEMO_ARENA_ID,
      titulo: "Alto Rendimento & Ataque",
      dias_semana: [1, 3, 5],
      horario: "18:00",
      hora_inicio: "18:00",
      hora_fim: "19:15",
      duracao_minutos: 75,
      nivel: "avancado",
      publico: "masculino",
      max_alunos: 10,
      valor_avulso: 50.00,
      ativo: true,
    },
    {
      id: CLASS_IDS.femininoNoite,
      arena_id: DEMO_ARENA_ID,
      titulo: "Treino Feminino Arena",
      dias_semana: [2, 4],
      horario: "18:30",
      hora_inicio: "18:30",
      hora_fim: "19:30",
      duracao_minutos: 60,
      nivel: "intermediario",
      publico: "feminino",
      max_alunos: 12,
      valor_avulso: 45.00,
      ativo: true,
    },
    {
      id: CLASS_IDS.mistaNoite,
      arena_id: DEMO_ARENA_ID,
      titulo: "Turma Noturna Mista",
      dias_semana: [1, 2, 3, 4],
      horario: "19:30",
      hora_inicio: "19:30",
      hora_fim: "20:30",
      duracao_minutos: 60,
      nivel: "intermediario",
      publico: "misto",
      max_alunos: 14,
      valor_avulso: 45.00,
      ativo: true,
    },
    {
      id: CLASS_IDS.sabadoVip,
      arena_id: DEMO_ARENA_ID,
      titulo: "Sábado Livre & Rachão VIP",
      dias_semana: [6],
      horario: "09:30",
      hora_inicio: "09:30",
      hora_fim: "11:30",
      duracao_minutos: 120,
      nivel: "avancado",
      publico: "misto",
      max_alunos: 16,
      valor_avulso: 45.00,
      ativo: true,
    },
  ];
  const { error: clsErr } = await supabase.from("arena_classes").insert(classesSeed);
  if (clsErr) throw clsErr;

  const classDaysMap = new Map(classesSeed.map((c) => [c.id, c.dias_semana]));

  // 7. Criar 34 alunos demo e vincular à Rank Football (histórico de até 12 meses)
  const resolvedStudents = [];
  const studentRows = [];

  for (const s of DEMO_STUDENTS) {
    const userId = await findOrCreateDemoUser(s);
    const dataEntrada = addDaysISO(todayISO, -(s.monthsAgo * 30));
    const studentId = crypto.randomUUID();
    resolvedStudents.push({ ...s, userId, studentId, dataEntrada });
    studentRows.push({
      id: studentId,
      arena_id: DEMO_ARENA_ID,
      user_id: userId,
      status: "ativo",
      valor_mensalidade: s.valor,
      data_entrada: dataEntrada,
      plan_id: s.planId,
      asaas_customer_id: `cus_demo_rf_${s.slug}`,
      asaas_subscription_id: `sub_demo_rf_${s.slug}`,
      created_at: `${dataEntrada}T12:00:00-03:00`,
    });
  }

  const { error: studErr } = await supabase.from("arena_students").insert(studentRows);
  if (studErr) throw studErr;
  console.log(`Matriculados ${studentRows.length} alunos com recorrência mensal na Rank Football.`);

  // 8. Gerar 12 meses de histórico financeiro (student_charges)
  const chargeRows = [];
  for (const st of resolvedStudents) {
    const startMonth = st.dataEntrada.slice(0, 7);
    const meses = monthKeysBetween(startMonth, currentMonth);
    for (const comp of meses) {
      const isCurrent = comp === currentMonth;
      const isPending = isCurrent && st.unpaidCurrent;
      chargeRows.push({
        arena_id: DEMO_ARENA_ID,
        arena_student_id: st.studentId,
        user_id: st.userId,
        competencia: comp,
        valor: st.valor,
        status_pagamento: isPending ? "pendente" : "pago",
        asaas_payment_id: `pay_rf_${st.slug}_${comp.replace("-", "")}`,
        pago_em: isPending ? null : `${comp}-10T10:15:00-03:00`,
        repasse_status: isPending ? "pendente" : "concluido",
        repasse_data_prevista: `${comp}-11T10:15:00-03:00`,
        created_at: `${comp}-05T09:00:00-03:00`,
      });
    }
  }

  for (let i = 0; i < chargeRows.length; i += 100) {
    const { error: chgErr } = await supabase.from("student_charges").insert(chargeRows.slice(i, i + 100));
    if (chgErr) throw chgErr;
  }
  const paid12m = chargeRows.filter((c) => c.status_pagamento === "pago").reduce((acc, c) => acc + c.valor, 0);
  console.log(`Geradas ${chargeRows.length} cobranças recorrentes nos últimos 12 meses (R$ ${paid12m.toFixed(2)} recebidos).`);

  // 9. Gerar 12 meses de presenças (arena_attendance) + faltas propositais para o Radar Anti-Evasão
  const attendanceRows = [];
  const attendanceKeySet = new Set();

  for (const st of resolvedStudents) {
    const classDays = classDaysMap.get(st.classId) ?? [1, 3, 5];
    const startISO = st.dataEntrada;
    const lastActiveISO =
      st.profileType === "assiduo"
        ? addDaysISO(todayISO, -st.stopDaysAgo)
        : addDaysISO(todayISO, -st.stopDaysAgo);

    // Percorre dia a dia do último ano gerando check-ins realistas nas datas da turma
    for (let offset = -365; offset <= 0; offset++) {
      const dISO = addDaysISO(todayISO, offset);
      if (dISO < startISO || dISO > lastActiveISO) continue;
      const dow = getDayOfWeekUTC(dISO);
      if (!classDays.includes(dow)) continue;

      // Assíduos comparecem ~80% dos treinos; quem entrou em atenção nos últimos 45d reduziu frequência
      const deterministicMod = (Number(st.slug) * 7 + Math.abs(offset)) % 10;
      if (st.profileType === "atencao" && dISO >= addDaysISO(todayISO, -45) && deterministicMod > 3) {
        continue;
      }
      if (deterministicMod === 9) continue; // falta pontual natural

      const key = `${st.classId}|${st.userId}|${dISO}`;
      if (attendanceKeySet.has(key)) continue;
      attendanceKeySet.add(key);

      attendanceRows.push({
        arena_id: DEMO_ARENA_ID,
        class_id: st.classId,
        user_id: st.userId,
        data: dISO,
        status: "presente",
        tipo_cobranca: "credito",
        pagamento_status: "nao_aplicavel",
        repasse_status: "nao_aplicavel",
        finalized_at: `${dISO}T21:00:00-03:00`,
        finalized_by: CEO_USER_ID,
      });
    }

    // Reservas futuras (hoje / próximos 2 dias) para alunos assíduos deixarem a agenda da semana viva
    if (st.profileType === "assiduo") {
      for (let future = 1; future <= 3; future++) {
        const fISO = addDaysISO(todayISO, future);
        const dow = getDayOfWeekUTC(fISO);
        if (!classDays.includes(dow)) continue;
        const key = `${st.classId}|${st.userId}|${fISO}`;
        if (attendanceKeySet.has(key)) continue;
        attendanceKeySet.add(key);
        attendanceRows.push({
          arena_id: DEMO_ARENA_ID,
          class_id: st.classId,
          user_id: st.userId,
          data: fISO,
          status: "reservado",
          tipo_cobranca: "credito",
          pagamento_status: "nao_aplicavel",
          repasse_status: "nao_aplicavel",
        });
        break;
      }
    }
  }

  for (let i = 0; i < attendanceRows.length; i += 250) {
    const { error: attErr } = await supabase.from("arena_attendance").insert(attendanceRows.slice(i, i + 250));
    if (attErr) throw attErr;
  }
  console.log(`Registradas ${attendanceRows.length} presenças ao longo de 12 meses (incluindo alertas para o Radar Anti-Evasão).`);

  // 10. Registrar diárias avulsas e locações de quadra pagas
  const sampleDailyPasses = resolvedStudents.slice(10, 18).map((st, idx) => ({
    arena_id: DEMO_ARENA_ID,
    plan_id: PLAN_DIARIA_ID,
    user_id: st.userId,
    data: addDaysISO(todayISO, -(idx * 14 + 3)),
    valor: 45.00,
    status_pagamento: "pago",
    repasse_status: "concluido",
    billing_type: idx % 2 === 0 ? "PIX" : "CREDIT_CARD",
    asaas_payment_id: `daily_rf_${idx}`,
  }));
  const { error: dailyErr } = await supabase.from("arena_daily_passes").insert(sampleDailyPasses);
  if (dailyErr) throw dailyErr;

  const sampleRentals = resolvedStudents.slice(12, 20).map((st, idx) => ({
    arena_id: DEMO_ARENA_ID,
    plan_id: PLAN_ALUGUEL_ID,
    user_id: st.userId,
    data: addDaysISO(todayISO, -(idx * 10 + 2)),
    hora: idx % 2 === 0 ? "20:00" : "17:00",
    valor: 140.00,
    status_pagamento: "pago",
    repasse_status: "concluido",
    billing_type: "PIX",
    asaas_payment_id: `rental_rf_${idx}`,
  }));
  const { error: rentErr } = await supabase.from("arena_rentals").insert(sampleRentals);
  if (rentErr) throw rentErr;

  // 11. Limpar IDs mortos em arenas_destaques_ids e destacar Rank Football apenas para CEO (filtrado na UI pública)
  await supabase
    .from("platform_config")
    .update({ arenas_destaques_ids: [DEMO_ARENA_ID] })
    .eq("id", 1);

  console.log("==========================================");
  console.log("🏟️  ARENA RANK FOOTBALL (PLANO PRO) ATIVA!");
  console.log(`ID: ${DEMO_ARENA_ID} | Handle: @${DEMO_ARENA_HANDLE}`);
  console.log(`Alunos ativos: ${studentRows.length} (recorrência de 12 meses)`);
  console.log("Radar Anti-Evasão: 5 alunos em risco crítico + 4 em atenção com histórico de faltas.");
  console.log(`Painel Arena: /arena/${DEMO_ARENA_HANDLE}`);
  console.log(`Página Pública (só CEO): /arenas/${DEMO_ARENA_HANDLE}`);
  console.log("==========================================");
}

seed().catch((err) => {
  console.error("Erro no seed da arena Rank Football:", err);
  process.exit(1);
});
