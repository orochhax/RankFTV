/* eslint-disable quality/max-lines -- Banco curado de exercícios: manter os enunciados juntos facilita revisão pedagógica. */

import { IMMERSION_MISSION_SETS, SPEAKING_PRACTICE_SETS } from "./speaking-practice";

export type PracticeChoice = {
  id: "A" | "B" | "C" | "D";
  label: string;
};

export type PracticeQuestion = {
  id: string;
  prompt: string;
  choices: PracticeChoice[];
  correct: PracticeChoice["id"];
  explanation: string;
};

export type PracticeSet = {
  activityId: string;
  title: string;
  instructions: string;
  questions: PracticeQuestion[];
  production: {
    prompt: string;
    placeholder: string;
    example: string;
  };
};

type RawQuestion = [prompt: string, choices: [string, string, string, string], correct: number, explanation: string];

const CHOICE_IDS: PracticeChoice["id"][] = ["A", "B", "C", "D"];

function question(day: number, index: number, raw: RawQuestion): PracticeQuestion {
  return {
    id: `d${day}-q${index + 1}`,
    prompt: raw[0],
    choices: raw[1].map((label, choiceIndex) => ({ id: CHOICE_IDS[choiceIndex], label })),
    correct: CHOICE_IDS[raw[2]],
    explanation: raw[3],
  };
}

function daily(
  day: number,
  title: string,
  questions: RawQuestion[],
  production: PracticeSet["production"],
): PracticeSet {
  return {
    activityId: `day-${day}-practice`,
    title,
    instructions: "Responda sem consultar a aula. Depois, confira a correção e faça a produção final.",
    questions: questions.map((item, index) => question(day, index, item)),
    production,
  };
}

function weekend(
  day: number,
  suffix: "quiz" | "pair",
  ...[title, questions, production]: [string, RawQuestion[], PracticeSet["production"]]
): PracticeSet {
  const set = daily(day, title, questions, production);
  return { ...set, activityId: `day-${day}-${suffix}` };
}

