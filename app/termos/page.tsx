import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

export const metadata: Metadata = {
  title: "Termos de uso — RankFTV",
};

const ULTIMA_ATUALIZACAO = "9 de novembro de 2026";

type Bloco =
  | { p: string }
  | { ul: string[] }
  | { defs: { termo: string; desc: string }[] };

type Secao = { titulo: string; blocos: Bloco[] };

// Termos de uso da RankFTV. Adaptado para a realidade da plataforma (campeonatos
// de futevôlei, inscrição de duplas, ingresso de plateia, credencial/QR e repasse
// via processador de pagamentos). Os trechos entre [colchetes] são dados da
// empresa que precisam ser preenchidos antes de publicar.
const SECOES: Secao[] = [
  {
    titulo: "Glossário",
    blocos: [
      {
        defs: [
          { termo: "Plataforma RankFTV (ou “Plataforma”)", desc: "Solução tecnológica disponível em www.rankftv.com para criação e gestão de campeonatos de futevôlei, inscrição de atletas, venda de ingressos de plateia, credenciamento e processamento de pagamentos." },
          { termo: "Atleta / Participante", desc: "Pessoa física que cria conta na Plataforma para se inscrever e disputar campeonatos, individualmente ou em dupla." },
          { termo: "Espectador", desc: "Pessoa que adquire ingresso de plateia para assistir a um evento." },
          { termo: "Organizador", desc: "Pessoa física ou jurídica que cria, publica e gerencia campeonatos na Plataforma. Para publicar eventos pagos, deve completar o cadastro com CPF/CNPJ e dados de recebimento." },
          { termo: "Usuário", desc: "Designa, em conjunto, Atletas, Espectadores, Organizadores e visitantes que navegam na Plataforma." },
          { termo: "Campeonato / Evento", desc: "Competição de futevôlei criada por um Organizador na Plataforma." },
          { termo: "Categoria", desc: "Divisão de um campeonato por nível e gênero, com valor de inscrição próprio." },
          { termo: "Dupla", desc: "Par de atletas inscritos juntos em uma categoria." },
          { termo: "Inscrição", desc: "Registro de uma dupla em uma categoria, mediante pagamento quando aplicável. Dá direito à participação e à credencial digital." },
          { termo: "Ingresso de plateia", desc: "Entrada adquirida por um Espectador para assistir ao evento." },
          { termo: "Credencial", desc: "Comprovante digital com QR Code que dá acesso ao evento e é validado na portaria (check-in)." },
          { termo: "Arena", desc: "Espaço físico de futevôlei ou beach sports cadastrado na Plataforma pelo Dono de arena para gestão de alunos, mensalidades, aluguéis de quadra e controle de frequência." },
          { termo: "Dono de arena", desc: "Pessoa física ou jurídica responsável pela Arena que cadastra o espaço na Plataforma e recebe os pagamentos gerados pelos alunos e reservas." },
          { termo: "Mensalidade", desc: "Valor cobrado periodicamente de alunos cadastrados na Arena, processado pela Plataforma." },
          { termo: "Aluguel de quadra", desc: "Valor cobrado pela reserva de um horário específico na quadra da Arena, processado pela Plataforma." },
          { termo: "Diária", desc: "Acesso avulso à Arena adquirido por dia, sem vínculo de mensalidade." },
          { termo: "Taxa de serviço", desc: "Valor cobrado do comprador, somado ao valor da inscrição ou ingresso, pela utilização da Plataforma." },
          { termo: "Plano Padrão / Plano Elite", desc: "Planos do Organizador para cada evento, com diferentes taxas e benefícios (ver Seção 13)." },
          { termo: "Split de pagamento / Repasse", desc: "Divisão e transferência dos valores: a Plataforma intermedia o pagamento e repassa ao Organizador o valor que lhe cabe." },
          { termo: "Processador de pagamentos", desc: "Instituição de pagamento parceira contratada pela RankFTV para processar transações, liquidar e registrar recebíveis." },
          { termo: "Chargeback", desc: "Cancelamento de uma compra com cartão, geralmente por não reconhecimento da compra pelo titular ou descumprimento das regras das administradoras de cartão." },
          { termo: "Contestação", desc: "Reclamação de cobrança indevida feita pelo titular do cartão junto à operadora." },
          { termo: "Estorno", desc: "Devolução do valor cobrado, integral, ao comprador." },
          { termo: "Anti-spam", desc: "Sistema que bloqueia ou filtra mensagens não desejadas." },
          { termo: "Crawler / Spider", desc: "Programas que coletam dados de sites de forma automatizada." },
        ],
      },
    ],
  },
  {
    titulo: "Informações gerais",
    blocos: [
      { p: "Estes Termos de Uso (“Termos”) regulam o acesso e a utilização da Plataforma RankFTV, operada por Carlos Gregório Rocha Batista (pessoa física, desenvolvedor e responsável pela plataforma, com domicílio e comarca em Eunápolis/BA), em conformidade com o Decreto nº 7.962/2013 (Decreto do Comércio Eletrônico), a Lei nº 12.965/2014 (Marco Civil da Internet), a Lei nº 8.078/1990 (Código de Defesa do Consumidor — CDC) e a Lei nº 13.709/2018 (LGPD), com suporte e canal de comunicação oficial pelo e-mail suporte@rankftv.com e contato@rankftv.com (com canal de contingência em carlosrocha0923@gmail.com) (“RankFTV”, “nós”)." },
      { p: "A Plataforma RankFTV oferece: (i) ferramentas para o Organizador criar, divulgar e gerenciar campeonatos de futevôlei; (ii) inscrição online de atletas e duplas em categorias; (iii) venda de ingressos de plateia ao público; (iv) credenciamento e check-in por QR Code; e (v) processamento de pagamentos com repasse ao Organizador, por meio de processador de pagamentos parceiro." },
      { p: "A RankFTV é uma intermediadora de tecnologia e de pagamentos. Os campeonatos e seus dados (datas, local, regras, valores, premiação) são de responsabilidade exclusiva do Organizador, único responsável por realizar o evento conforme anunciado." },
      { p: "A Plataforma é apresentada da maneira como está disponível e pode passar por melhorias e atualizações contínuas. A RankFTV empenha-se em manter as funcionalidades acessíveis, com layout claro e usável." },
      { p: "A RankFTV envida esforços para manter a disponibilidade contínua da Plataforma. Eventualmente pode ocorrer indisponibilidade temporária por manutenção ou força maior (desastres, falhas de energia, telecomunicações ou internet, fatos de terceiros). Nesses casos, a RankFTV trabalhará para restabelecer o acesso o mais breve possível, não respondendo por danos decorrentes de eventos fora de seu controle." },
      { p: "Manutenções programadas serão informadas, sempre que possível, com antecedência pelos canais oficiais." },
    ],
  },
  {
    titulo: "Cadastro de usuários",
    blocos: [
      { p: "O cadastro na Plataforma é gratuito. Os serviços de inscrição, ingresso e pagamento estão sujeitos às taxas previstas nestes Termos." },
      { p: "O cadastro inicial exige nome, e-mail, senha e um nome de usuário (@usuário) único. Os demais dados (telefone, cidade/estado, dados de recebimento, CPF/CNPJ) são solicitados sob demanda, conforme o Usuário utiliza funcionalidades que os exijam." },
      { p: "O Usuário deve fornecer informações verdadeiras, exatas e atualizadas, responsabilizando-se civil e criminalmente por elas. A RankFTV não se responsabiliza pela veracidade das informações inseridas pelos Usuários." },
      { p: "Para publicar eventos pagos e receber repasses, o Organizador deverá completar o cadastro com CPF ou CNPJ e dados de recebimento, podendo ter documentos solicitados pelo processador de pagamentos para verificação de identidade (KYC), nos termos da legislação de prevenção à lavagem de dinheiro (Lei nº 9.613/1998)." },
      { p: "Os serviços são prioritariamente direcionados a maiores de 18 anos. Menores de 18 anos só podem se cadastrar e se inscrever na Plataforma quando expressamente autorizados e assistidos por seus pais ou responsáveis legais, que respondem solidária, civil e penalmente por todos os atos do menor (conforme a Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente — e o art. 14 da LGPD). O Organizador é o único responsável por exigir e conferir o termo físico de autorização assinado pelos responsáveis legais para ingresso e participação de atletas menores nas arenas no dia do campeonato, bem como observar alvarás judiciais locais quando aplicáveis." },
      { p: "Sem prejuízo de outras medidas, a RankFTV poderá advertir, suspender ou cancelar o cadastro do Usuário que:" },
      { ul: [
        "Descumprir estes Termos ou outras políticas da RankFTV;",
        "Praticar atos fraudulentos ou ilícitos;",
        "Causar dano ou prejuízo a terceiros ou à RankFTV.",
      ] },
    ],
  },
  {
    titulo: "Acesso à conta",
    blocos: [
      { p: "O acesso é feito por login e senha pessoais e intransferíveis. O Usuário compromete-se a não compartilhar suas credenciais e a notificar a RankFTV imediatamente sobre qualquer uso não autorizado de sua conta. A RankFTV não se responsabiliza por perdas decorrentes de acesso não autorizado causado por falha do Usuário em proteger suas credenciais." },
      { p: "Apenas o titular da conta tem acesso aos seus dados. Alterações cadastrais só podem ser feitas pelo próprio Usuário, devidamente logado." },
    ],
  },
  {
    titulo: "Responsabilidades e obrigações do Organizador",
    blocos: [
      { p: "Ao criar e publicar um campeonato, o Organizador compromete-se a:" },
      { ul: [
        "Organizar apenas eventos que tenha o direito e a capacidade de realizar, cumprindo todas as exigências legais, regulatórias e de licenciamento aplicáveis (alvarás, autorizações, uso do espaço, segurança, etc.);",
        "Informar com exatidão todas as informações do evento: datas, local, categorias, valores, regulamento, premiação, política de cancelamento, restrições de idade e demais condições relevantes;",
        "Realizar o evento conforme anunciado, sob pena de responder por publicidade enganosa e pelos reembolsos devidos;",
        "Cadastrar corretamente seus dados de recebimento (chave Pix de sua titularidade) antes da abertura das vendas;",
        "Prestar atendimento aos atletas, duplas e espectadores do seu evento, respondendo dúvidas e solicitações em tempo hábil;",
        "Executar os cancelamentos e reembolsos devidos dentro dos prazos legais;",
        "Recolher os tributos incidentes sobre a venda de inscrições e ingressos e emitir os documentos fiscais devidos aos compradores;",
        "Observar as normas da Lei nº 14.597/2023 (Lei Geral do Esporte), garantindo aos atletas e espectadores condições adequadas de segurança física, higiene, hidratação, instalações apropriadas e socorro médico de urgência durante todo o período do evento;",
        "Respeitar a legislação de meia-entrada (Lei Federal nº 12.933/2013 e Lei nº 10.741/2003 — Estatuto da Pessoa Idosa) caso disponibilize ingressos pagos para plateia/espectadores, disponibilizando a cota legal e realizando a devida checagem documental na portaria do evento;",
        "Cumprir a legislação de direitos autorais, inclusive eventual recolhimento ao ECAD quando houver execução de obras musicais no evento;",
        "Não utilizar a Plataforma para comercializar produtos ou serviços estranhos ao evento;",
        "Configurar filtros anti-spam de modo a não bloquear os comunicados da RankFTV;",
        "Conceder à RankFTV o direito de divulgar o evento, suas marcas e imagens nos canais e redes da Plataforma.",
      ] },
      { p: "O Organizador é o único responsável pelo evento e pelo relacionamento com seus participantes. A RankFTV não organiza, patrocina nem garante a realização de qualquer evento." },
    ],
  },
  {
    titulo: "Eventos e conteúdos proibidos",
    blocos: [
      { p: "É vedado utilizar a Plataforma para criar, divulgar ou comercializar eventos ou conteúdos ilegais, fraudulentos, enganosos, racistas, discriminatórios, que incitem violência ou ódio, obscenos, que violem a privacidade ou os direitos de terceiros, ou que infrinjam propriedade intelectual." },
      { p: "A RankFTV poderá analisar eventos antes ou depois da publicação e poderá despublicar, suspender ou excluir qualquer evento que viole estes Termos, a legislação ou que gere risco ou dano a Usuários ou terceiros, podendo solicitar correções ao Organizador." },
    ],
  },
  {
    titulo: "Publicação e período de inscrições",
    blocos: [
      { p: "Após criado, o evento permanece como rascunho, visível apenas ao Organizador, até ser publicado. A publicação exige o aceite destes Termos e, quando houver venda paga, o cadastro dos dados de recebimento." },
      { p: "O Organizador define os períodos de inscrição, pré-venda e venda de ingressos. A RankFTV pode interromper a disponibilidade de um evento conforme estes Termos, observada a razoabilidade." },
    ],
  },
  {
    titulo: "Edição e cancelamento de eventos",
    blocos: [
      { p: "O Organizador pode editar as informações do evento para correção, melhoria ou atualização. Edições que prejudiquem participantes já inscritos podem levar a RankFTV a despublicar o evento e a reembolsar os afetados." },
      { p: "Caso o Organizador cancele o evento ou parte dele, é responsável pelos reembolsos integrais aos participantes. Os valores de reembolso serão descontados dos repasses devidos ao Organizador ou, na ausência destes, cobrados do Organizador." },
    ],
  },
  {
    titulo: "Inscrições, ingressos e pagamento",
    blocos: [
      { p: "Atletas e espectadores adquirem inscrições e ingressos por meio dos pagamentos oferecidos na Plataforma (Pix e cartão de crédito/débito), processados pelo processador de pagamentos parceiro." },
      { p: "Na inscrição de dupla, um dos atletas paga o valor cheio da dupla e o outro confirma a participação. Não há pagamento dividido entre os dois atletas." },
      { p: "Todas as transações passam por análise de risco automatizada e podem ser recusadas em caso de suspeita de fraude. Compras com cartão podem ficar pendentes de análise por até 48 horas; o comprador será notificado por e-mail caso o pedido seja suspenso ou cancelado." },
      { p: "Natureza jurídica dos valores: A inscrição de duplas ou atletas em categorias do campeonato possui natureza de taxa desportiva de participação e arbitragem, destinada à viabilização técnica e premiação da competição, não se confundindo com ingresso para espetáculo cultural ou artístico. Nos eventos em que o Organizador optar por cobrar ingressos de plateia para espectadores na arquibancada, aplicam-se a estes últimos as regras federais de meia-entrada (Lei nº 12.933/2013 e Lei nº 10.741/2003), sob gestão e validação exclusiva do Organizador." },
    ],
  },
  {
    titulo: "Liberação de inscrições e credenciais",
    blocos: [
      { p: "Confirmado o pagamento, a inscrição ou o ingresso é liberado na área logada do comprador, com a respectiva credencial digital (QR Code) quando aplicável." },
      { p: "A credencial é pessoal e válida para o acesso ao evento, sendo validada na portaria por leitura de QR Code (check-in). O Organizador é responsável pelo controle de acesso e de no-show no dia do evento." },
    ],
  },
  {
    titulo: "Cancelamento e reembolso",
    blocos: [
      { p: "O comprador pode solicitar o cancelamento da inscrição ou ingresso diretamente pela Plataforma." },
      { p: "Direito de arrependimento (art. 49, CDC): cancelamentos solicitados em até 7 (sete) dias corridos da data da compra dão direito ao reembolso integral do valor pago, incluindo a taxa de serviço da Plataforma, desde que a credencial não tenha sido utilizada e o evento ainda não tenha começado." },
      { p: "Após os 7 dias e até 72 (setenta e duas) horas antes do início da data cadastrada para o evento, o comprador pode solicitar voluntariamente a devolução do valor-base da inscrição ou ingresso. A taxa de serviço da RankFTV não será devolvida nessa hipótese, pois remunera a intermediação já prestada." },
      { p: "Faltando menos de 72 (setenta e duas) horas para o evento, depois do início da data do evento ou após o check-in, o cancelamento voluntário pelo autoatendimento não fica disponível. O Organizador pode oferecer uma condição mais favorável ao comprador." },
      { p: "Cancelamento do evento, alteração relevante de data ou local, cobrança duplicada ou falha atribuível à Plataforma dão direito à análise para reembolso integral, independentemente do prazo do cancelamento voluntário." },
      { p: "Solicitado o reembolso, novas solicitações ficam bloqueadas durante o processamento. A inscrição, a dupla e a credencial digital (QR Code) são definitivamente canceladas e a vaga é liberada quando a operação financeira é confirmada." },
      { p: "Os prazos para o dinheiro retornar ao comprador dependem do meio de pagamento: Pix em até 1 (um) dia útil; cartão de crédito ou débito em até 30 (trinta) dias corridos, conforme as regras da operadora do cartão." },
      { p: "O Organizador é responsável pelos reembolsos do valor da inscrição. A RankFTV poderá efetuá-los e descontar dos repasses do Organizador caso ele não o faça no prazo devido." },
    ],
  },
  {
    titulo: "Contestações, chargebacks e estornos",
    blocos: [
      { p: "Os estornos, chargebacks e contestações decorrentes da venda de inscrições e ingressos são de responsabilidade do Organizador, independentemente do motivo." },
      { p: "Os reembolsos devidos aos compradores em virtude de cancelamento voluntário tempestivo (até 72 horas antes do evento ou no prazo de 7 dias do art. 49 do CDC) serão preferencialmente compensados e absorvidos pela Reserva Técnica de Segurança de 30% mantida na Plataforma." },
      { p: "Se os valores ainda não tiverem sido repassados ou adiantados, o repasse correspondente é cancelado ou compensado. Caso o volume de cancelamentos ou chargebacks exceda o saldo retido ou o evento seja cancelado após a realização de adiantamentos pré-evento, o valor é cobrado do Organizador ou descontado de repasses futuros, obrigando-se o Organizador a ressarcir integralmente a RankFTV no prazo de até 48 (quarenta e oito) horas da notificação." },
      { p: "A RankFTV conduzirá as disputas abertas por compradores e poderá iniciar cancelamentos sem aprovação prévia do Organizador nos casos de descumprimento da política de reembolso, indícios de fraude, alteração prejudicial do evento, erro técnico ou volume elevado de reclamações." },
    ],
  },
  {
    titulo: "Taxa de serviço e Plano Elite",
    blocos: [
      { p: "Para cada inscrição ou ingresso pago, é cobrada uma taxa de serviço do comprador, somada ao valor definido pelo Organizador. O Organizador recebe o valor cheio que definiu — a taxa é paga pelo comprador, que visualiza o valor final, já com a taxa somada, antes de concluir a compra." },
      { p: "A taxa de serviço varia conforme o plano do evento e o meio de pagamento, sendo a mesma independentemente do número de parcelas no cartão:" },
      { ul: [
        "Plano Padrão: 8% no Pix e 10% no cartão de crédito ou débito;",
        "Plano Elite: 7% no Pix e 9% no cartão de crédito ou débito.",
      ] },
      { p: "A taxa de serviço tem valor mínimo de R$ 3,99 por transação. Não há cobrança de taxa em inscrições e ingressos gratuitos." },
      { p: "Plano Elite — o Organizador pode optar, em cada evento, pelo Plano Elite, que reduz as taxas e inclui benefícios adicionais (destaque do evento, divulgação, suporte priorizado, entre outros). A adesão ao Elite corresponde a R$ 178,00 (de R$ 399,00) por evento e não é cobrada antecipadamente: nada é pago no momento da ativação." },
      { p: "Forma de cobrança da adesão: o valor de R$ 178,00 é descontado automaticamente dos repasses das vendas do evento (inscrições e ingressos), abatendo-se o máximo possível de cada venda até a quitação integral. Se a primeira venda já for suficiente para cobrir todo o valor, a adesão é quitada de uma só vez nesse primeiro repasse; caso contrário, o saldo restante é abatido das vendas seguintes, até zerar." },
      { p: "Enquanto não houver vendas, nada é devido. Caso o evento seja encerrado sem vendas suficientes para cobrir os R$ 178,00, o saldo pendente é integralmente perdoado (zerado), sem qualquer cobrança ao Organizador." },
      { p: "Ativação: o Plano Elite pode ser ativado a qualquer momento enquanto o campeonato ainda não tiver começado — ou seja, durante a pré-venda ou com as vendas abertas. Após o início do campeonato, não é mais possível ativar o Elite." },
      { p: "Cancelamento do Plano Elite: enquanto nenhum valor da adesão tiver sido descontado, o Organizador pode cancelar o Plano Elite a qualquer momento, sem custo ou multa, retornando ao Plano Padrão. A partir do momento em que o primeiro valor for descontado de uma venda — independentemente do quanto for abatido —, a adesão torna-se definitiva e o Plano Elite não pode mais ser cancelado, permanecendo o Organizador responsável pela quitação dos R$ 178,00 na forma acima." },
    ],
  },
  {
    titulo: "Gestão de arena",
    blocos: [
      { p: "A Plataforma oferece ao Dono de arena ferramentas para: (i) cadastrar e gerenciar alunos; (ii) configurar e cobrar mensalidades de forma recorrente; (iii) registrar e cobrar aluguéis de quadra e diárias; e (iv) controlar a frequência dos alunos." },
      { p: "Ao cadastrar a Arena, o Dono de arena compromete-se a:" },
      { ul: [
        "Fornecer informações verdadeiras sobre o espaço, os valores praticados e os dados de recebimento;",
        "Cadastrar a chave Pix de sua titularidade (mesmo CPF/CNPJ) antes de iniciar as cobranças;",
        "Comunicar com clareza aos alunos as condições de mensalidade, aluguéis, diárias e política de cancelamento;",
        "Executar cancelamentos e devoluções devidas em tempo hábil;",
        "Recolher os tributos incidentes sobre as receitas da Arena e emitir os documentos fiscais devidos.",
      ] },
      { p: "O Dono de arena é o único responsável pela gestão do espaço, pelo relacionamento com os alunos e pelo cumprimento das obrigações tributárias, trabalhistas e regulatórias aplicáveis ao seu negócio. A RankFTV atua exclusivamente como intermediadora de tecnologia e de pagamentos." },
      { p: "A cobrança das mensalidades, aluguéis e diárias é processada pelo processador de pagamentos parceiro. O repasse ao Dono de arena ocorre conforme os prazos descritos na seção Prazos de repasse destes Termos, deduzidos eventuais reembolsos, chargebacks e débitos pendentes." },
      { p: "A RankFTV poderá suspender o acesso à Arena na Plataforma em caso de indícios de fraude, volume atípico de estornos ou descumprimento destes Termos, com aviso prévio sempre que possível." },
    ],
  },
  {
    titulo: "Dados de recebimento e repasse",
    blocos: [
      { p: "Para receber os valores das vendas, o Organizador deve cadastrar uma chave Pix válida e de sua titularidade (mesmo CPF/CNPJ do cadastro), além dos demais dados solicitados, antes da abertura das vendas. Não é permitido o repasse para contas de terceiros." },
      { p: "A RankFTV, por meio do processador de pagamentos parceiro, intermedia o recebimento e repassa ao Organizador o valor que lhe cabe, descontados eventuais débitos do Plano Elite, reembolsos, estornos e chargebacks." },
      { p: "O Organizador é o único responsável pela exatidão dos dados de recebimento e por qualquer erro ou atraso decorrente de cadastro incorreto." },
      { p: "A RankFTV poderá reter valores em caso de reembolsos pendentes, reclamações, indícios de fraude ou disputa, pelo tempo necessário à resolução e à eventual devolução aos compradores." },
    ],
  },
  {
    titulo: "Prazos de repasse, adiantamento e reserva de segurança",
    blocos: [
      { p: "Os repasses das vendas de campeonatos (inscrições e ingressos) obedecem a uma política transparente que concilia o fôlego financeiro do Organizador para produzir o torneio com a segurança jurídica e financeira dos participantes e da Plataforma:" },
      { ul: [
        "Liberação integral pós-evento: A quitação e liberação total de 100% do saldo remanescente das vendas de campeonatos ocorre em até 2 (dois) dias úteis após o término e encerramento oficial do evento (data de fim cadastrada), respeitados os prazos de liquidação de cada meio de pagamento;",
        "Adiantamento pré-evento para custeio: Visando permitir o custeio preparatório da infraestrutura do campeonato (aluguel de quadras, confecção de troféus e medalhas, arbitragem, camisetas e logística), o Organizador poderá solicitar o adiantamento de até 70% (setenta por cento) do saldo líquido arrecadado antes da realização do evento;",
        "Reserva Técnica de Segurança (30%): Durante o período de vendas e até 2 (dois) dias úteis após a conclusão do evento, a Plataforma manterá retido o percentual de 30% (trinta por cento) do saldo total arrecadado como Reserva Técnica de Segurança, destinada exclusivamente a absorver eventuais cancelamentos legais de atletas (art. 49 do CDC em até 7 dias corridos, ou cancelamentos parciais até 72 horas antes do torneio), disputas, chargebacks e ajustes operacionais;",
        "Liberação da Reserva Técnica: O valor retido a título de Reserva Técnica de Segurança é integralmente liberado para saque pelo Organizador em até 2 (dois) dias úteis após o encerramento do evento, deduzidos eventuais reembolsos e taxas devidas;",
        "Liquidação por meio de pagamento: Vendas realizadas via Pix possuem liquidação imediata no processador de pagamentos, ficando elegíveis ao limite de adiantamento pré-evento de 70% ou repasse final. Vendas realizadas em cartão de crédito ou débito seguem o prazo de liquidação da adquirente (em até 32 dias corridos para crédito e 3 dias úteis para débito), ficando disponíveis para adiantamento ou saque após a efetiva liquidação;",
        "Repasses de Arenas: A receita de mensalidades, diárias e aluguéis de quadras em Arenas cadastradas (serviços recorrentes e de fruição contínua no local) segue o prazo de repasse da liquidação bancária ordinária (Pix no mesmo dia ou dia útil seguinte; cartão em até 32 dias), sem aplicação da trava de evento esportivo.",
      ] },
      { p: "Prazos que recaiam em fim de semana ou feriado bancário são prorrogados para o próximo dia útil subsequente." },
      { p: "A RankFTV poderá suspender solicitações de adiantamento pré-evento em caso de dados cadastrais inconsistentes, indícios de cancelamento do torneio, volume atípico de reclamações ou disputas judiciais/extrajudiciais abertas por participantes." },
    ],
  },
  {
    titulo: "Nota fiscal e tributos",
    blocos: [
      { p: "Os tributos incidentes sobre a taxa de serviço cobrada pela RankFTV são de responsabilidade da RankFTV. Os tributos incidentes sobre o valor total das vendas (inscrições e ingressos) do Organizador são de responsabilidade exclusiva deste." },
      { p: "É responsabilidade do Organizador emitir os documentos fiscais devidos aos compradores e recolher os tributos correspondentes às suas vendas." },
    ],
  },
  {
    titulo: "Propriedade intelectual e direitos autorais",
    blocos: [
      { p: "A marca “RankFTV” e suas derivações, o nome de domínio, o layout, o “look and feel”, os textos, o software, os bancos de dados e demais elementos da Plataforma são de titularidade da RankFTV e protegidos pela legislação de propriedade intelectual. É vedada sua reprodução, total ou parcial, sem autorização prévia e expressa." },
      { p: "Ao publicar informações, imagens e marcas do evento na Plataforma, o Organizador concede à RankFTV licença gratuita, não exclusiva e por prazo indeterminado para divulgá-las nos canais da Plataforma. O Organizador declara ser titular ou ter autorização sobre todo o conteúdo que publica, respondendo isoladamente por ele." },
      { p: "O Organizador é responsável por observar a Lei nº 9.610/1998 (Direitos Autorais) e a Lei nº 9.279/1996 (Propriedade Industrial), bem como por recolher eventuais contribuições devidas ao ECAD quando houver execução de obras musicais no evento. A RankFTV poderá solicitar a comprovação do recolhimento e, na recusa, despublicar o evento." },
      { p: "A Plataforma pode conter links para sites de terceiros, sobre os quais a RankFTV não tem controle e não se responsabiliza." },
    ],
  },
  {
    titulo: "Segurança da Plataforma",
    blocos: [
      { p: "Não é permitido acessar áreas de programação, banco de dados ou qualquer estrutura interna da Plataforma, nem realizar engenharia reversa, descompilar, copiar, modificar, reproduzir, distribuir ou explorar suas funcionalidades sem autorização." },
      { p: "É proibido o uso de crawlers, spiders, robôs ou mineração de dados, salvo autorização expressa por escrito, bem como qualquer operação automatizada ou massificada sobre a Plataforma." },
    ],
  },
  {
    titulo: "Privacidade e proteção de dados",
    blocos: [
      { p: "A RankFTV trata os dados pessoais dos Usuários em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD). Esta seção integra os Termos e descreve como os dados são coletados, utilizados, compartilhados e protegidos." },
      { p: "Dados coletados: (i) dados de cadastro (nome, e-mail, @usuário, senha e, quando aplicável, telefone, cidade/estado, CPF/CNPJ e chave Pix); (ii) dados das inscrições, duplas, ingressos e credenciais; (iii) dados necessários ao pagamento, processados pelo processador de pagamentos parceiro; e (iv) dados de navegação e de uso da Plataforma." },
      { p: "Finalidades: os dados são usados para criar e gerenciar a conta, viabilizar inscrições, ingressos, credenciamento e pagamentos, repassar valores aos Organizadores, prevenir fraudes, cumprir obrigações legais e comunicar informações sobre eventos e sobre a Plataforma." },
      { p: "Compartilhamento: os dados podem ser compartilhados com o processador de pagamentos parceiro (para processar transações e repasses), com o Organizador do evento em que o Usuário se inscreveu (na medida necessária à realização do evento) e com autoridades quando exigido por lei ou ordem judicial. A RankFTV não vende dados pessoais a terceiros." },
      { p: "Direitos do titular: o Usuário pode solicitar, a qualquer momento, a confirmação da existência de tratamento, o acesso, a correção, a portabilidade, a anonimização ou a exclusão de seus dados, bem como informações sobre o tratamento, pelos canais oficiais da Plataforma, observadas as obrigações legais de guarda." },
      { p: "Segurança e retenção: a RankFTV adota medidas técnicas e administrativas razoáveis para proteger os dados pessoais e os mantém apenas pelo tempo necessário às finalidades acima ou ao cumprimento de obrigações legais e regulatórias." },
    ],
  },
  {
    titulo: "Limitação de responsabilidade e direito de regresso",
    blocos: [
      { p: "A RankFTV é uma intermediadora de tecnologia e processamento de pagamentos. O Organizador é o produtor exclusivo do evento e o responsável direto perante atletas, espectadores e autoridades pela concepção, segurança, alvarás, realização, qualidade, integridade física e cumprimento das condições anunciadas." },
      { p: "Em caso de cancelamento, não realização, alteração unilateral substancial ou falha na entrega do campeonato pelo Organizador, a RankFTV auxiliará na mediação e processará os reembolsos devidos aos compradores a partir dos saldos retidos, da Reserva Técnica ou de valores recuperados junto ao Organizador." },
      { p: "Direito de Regresso (art. 934 do Código Civil): Caso a RankFTV venha a ser compelida a restituir compradores, suportar estornos, chargebacks bancários ou pagar indenizações judiciais ou administrativas decorrentes de culpa, dolo, sumiço, fraude ou descumprimento contratual do Organizador, a RankFTV exercerá direito de regresso integral e imediato contra o Organizador, que responderá pelo ressarcimento de todos os valores despendidos, acrescidos de juros legais, correção monetária, custas processuais e honorários advocatícios." },
      { p: "A RankFTV não se responsabiliza por danos decorrentes de eventos de terceiros, como ataques de hackers, falhas de sistema, servidor ou conexão, vírus e programas maliciosos, salvo dolo ou culpa comprovados da RankFTV." },
      { p: "A RankFTV não responde por danos decorrentes de acesso não autorizado à conta do Usuário causado por desídia na guarda de credenciais pessoais, uso indevido da Plataforma ou descumprimento destes Termos pelo Usuário." },
    ],
  },
  {
    titulo: "Relação entre as partes",
    blocos: [
      { p: "Estes Termos não criam entre a RankFTV e o Usuário qualquer vínculo societário, de joint venture, parceria, emprego, mandato ou representação." },
    ],
  },
  {
    titulo: "Indenização",
    blocos: [
      { p: "O Usuário concorda em indenizar a RankFTV, seus sócios, administradores, empregados e empresas afiliadas por qualquer perda, dano ou despesa, incluindo honorários advocatícios, decorrentes de atos ou omissões do Usuário que violem estes Termos, as políticas da RankFTV ou a legislação." },
    ],
  },
  {
    titulo: "Rescisão e suspensão",
    blocos: [
      { p: "A RankFTV poderá, a seu critério, suspender ou encerrar a conta do Usuário e interromper o fornecimento dos serviços, com ou sem aviso prévio, em caso de violação destes Termos ou das políticas da Plataforma, de indícios de fraude, de índices atípicos de reembolsos/chargebacks ou de suspeita de lavagem de dinheiro ou financiamento ao terrorismo." },
      { p: "A RankFTV poderá rescindir estes Termos mediante notificação ao Organizador com antecedência de 10 (dez) dias. Em caso de rescisão, a RankFTV poderá reter valores para honrar eventuais reembolsos a compradores." },
      { p: "A RankFTV não responde perante o Usuário ou terceiros pelo encerramento da conta, remoção de evento ou bloqueio de acesso decorrentes do descumprimento destes Termos." },
    ],
  },
  {
    titulo: "Disposições gerais e foro",
    blocos: [
      { p: "A RankFTV poderá modificar estes Termos a qualquer tempo, para aprimoramento ou adequação legal, cabendo ao Usuário consultá-los periodicamente. O uso continuado da Plataforma após alterações implica concordância com a versão vigente." },
      { p: "A eventual tolerância a qualquer violação destes Termos é mera liberalidade e não implica novação, renúncia de direitos ou alteração contratual." },
      { p: "Se qualquer disposição destes Termos for considerada inválida, as demais permanecem em vigor. Estes Termos são regidos pela legislação brasileira." },
      { p: "A comunicação e o suporte oficial com a RankFTV são realizados pelo canal de suporte atendido (suporte@rankftv.com, contato@rankftv.com ou carlosrocha0923@gmail.com), de segunda a sexta-feira, das 09h00 às 18h00 (horário de Brasília), com tempo de resposta inicial em até 24 horas úteis para solicitações gerais e em até 1 hora para suporte operacional de ingressos no dia do evento. As divergências serão, sempre que possível, resolvidas amigavelmente; não havendo acordo, fica eleito o foro da Comarca de Eunápolis/BA, com renúncia a qualquer outro, por mais privilegiado que seja." },
    ],
  },
];

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Setinha de voltar no topo */}
      <BackButton />

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
        Termos de uso da RankFTV
      </h1>
      <p className="mt-1 text-sm text-gray-500">Última atualização: {ULTIMA_ATUALIZACAO}</p>

      <p className="mt-5 text-sm leading-relaxed text-gray-600">
        Estes Termos regulam o uso da Plataforma RankFTV por Organizadores, Atletas e
        Espectadores. Ao criar uma conta, publicar um evento, inscrever-se ou comprar um
        ingresso, você declara ter lido e aceitado integralmente estas condições.
      </p>
      <p className="mt-2 text-xs text-gray-400">Toque em cada título para abrir e ler.</p>

      {/* Acordeão: cada seção começa fechada e expande ao clicar (HTML <details>) */}
      <div className="mt-6 divide-y divide-gray-100 overflow-hidden rounded-2xl ring-1 ring-black/5">
        {SECOES.map((sec, i) => (
          <details key={sec.titulo} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-semibold text-gray-900">
                {i + 1}. {sec.titulo}
              </span>
              <ChevronDown className="size-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 px-4 pb-5 pt-1 text-sm leading-relaxed text-gray-700">
              {sec.blocos.map((bloco, j) => {
                if ("p" in bloco) {
                  return <p key={j}>{bloco.p}</p>;
                }
                if ("ul" in bloco) {
                  return (
                    <ul key={j} className="ml-1 space-y-1.5">
                      {bloco.ul.map((item, k) => (
                        <li key={k} className="flex gap-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-gray-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <dl key={j} className="space-y-2.5">
                    {bloco.defs.map((d) => (
                      <div key={d.termo}>
                        <dt className="font-semibold text-gray-900">{d.termo}</dt>
                        <dd className="text-gray-600">{d.desc}</dd>
                      </div>
                    ))}
                  </dl>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
