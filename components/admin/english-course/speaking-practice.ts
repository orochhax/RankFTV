import type { PracticeSet } from "./practice";

type SpeakingBlueprint = {
  day: number;
  title: string;
  prompt: string;
  example: string;
};

const SPEAKING_BLUEPRINTS: SpeakingBlueprint[] = [
  { day: 1, title: "Soletração em dupla", prompt: "Carlos soletra o próprio nome e Júlia anota. Depois Júlia soletra o nome e Carlos anota. Repitam com Salvador e cinco palavras da aula. Registre onde houve erro.", example: "Tive dificuldade nas letras E, I e Y. Repetimos cada uma três vezes." },
  { day: 2, title: "Cumprimento completo", prompt: "Façam três rodadas alternando: Hello/Hi → How are you? → resposta → Goodbye/See you. Na última rodada, não leiam. Registre a última conversa.", example: "Carlos: Hi! How are you? Júlia: I'm fine, thanks. And you? Carlos: I'm good. See you!" },
  { day: 3, title: "Frases básicas em voz alta", prompt: "Cada pessoa fala cinco frases começando com I am e My name is. O parceiro repete uma frase e corrige se necessário. Registre duas frases de cada pessoa.", example: "Carlos: I am Brazilian. I am a student. Júlia: My name is Júlia. I am from Salvador." },
  { day: 4, title: "Apresentação de 30 segundos", prompt: "Carlos se apresenta por 30 segundos; Júlia faz o mesmo. Usem nome, cidade, formação e objetivo. Depois repitam sem ler. Registre a versão final.", example: "Hello! My name is Carlos. I am from Salvador. I study Software Engineering. I want to learn English." },
  { day: 5, title: "Entrevista pessoal", prompt: "Façam as perguntas What is your name?, How old are you?, Where are you from? e What do you do?. Troquem os papéis e registrem duas respostas completas.", example: "I am 25 years old. I am from Salvador. I am a student." },
  { day: 6, title: "Revisão oral da semana", prompt: "Sem consultar, cada pessoa se apresenta e faz três perguntas ao parceiro. Marquem mentalmente as pausas e repitam uma segunda vez. Registre o que melhorou.", example: "Na segunda rodada conseguimos falar nome, idade e cidade sem ler." },
  { day: 8, title: "I, she e we", prompt: "Carlos fala uma frase com I am; Júlia transforma para he is. Júlia fala uma frase com I am; Carlos transforma para she is. Finalizem juntos com we are. Registre as frases.", example: "I am Brazilian. He is Brazilian. She is Brazilian. We are Brazilian." },
  { day: 9, title: "Conversa de oito falas", prompt: "Sigam: saudação → nome → origem → ocupação → despedida. Façam uma vez lendo e outra sem ler. Troquem os papéis e registrem a melhor versão.", example: "A: Hi! What's your name? B: My name is Júlia. Where are you from? A: I am from Salvador." },
  { day: 10, title: "Desafio do verbo to be", prompt: "Um escolhe I, you, he, she, we ou they; o outro precisa falar imediatamente uma frase correta com am, is ou are. Façam 12 rodadas e registrem três exemplos.", example: "She is a student. They are friends. I am ready." },
  { day: 11, title: "Afirmar, negar e perguntar", prompt: "Uma pessoa fala uma afirmação com to be; a outra transforma em negativa e pergunta. Façam cinco rodadas e registrem uma sequência completa.", example: "She is ready. She isn't ready. Is she ready?" },
  { day: 12, title: "Apresentando a família", prompt: "Cada pessoa apresenta três familiares usando This is..., He/She is my... e o nome. O parceiro pergunta Who is he/she?. Registre quatro falas.", example: "This is Ana. She is my mother. Who is he? He is my brother." },
  { day: 13, title: "Revisão oral da semana", prompt: "Façam um diálogo incluindo to be, uma pergunta, uma negativa e uma pessoa da família. Repitam trocando os papéis. Registre a versão final.", example: "A: Is she your sister? B: Yes, she is. She isn't a student. She is a lawyer." },
  { day: 15, title: "Um minuto sobre mim", prompt: "Cada pessoa fala por um minuto sobre si sem interromper. O parceiro anota apenas palavras que entendeu. Registre as palavras reconhecidas e uma frase que precisa melhorar.", example: "Palavras reconhecidas: name, Brazil, student, English. Preciso melhorar: I am from Salvador." },
  { day: 16, title: "Adivinhe o objeto", prompt: "Uma pessoa escolhe cinco objetos e pergunta What's this?. A outra responde It's a/an.... Depois troquem. Registre três pares de pergunta e resposta.", example: "What's this? It's a phone. What's this? It's an apple." },
  { day: 17, title: "Quem é essa pessoa?", prompt: "Cada pessoa descreve alguém conhecido sem dizer o nome. O parceiro tenta adivinhar fazendo perguntas com is/are. Registre uma descrição e duas perguntas.", example: "She is friendly and smart. She has brown hair. Is she Júlia?" },
  { day: 18, title: "Perguntas rápidas", prompt: "Façam dez perguntas alternadas com Is...? e Are...?. Respostas devem ser Yes/No completas. Registre quatro perguntas com respostas.", example: "Is she Brazilian? Yes, she is. Are they students? No, they aren't." },
  { day: 19, title: "Calendário falado", prompt: "Cada pessoa fala aniversário, mês favorito e uma data importante. O parceiro pergunta When is...?. Registre três perguntas e respostas.", example: "When is your birthday? My birthday is in May. When is our wedding? It is in March 2027." },
  { day: 20, title: "Revisão oral da semana", prompt: "Escolham uma pessoa, um objeto e uma data. Conversem usando descrição, What's this?, Is/Are...? e When...?. Registre seis falas.", example: "A: What's this? B: It's a phone. A: Is it new? B: Yes, it is." },
  { day: 22, title: "Ditado de números", prompt: "Carlos fala cinco números e Júlia digita; depois troquem. Incluam idades e anos. Registre os números em algarismos e por extenso.", example: "32 — thirty-two; 50 — fifty; 2027 — two thousand and twenty-seven." },
  { day: 23, title: "Corrigindo informações", prompt: "Uma pessoa fala cinco informações falsas sobre vocês. A outra corrige usando am not, isn't ou aren't. Troquem os papéis e registrem três correções.", example: "Carlos is Spanish. No, Carlos isn't Spanish. He is Brazilian." },
  { day: 24, title: "Entrevista com W5", prompt: "Façam perguntas com who, what, where, when e why. O parceiro responde com frase completa. Troquem os papéis e registrem cinco respostas.", example: "Why are you learning English? I am learning English because I want to live in Europe." },
  { day: 25, title: "Caça ao objeto", prompt: "Uma pessoa escolhe um objeto sem mostrar. A outra pergunta Is it in/on/under/next to...?. Depois troquem. Registre as perguntas usadas até encontrar.", example: "Is it under the table? No, it isn't. Is it in the bag? Yes, it is." },
  { day: 26, title: "Batalha de comparações", prompt: "Escolham duas cidades, dois aparelhos e duas pessoas fictícias. Façam seis comparações com -er, more e better. Registre quatro delas.", example: "Salvador is hotter than Porto. My laptop is faster than my phone." },
  { day: 27, title: "Revisão oral da semana", prompt: "Conversem por dois minutos incluindo uma negativa, uma pergunta W5, uma localização e uma comparação. Troquem quem inicia e registrem os pontos difíceis.", example: "Foi difícil lembrar a ordem de Where is...? e usar than nas comparações." },
  { day: 29, title: "Perguntas com do e does", prompt: "Carlos faz cinco perguntas com Do you...?. Júlia faz cinco com Does Carlos...?. Respondam com do/don't/does/doesn't e registrem quatro pares.", example: "Do you study every day? Yes, I do. Does Carlos work remotely? No, he doesn't." },
  { day: 30, title: "Apresentando um aparelho", prompt: "Cada pessoa escolhe um aparelho e fala modelo, características e finalidade. O parceiro pergunta What do you use it for?. Registre as duas apresentações.", example: "This is my laptop. It is fast and light. I use it to study and work." },
  { day: 31, title: "A, an ou the em voz alta", prompt: "Um fala dez substantivos; o outro coloca a, an ou the e forma uma frase. Troquem após cinco palavras. Registre quatro frases.", example: "I have a phone. This is an app. The phone is new." },
  { day: 32, title: "Tutorial falado", prompt: "Explique ao parceiro como enviar um e-mail em quatro passos usando first, then e finally. O parceiro repete as instruções. Registre o tutorial.", example: "First, open your email. Then write a message. Attach the file. Finally, click send." },
  { day: 33, title: "Review de tecnologia", prompt: "Cada pessoa apresenta um aparelho por 60 segundos e o compara com outro. O parceiro faz duas perguntas. Registre o resumo e as perguntas.", example: "My laptop is faster than my phone. I use it to work. Is it light? Do you use it every day?" },
  { day: 34, title: "Revisão oral da semana", prompt: "Façam uma conversa de três minutos sobre tecnologia usando do/does, artigos e comparações. Depois repitam tentando reduzir as pausas. Registre a principal evolução.", example: "Na segunda tentativa usamos Do you...? e Does she...? sem consultar." },
];