const DAILY_SETS: PracticeSet[] = [
  daily(1, "Alfabeto e soletração", [
    ["Qual letra é pronunciada como “ei”?", ["A", "E", "I", "R"], 0, "A letra A tem o som /eɪ/."],
    ["Qual sequência soletra o nome CARLOS?", ["C-A-R-L-O-S", "S-A-R-L-O-Z", "C-E-R-L-U-S", "K-A-H-L-O-S"], 0, "A soletração usa os nomes ingleses das letras C, A, R, L, O e S."],
    ["Qual letra tem o som parecido com “uai”?", ["W", "Y", "J", "Q"], 1, "Y é pronunciado /waɪ/."],
  ], {
    prompt: "Digite como você soletraria seu nome e sua cidade, separando as letras com hífen.",
    placeholder: "Ex.: C-A-R-L-O-S / S-A-L-V-A-D-O-R",
    example: "Carlos: C-A-R-L-O-S. Salvador: S-A-L-V-A-D-O-R.",
  }),
  daily(2, "Cumprimentos essenciais", [
    ["Qual expressão significa “Como você está?”", ["What is this?", "How are you?", "Where are you?", "Who are you?"], 1, "How are you? é a forma básica de perguntar como alguém está."],
    ["Qual é uma resposta natural para “How are you?”", ["I'm fine, thanks.", "Goodbye yesterday.", "My name fine.", "See you name."], 0, "I'm fine, thanks significa “Estou bem, obrigado(a)”."],
    ["Qual despedida significa “Até mais”?", ["Hello", "Please", "See you", "Thank you"], 2, "See you é uma despedida informal equivalente a “Até mais”."],
  ], {
    prompt: "Complete o diálogo: A: Hello! How are you? B: _____. A: Goodbye! B: _____.",
    placeholder: "Escreva as duas respostas em inglês.",
    example: "I'm fine, thanks. / See you!",
  }),
  daily(3, "Primeiras estruturas", [
    ["Complete: I ___ Carlos.", ["am", "is", "are", "be"], 0, "Com I usamos am."],
    ["Qual frase significa “Eu sou brasileiro”?", ["I are Brazilian.", "I is Brazilian.", "I am Brazilian.", "Am I Brazilian."], 2, "I am Brazilian é a forma afirmativa correta."],
    ["Escolha a ordem correta.", ["Carlos my name is.", "My name is Carlos.", "Name Carlos is my.", "Is my Carlos name."], 1, "Em inglês, usamos My name is + nome."],
  ], {
    prompt: "Escreva três frases: seu nome, sua cidade e sua nacionalidade.",
    placeholder: "My name is... / I am from... / I am...",
    example: "My name is Carlos. I am from Salvador. I am Brazilian.",
  }),
  daily(4, "Apresentação pessoal", [
    ["Como dizer “Meu nome é Júlia”?", ["I name Júlia.", "My name is Júlia.", "Me is Júlia.", "Name my Júlia."], 1, "My name is... apresenta o nome."],
    ["Complete: I am ___ Salvador.", ["at", "on", "from", "of"], 2, "From indica origem."],
    ["Qual pergunta pede o nome?", ["How old are you?", "Where are you from?", "What is your name?", "What do you do?"], 2, "What is your name? significa “Qual é o seu nome?”."],
  ], {
    prompt: "Escreva uma apresentação de quatro linhas com nome, cidade, profissão/curso e objetivo.",
    placeholder: "Hello! My name is...",
    example: "Hello! My name is Carlos. I am from Salvador. I study Software Engineering. I want to learn English.",
  }),
  daily(5, "Informações pessoais", [
    ["Qual pergunta significa “Quantos anos você tem?”", ["How are you?", "How old are you?", "Where are you?", "What old you?"], 1, "How old are you? pergunta a idade."],
    ["Complete: I ___ 25 years old.", ["have", "am", "is", "do"], 1, "Em inglês, idade usa o verbo to be: I am 25 years old."],
    ["Qual pergunta pede a profissão?", ["What do you do?", "What is your age?", "Where do you live?", "How is your name?"], 0, "What do you do? é usada para perguntar ocupação."],
  ], {
    prompt: "Responda em inglês: What is your full name? How old are you? What do you do?",
    placeholder: "My full name is... I am... I am a/an...",
    example: "My full name is Carlos Rocha. I am 25 years old. I am a student.",
  }),
  daily(8, "Reforço do nível zero", [
    ["Complete: She ___ Júlia.", ["am", "is", "are", "do"], 1, "Com she usamos is."],
    ["Complete: We ___ students.", ["am", "is", "are", "does"], 2, "Com we usamos are."],
    ["Qual frase está correta?", ["They is friends.", "They are friends.", "They am friends.", "They be friends."], 1, "They combina com are."],
  ], {
    prompt: "Escreva uma frase com I am, uma com she is e uma com we are.",
    placeholder: "I am... / She is... / We are...",
    example: "I am Brazilian. She is Júlia. We are students.",
  }),
  daily(9, "Conversa guiada", [
    ["Depois de “Hello”, qual pergunta mantém a conversa?", ["How are you?", "Goodbye.", "No name.", "Yesterday."], 0, "How are you? dá continuidade ao cumprimento."],
    ["Qual resposta informa origem?", ["I am fine.", "I am from Brazil.", "I am 25 years old.", "My name is Carlos."], 1, "I am from Brazil informa de onde a pessoa é."],
    ["Qual frase encerra uma conversa educadamente?", ["Nice to meet you. See you!", "What name goodbye?", "I from see.", "Are goodbye you?"], 0, "Nice to meet you. See you! é uma despedida natural."],
  ], {
    prompt: "Preencha sua parte: A: Hi! What's your name? B: ___. A: Where are you from? B: ___. A: Nice to meet you! B: ___.",
    placeholder: "Escreva as três falas de B.",
    example: "My name is Carlos. / I am from Brazil. / Nice to meet you too!",
  }),
  daily(10, "Verbo to be", [
    ["Complete: He ___ my friend.", ["am", "is", "are", "do"], 1, "He usa is."],
    ["Complete: You ___ welcome.", ["am", "is", "are", "does"], 2, "You usa are."],
    ["Qual combinação está errada?", ["I am", "She is", "They are", "We is"], 3, "We deve ser usado com are."],
  ], {
    prompt: "Complete com informações reais: I am ___. Júlia is ___. Carlos and Júlia are ___.",
    placeholder: "Escreva as três frases completas.",
    example: "I am a student. Júlia is Brazilian. Carlos and Júlia are a couple.",
  }),
  daily(11, "Exercícios com to be", [
    ["Transforme em pergunta: She is Brazilian.", ["Is she Brazilian?", "She is Brazilian?", "Does she Brazilian?", "Are she Brazilian?"], 0, "Na pergunta, is vem antes de she."],
    ["Transforme em negativa: They are tired.", ["They don't tired.", "They aren't tired.", "They isn't tired.", "They no are tired."], 1, "A negativa de are pode ser aren't."],
    ["Resposta curta para “Are you ready?”", ["Yes, I am.", "Yes, I is.", "Yes, you am.", "Yes, I do ready."], 0, "A resposta curta correta é Yes, I am."],
  ], {
    prompt: "Escreva: uma frase afirmativa, a mesma frase negativa e depois em forma de pergunta.",
    placeholder: "She is... / She isn't... / Is she...?",
    example: "She is ready. She isn't ready. Is she ready?",
  }),
  daily(12, "Família", [
    ["Mother significa:", ["irmã", "mãe", "avó", "tia"], 1, "Mother significa mãe."],
    ["Brother significa:", ["irmão", "pai", "primo", "marido"], 0, "Brother significa irmão."],
    ["Complete: Júlia is Carlos's ___.", ["wife", "brother", "father", "son"], 0, "Wife significa esposa."],
  ], {
    prompt: "Apresente três pessoas da sua família usando nome e relação familiar.",
    placeholder: "This is... He/She is my...",
    example: "This is Ana. She is my mother. This is João. He is my brother.",
  }),
  daily(15, "Consolidação A0", [
    ["Qual frase está correta?", ["My name are Carlos.", "My name is Carlos.", "My is name Carlos.", "I name is Carlos."], 1, "My name is Carlos é a estrutura correta."],
    ["Complete: They ___ from Brazil.", ["am", "is", "are", "be"], 2, "They usa are."],
    ["Qual pergunta pede a cidade de origem?", ["Where are you from?", "How old are you?", "What do you do?", "Who is she?"], 0, "Where are you from? pergunta a origem."],
  ], {
    prompt: "Sem olhar as aulas, escreva tudo que já consegue dizer sobre você em cinco frases.",
    placeholder: "My name is...",
    example: "My name is Carlos. I am Brazilian. I am from Salvador. I am a student. I am learning English.",
  }),
  daily(16, "What's e it's", [
    ["Complete: ___ this?", ["What's", "It's", "Who's are", "How's name"], 0, "What's this? significa “O que é isto?”."],
    ["Resposta correta para “What's this?”", ["This what.", "It's a phone.", "Is phone what.", "A phone are."], 1, "It's a phone identifica o objeto."],
    ["It's é a contração de:", ["it are", "it is", "is it", "its is"], 1, "It's = it is."],
  ], {
    prompt: "Escolha três objetos perto de você e escreva uma pergunta e uma resposta para cada um.",
    placeholder: "What's this? It's a...",
    example: "What's this? It's a phone. What's this? It's a book.",
  }),
  daily(17, "Descrição de pessoas", [
    ["Tall significa:", ["baixo", "alto", "jovem", "feliz"], 1, "Tall significa alto(a)."],
    ["Qual frase descreve cabelo?", ["She has brown hair.", "She is hair brown.", "Her has brown.", "Hair she are."], 0, "She has brown hair descreve corretamente o cabelo."],
    ["Qual adjetivo significa “simpático/amigável”?", ["friendly", "expensive", "empty", "late"], 0, "Friendly significa amigável."],
  ], {
    prompt: "Descreva você e outra pessoa em pelo menos três características cada.",
    placeholder: "I am... I have... / He or she is...",
    example: "I am short and friendly. I have brown hair. Júlia is smart and friendly.",
  }),
  daily(18, "Perguntas com is e are", [
    ["Complete: ___ he your brother?", ["Am", "Is", "Are", "Do"], 1, "He usa is."],
    ["Complete: ___ they at home?", ["Am", "Is", "Are", "Does"], 2, "They usa are."],
    ["Resposta curta para “Is she a student?”", ["Yes, she is.", "Yes, she are.", "Yes, is she.", "Yes, she does student."], 0, "Yes, she is é a resposta curta correta."],
  ], {
    prompt: "Responda em inglês: Is Júlia Brazilian? Are Carlos and Júlia students? Is Carlos in Portugal now?",
    placeholder: "Yes, she is... / No, he isn't...",
    example: "Yes, she is. Yes, they are. No, he isn't.",
  }),
  daily(19, "Datas e aniversários", [
    ["Como perguntar “Quando é seu aniversário?”", ["What is your age?", "When is your birthday?", "Where birthday you?", "How is birthday?"], 1, "When is your birthday? pergunta a data do aniversário."],
    ["January é:", ["janeiro", "junho", "julho", "dezembro"], 0, "January significa janeiro."],
    ["Complete: My birthday is ___ March.", ["at", "in", "on the", "from"], 1, "Usamos in antes de meses."],
  ], {
    prompt: "Escreva seu aniversário, o de Júlia e a data planejada do casamento em inglês.",
    placeholder: "My birthday is in...",
    example: "My birthday is in May. Our wedding is in March 2027.",
  }),
  daily(22, "Idades e números", [
    ["Como escrever 32?", ["thirty-two", "three-two", "thirteen-two", "twenty-three"], 0, "32 é thirty-two."],
    ["Como dizer “Ela tem 24 anos”?", ["She has 24 years.", "She is 24 years old.", "She are 24 old.", "Her age have 24."], 1, "Idade usa o verbo to be."],
    ["Qual número é “fifty”?", ["15", "40", "50", "55"], 2, "Fifty significa cinquenta."],
  ], {
    prompt: "Escreva por extenso em inglês: sua idade, a idade de Júlia e o ano 2027.",
    placeholder: "I am ... years old. Júlia is... / 2027: ...",
    example: "I am twenty-five years old. Júlia is twenty-four. 2027: two thousand and twenty-seven.",
  }),
  daily(23, "To be na negativa", [
    ["Negativa de “I am tired”:", ["I amn't tired.", "I am not tired.", "I don't tired.", "I not am tired."], 1, "Com I am, usamos am not."],
    ["Negativa de “He is here”:", ["He isn't here.", "He aren't here.", "He doesn't here.", "He not here."], 0, "Is not pode ser contraído como isn't."],
    ["Negativa de “We are late”:", ["We isn't late.", "We don't late.", "We aren't late.", "We not are late."], 2, "Are not pode ser contraído como aren't."],
  ], {
    prompt: "Corrija estas informações com frases negativas: Carlos is Spanish. Júlia is in Spain. They are fluent in English.",
    placeholder: "Carlos isn't...",
    example: "Carlos isn't Spanish. Júlia isn't in Spain. They aren't fluent in English yet.",
  }),
  daily(24, "Formação de perguntas", [
    ["Qual palavra pergunta “onde”?", ["When", "Who", "Where", "Why"], 2, "Where significa onde."],
    ["Qual palavra pergunta “quem”?", ["Who", "What", "How", "Which"], 0, "Who significa quem."],
    ["Escolha a pergunta correta.", ["Where you are from?", "Where are you from?", "Are where you from?", "Where from are?"], 1, "Com to be, o verbo vem antes do sujeito."],
  ], {
    prompt: "Responda: Where are you from? Who is Júlia? Why are you learning English?",
    placeholder: "I am from... Júlia is... I am learning English because...",
    example: "I am from Salvador. Júlia is my fiancée. I am learning English because I want to live in Europe.",
  }),
  daily(25, "Preposições de lugar", [
    ["The phone is ___ the table (sobre a mesa).", ["under", "on", "between", "behind"], 1, "On significa sobre uma superfície."],
    ["The shoes are ___ the bed (debaixo da cama).", ["under", "in", "next to", "on"], 0, "Under significa debaixo."],
    ["The bank is ___ the market and the pharmacy.", ["on", "under", "between", "in"], 2, "Between significa entre duas referências."],
  ], {
    prompt: "Olhe ao redor e descreva a posição de cinco objetos usando in, on, under, next to ou between.",
    placeholder: "The phone is on...",
    example: "The phone is on the table. The chair is next to the desk.",
  }),
  daily(26, "Comparações", [
    ["Complete: Carlos is ___ than João. (alto)", ["tall", "taller", "more tall", "tallest"], 1, "Adjetivos curtos recebem -er: taller."],
    ["Complete: This course is ___ than that one. (caro)", ["expensiver", "more expensive", "most expensive", "expensive more"], 1, "Adjetivos longos usam more."],
    ["Good no comparativo vira:", ["gooder", "more good", "better", "best than"], 2, "Good tem a forma irregular better."],
  ], {
    prompt: "Compare Salvador e outra cidade em três frases: tamanho, temperatura e custo.",
    placeholder: "Salvador is hotter than...",
    example: "Salvador is hotter than Porto. Porto is smaller than Salvador. Porto is more expensive than Salvador.",
  }),
  daily(29, "Do e does", [
    ["Complete: ___ you speak English?", ["Do", "Does", "Is", "Are"], 0, "Com you, usamos do."],
    ["Complete: ___ she work here?", ["Do", "Does", "Is", "Are"], 1, "Com she, usamos does."],
    ["Negativa correta de “He likes coffee”:", ["He don't like coffee.", "He doesn't like coffee.", "He isn't like coffee.", "He not likes coffee."], 1, "Com he, usamos doesn't e o verbo volta à forma base."],
  ], {
    prompt: "Responda: Do you study every day? Does Júlia study English? Do you live in Portugal?",
    placeholder: "Yes, I do... / No, I don't...",
    example: "Yes, I do. Yes, she does. No, I don't.",
  }),
  daily(30, "Dispositivos", [
    ["Smartphone significa:", ["televisão", "celular inteligente", "teclado", "carregador"], 1, "Smartphone é celular inteligente."],
    ["Charger significa:", ["carregador", "fone de ouvido", "tela", "senha"], 0, "Charger significa carregador."],
    ["Qual frase está correta?", ["I use my laptop to study.", "I use study laptop my.", "My laptop use I study.", "I am laptop study."], 0, "Use something to + verbo explica a finalidade."],
  ], {
    prompt: "Descreva seu celular ou computador: modelo, uso principal e uma característica.",
    placeholder: "I have a... I use it to... It is...",
    example: "I have a smartphone. I use it to study and work. It is fast.",
  }),
  daily(31, "Artigos", [
    ["Complete: ___ apple", ["a", "an", "the an", "sem artigo"], 1, "Usamos an antes de som de vogal."],
    ["Complete: ___ computer", ["a", "an", "the an", "sem artigo"], 0, "Computer começa com som de consoante, então usamos a."],
    ["Complete: I saw a dog. ___ dog was friendly.", ["A", "An", "The", "Sem artigo"], 2, "The retoma um substantivo já mencionado."],
  ], {
    prompt: "Escreva seis combinações: duas com a, duas com an e duas com the.",
    placeholder: "a book, an apple, the book...",
    example: "a phone, a course, an app, an engineer, the phone, the course.",
  }),
  daily(32, "Tecnologia no cotidiano", [
    ["Upload significa:", ["baixar arquivo", "enviar arquivo", "apagar arquivo", "imprimir arquivo"], 1, "Upload é enviar um arquivo para um serviço."],
    ["Password significa:", ["tela", "pasta", "senha", "conta bancária"], 2, "Password significa senha."],
    ["Complete: I ___ my email every morning.", ["check", "checks", "checking is", "am check"], 0, "Com I no presente simples, usamos check."],
  ], {
    prompt: "Explique em quatro passos como você abre e envia um e-mail.",
    placeholder: "First, I open... Then...",
    example: "First, I open my email. Then I write a message. I attach the file. Finally, I click send.",
  }),
  daily(33, "Descrição de tecnologia", [
    ["Qual adjetivo significa “leve”?", ["heavy", "light", "slow", "old"], 1, "Light pode significar leve."],
    ["Qual frase compara dois aparelhos?", ["This phone is faster than mine.", "This phone fast mine.", "Phone is fast that.", "Mine than phone."], 0, "Faster than forma uma comparação."],
    ["Useful significa:", ["caro", "quebrado", "útil", "pequeno"], 2, "Useful significa útil."],
  ], {
    prompt: "Faça uma avaliação curta de um aparelho: o que é, três características e para que serve.",
    placeholder: "This is my... It is... I use it to...",
    example: "This is my laptop. It is light, fast and useful. I use it to study and work.",
  }),
];