export const SPEAKING_PRACTICE_SETS: PracticeSet[] = SPEAKING_BLUEPRINTS.map((item) => ({
  activityId: `day-${item.day}-speaking`,
  title: item.title,
  instructions: "Leia o roteiro, pratique em dupla e registre o resultado. A atividade é individual no progresso, mesmo quando feita em conjunto.",
  questions: [],
  production: {
    prompt: item.prompt,
    placeholder: "Registre aqui a conversa, as respostas ou a dificuldade encontrada.",
    example: item.example,
  },
}));

const IMMERSION_MISSIONS = [
  { day: 7, prompt: "Mude um aplicativo simples do celular para inglês por pelo menos 24 horas. Navegue nele e registre cinco palavras que encontrou.", example: "Home, search, settings, save, share." },
  { day: 14, prompt: "Escolha cinco objetos da casa, coloque etiquetas temporárias com os nomes em inglês e use cada palavra em uma frase. Registre as frases.", example: "door — The door is open. table — The phone is on the table." },
  { day: 21, prompt: "Assista a cinco minutos de uma série ou desenho com áudio e legenda em inglês. Não pause na primeira vez; na segunda, registre três frases reconhecidas.", example: "How are you? / What is this? / See you tomorrow." },
  { day: 28, prompt: "Façam uma refeição ou lanche com dez minutos de 'English only'. Usem apontar, gestos e frases simples em vez de português. Registre o vocabulário que faltou.", example: "Precisamos aprender plate, fork, hungry, delicious e more, please." },
  { day: 35, prompt: "Façam vinte minutos de 'English only' usando celular, objetos, rotina e perguntas aprendidas. Registre o tempo sem português e três pontos para o próximo ciclo.", example: "Conseguimos 12 minutos. Precisamos revisar perguntas, números e palavras de rotina." },
] as const;

export const IMMERSION_MISSION_SETS: PracticeSet[] = IMMERSION_MISSIONS.map((item) => ({
  activityId: `day-${item.day}-mission`,
  title: "Missão de inglês na vida real",
  instructions: "Faça a missão fora da tela e registre o resultado aqui para manter o acompanhamento individual.",
  questions: [],
  production: {
    prompt: item.prompt,
    placeholder: "Registre as palavras, frases e como foi a experiência.",
    example: item.example,
  },
}));