const WEEKEND_SETS: PracticeSet[] = [
  weekend(6, "quiz", "Revisão pronta — semana 1", [
    ["Complete: My name ___ Carlos.", ["am", "is", "are", "do"], 1, "My name usa is."],
    ["Como perguntar a idade?", ["How old are you?", "How are old?", "What old you?", "Where age?"], 0, "How old are you? pergunta a idade."],
    ["Qual despedida é correta?", ["See you!", "How old!", "My name!", "From Brazil!"], 0, "See you! é uma despedida."],
  ], {
    prompt: "Faça um resumo da semana em cinco frases sobre você, sem consultar as respostas anteriores.",
    placeholder: "Hello! My name is...",
    example: "Hello! My name is Carlos. I am Brazilian. I am from Salvador. I am a student. See you!",
  }),
  weekend(7, "pair", "Roteiro em dupla — semana 1", [
    ["Quem inicia o diálogo deste treino?", ["Carlos", "Júlia", "Os dois ao mesmo tempo", "Ninguém"], 0, "O roteiro começa com Carlos e depois vocês trocam os papéis."],
    ["Depois da apresentação, o que Júlia pergunta?", ["How old are you?", "What color is it?", "Where is the phone?", "Do you drive?"], 0, "A pergunta preparada treina a idade."],
  ], {
    prompt: "Façam o roteiro e depois troquem os papéis: Carlos: Hello! My name is Carlos. What's your name? Júlia: My name is Júlia. How old are you? Carlos: I am ___. Where are you from? Júlia: I am from ___. Nice to meet you! Escreva abaixo o que foi mais difícil.",
    placeholder: "A parte mais difícil foi...",
    example: "A parte mais difícil foi pronunciar 'Where are you from?'.",
  }),
  weekend(13, "quiz", "Revisão pronta — semana 2", [
    ["Complete: She ___ my wife.", ["am", "is", "are", "do"], 1, "She usa is."],
    ["Pergunta correta:", ["Is he your brother?", "He is your brother?", "Do he brother?", "Are he brother?"], 0, "Em perguntas com to be, is vem antes do sujeito."],
    ["Sister significa:", ["mãe", "irmã", "esposa", "filha"], 1, "Sister significa irmã."],
  ], {
    prompt: "Escreva um diálogo de seis falas usando apresentação, verbo to be e uma pessoa da família.",
    placeholder: "A: Hello... B: Hi...",
    example: "A: Hello! Who is she? B: She is my sister. A: Is she a student? B: Yes, she is.",
  }),
  weekend(14, "pair", "Roteiro em dupla — semana 2", [
    ["Qual resposta combina com “Is Júlia Brazilian?”", ["Yes, she is.", "Yes, she are.", "Yes, Júlia do.", "Brazilian yes."], 0, "A resposta curta usa she is."],
    ["Qual pergunta pede informação sobre família?", ["Who is he?", "Where is the phone?", "When is May?", "How expensive?"], 0, "Who is he? pergunta quem é a pessoa."],
  ], {
    prompt: "Um mostra uma foto de família e o outro pergunta: Who is he/she? Is he/she...? What is his/her name? Troquem os papéis e registrem duas respostas completas.",
    placeholder: "He is... / She is...",
    example: "She is my mother. Her name is Ana. He is my brother. His name is João.",
  }),
  weekend(20, "quiz", "Revisão pronta — semana 3", [
    ["Resposta para “What's this?”", ["It's a book.", "This book what.", "Book are it.", "A book is what."], 0, "It's a book é a resposta correta."],
    ["Complete: ___ they at home?", ["Is", "Are", "Am", "Does"], 1, "They usa are."],
    ["Como perguntar o aniversário?", ["When is your birthday?", "What old birthday?", "Where birthday is?", "Who is month?"], 0, "When is your birthday? pergunta a data."],
  ], {
    prompt: "Descreva uma pessoa e um objeto; depois escreva uma pergunta sobre cada um.",
    placeholder: "She is... / Is she...? / It's a... / What's this?",
    example: "She is friendly. Is she a student? It's a phone. What's this?",
  }),
  weekend(21, "pair", "Roteiro em dupla — semana 3", [
    ["Qual pergunta serve para adivinhar um objeto?", ["What's this?", "How old are you?", "When is May?", "Who are they?"], 0, "What's this? pergunta qual é o objeto."],
    ["Qual pergunta confirma uma descrição?", ["Is she tall?", "Does tall she?", "Tall is what?", "Are she tall?"], 0, "Is she tall? confirma uma característica."],
  ], {
    prompt: "Rodada 1: Júlia aponta três objetos e Carlos responde “It's a/an...”. Rodada 2: Carlos descreve uma pessoa e Júlia faz duas perguntas com is/are. Registre uma pergunta e uma resposta de cada rodada.",
    placeholder: "What's this? It's... / Is she...? Yes...",
    example: "What's this? It's a laptop. Is she friendly? Yes, she is.",
  }),
  weekend(27, "quiz", "Revisão pronta — semana 4", [
    ["Negativa de “They are ready”:", ["They aren't ready.", "They doesn't ready.", "They isn't ready.", "They no ready."], 0, "They usa aren't."],
    ["The keys are ___ the box (dentro).", ["in", "on", "under", "between"], 0, "In significa dentro."],
    ["Comparativo de small:", ["more small", "smaller", "smallest than", "smaller more"], 1, "Small recebe -er: smaller."],
  ], {
    prompt: "Escreva uma frase negativa, uma pergunta com where, uma localização e uma comparação.",
    placeholder: "I am not... / Where...? / The... / ...than...",
    example: "I am not tired. Where is the phone? It is on the table. My phone is smaller than yours.",
  }),
  weekend(28, "pair", "Roteiro em dupla — semana 4", [
    ["Qual pergunta localiza um objeto?", ["Where is the charger?", "Who charger?", "How old charger?", "Does charger?"], 0, "Where is...? pergunta onde algo está."],
    ["Qual frase faz uma comparação?", ["This room is bigger than that room.", "This room is on the table.", "This room isn't Júlia.", "Where room?"], 0, "Bigger than é uma comparação."],
  ], {
    prompt: "Jogo pronto: esconda um objeto. A pessoa pergunta “Is it on/under/in/next to...?” até encontrar. Depois compare dois objetos com bigger, smaller, newer ou older. Registre três perguntas e uma comparação.",
    placeholder: "Is it under...? / Is it in...? / X is smaller than Y.",
    example: "Is it under the table? No, it isn't. Is it in the bag? Yes, it is. My phone is newer than yours.",
  }),
  weekend(34, "quiz", "Revisão pronta — semana 5", [
    ["Complete: ___ he use a laptop?", ["Do", "Does", "Is", "Are"], 1, "He usa does."],
    ["Complete: ___ email", ["a", "an", "the an", "sem artigo"], 1, "Email começa com som de vogal."],
    ["Qual frase explica finalidade?", ["I use my laptop to work.", "My laptop work I.", "Laptop is to my.", "I does laptop."], 0, "Use + objeto + to + verbo explica para que ele serve."],
  ], {
    prompt: "Escreva cinco frases sobre sua rotina digital usando do/does, um artigo e vocabulário de tecnologia.",
    placeholder: "I use a... / Do you...?",
    example: "I use a laptop to work. I check my email. Júlia uses an app to study. Does she study every day? Yes, she does.",
  }),
  weekend(35, "pair", "Apresentação em dupla — semana 5", [
    ["Qual abertura é adequada?", ["Today I want to talk about my phone.", "Phone today talk mine is.", "Do phone presentation?", "My phone are."], 0, "A primeira opção abre a apresentação de forma natural."],
    ["Qual pergunta pode ser feita no final?", ["What do you use it for?", "What use for it do?", "Does for what?", "Are use it?"], 0, "What do you use it for? pergunta a finalidade."],
  ], {
    prompt: "Cada pessoa apresenta um aparelho por 60 segundos usando o roteiro: nome do aparelho, três características, uso principal e comparação com outro. O parceiro faz “What do you use it for?”. Registre o resumo das duas apresentações.",
    placeholder: "Carlos: ... / Júlia: ...",
    example: "Carlos: My laptop is light, fast and useful. I use it to work. Júlia: My phone is smaller than my laptop. I use it to study.",
  }),
];

export const PRACTICE_SETS: Record<string, PracticeSet> = Object.fromEntries(
  [...DAILY_SETS, ...WEEKEND_SETS, ...SPEAKING_PRACTICE_SETS, ...IMMERSION_MISSION_SETS].map((set) => [set.activityId, set]),
);

export function practiceResponseKey(activityId: string, itemId: string) {
  return `${activityId}:${itemId}`;
}

export function practiceIsReady(set: PracticeSet, responses: Record<string, string>) {
  const questionsAnswered = set.questions.every((item) => Boolean(responses[practiceResponseKey(set.activityId, item.id)]));
  const productionAnswered = Boolean(responses[practiceResponseKey(set.activityId, "production")]?.trim());
  return questionsAnswered && productionAnswered;
}

export function practiceScore(set: PracticeSet, responses: Record<string, string>) {
  let correct = 0;
  for (const item of set.questions) {
    if (responses[practiceResponseKey(set.activityId, item.id)] === item.correct) correct += 1;
  }
  return { correct, total: set.questions.length };
}
