export type VisaCountry = "portugal" | "espanha";

export type VisaSource = {
  label: string;
  url: string;
};

export type VisaGuide = {
  id: string;
  title: string;
  kind: "regular" | "warning";
  summary: string;
  prerequisites: string[];
  money: string[];
  documents: string[];
  sources: VisaSource[];
};

export const visaGuides: Record<VisaCountry, VisaGuide[]> = {
  portugal: [
    {
      id: "pt-work",
      title: "Trabalho",
      kind: "regular",
      summary: "Visto de residência para trabalho subordinado (por conta de outrem).",
      prerequisites: [
        "Ter contrato ou promessa de contrato de trabalho com empregador em Portugal.",
        "Apresentar o pedido no posto consular competente antes da mudança; a autorização depende da análise consular.",
      ],
      money: [
        "A renda do contrato e os meios de subsistência do agregado são analisados conforme o caso; não há um saldo bancário universal que substitua o contrato.",
        "A remuneração mínima portuguesa em 2026 é € 920/mês; é uma referência laboral, não uma promessa de aprovação do visto.",
      ],
      documents: [
        "Formulário, passaporte válido e fotografias.",
        "Contrato ou promessa de trabalho e, quando aplicável, comprovação de qualificação profissional.",
        "Comprovativos de alojamento e meios de subsistência.",
        "Registo criminal, seguro de viagem/saúde e demais documentos pedidos pelo consulado.",
      ],
      sources: [
        { label: "Gov.pt — visto para trabalho dependente", url: "https://www2.gov.pt/pt/servicos/pedir-um-visto-de-residencia-para-trabalho-dependente" },
        { label: "Gov.pt — salário mínimo 2026", url: "https://www.gov.pt/guias/trabalhar-em-portugal" },
      ],
    },
    {
      id: "pt-tourist",
      title: "Turista / curta duração",
      kind: "regular",
      summary: "Para brasileiro com passaporte comum válido, a visita curta costuma ser isenta de visto Schengen.",
      prerequisites: [
        "Limite de até 90 dias em qualquer período de 180 dias no Espaço Schengen.",
        "Finalidade de turismo/visita, sem trabalhar nem usar a viagem como autorização para residir.",
        "A isenção não garante a entrada: a autoridade de fronteira pode pedir comprovações.",
      ],
      money: [
        "É preciso demonstrar meios suficientes para a duração da viagem e para o retorno. O valor concreto pode depender da análise da fronteira e das condições comprovadas.",
        "Alojamento e alimentação assegurados podem ser considerados na avaliação; confirme previamente com a autoridade/consulado competente.",
      ],
      documents: [
        "Passaporte válido, plano/objetivo de viagem e passagem de retorno ou continuação.",
        "Comprovantes de hospedagem ou carta-convite e recursos para a estadia.",
        "Seguro de viagem é recomendado; confira a exigência para a situação e nacionalidade específicas.",
      ],
      sources: [
        { label: "Acordo UE–Brasil — estadias curtas", url: "https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:02012A0921(02)-20221001" },
        { label: "Gov.pt — visto Schengen de curta duração", url: "https://www.gov.pt/servicos/pedir-um-visto-schengen-de-curta-duracao" },
        { label: "Diário da República — meios de subsistência", url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2007-67564445-67557043" },
      ],
    },
    {
      id: "pt-student",
      title: "Estudante",
      kind: "regular",
      summary: "Visto de residência para estudar em instituição reconhecida, em cursos compatíveis com a categoria solicitada.",
      prerequisites: [
        "Ter sido admitido por instituição de ensino reconhecida ou cumprir as condições de admissão.",
        "O tipo de visto e a autorização posterior variam conforme nível, duração e programa de estudos.",
      ],
      money: [
        "Comprovar meios de subsistência para a duração do plano, além de considerar propinas, alojamento e despesas de vida.",
        "Bolsas e algumas modalidades de mobilidade podem alterar ou dispensar parte da prova; confira a regra do curso e do consulado.",
      ],
      documents: [
        "Carta de admissão/matrícula e, quando aplicável, comprovativo de propinas ou bolsa.",
        "Passaporte, formulário, fotografias, seguro de saúde/viagem e alojamento.",
        "Certificados de registo criminal e comprovativos financeiros, conforme o caso.",
      ],
      sources: [
        { label: "Gov.pt — visto de residência para estudo", url: "https://www.gov.pt/servicos/pedir-um-visto-de-residencia-para-estudo-intercambio-de-estudantes-estagio-profissional-ou-voluntariado" },
        { label: "AIMA — autorização de residência para estudantes", url: "https://aima.gov.pt/pt/estudar/autorizacao-de-residencia-para-estudantes-art-92-o" },
      ],
    },
    {
      id: "pt-irregular",
      title: "Ficar irregular após turismo",
      kind: "warning",
      summary: "Isto não é visto nem uma via legal de mudança: ocorre ao ultrapassar o prazo autorizado ou descumprir as condições da entrada.",
      prerequisites: [
        "Não existe pedido aprovado que transforme automaticamente a estadia de turista em residência.",
        "Para morar ou trabalhar, planeje a categoria de residência adequada e os requisitos antes de vencer a estadia permitida.",
      ],
      money: [
        "Não existe valor financeiro que torne a permanência irregular permitida.",
        "Pode gerar custos e consequências administrativas imprevisíveis; não conte com esta opção no orçamento da mudança.",
      ],
      documents: [
        "Não há checklist de visto para esta situação.",
        "Se já aconteceu, procure orientação jurídica migratória qualificada e os canais oficiais da AIMA; não dependa de conselhos informais.",
      ],
      sources: [
        { label: "AIMA — informações oficiais", url: "https://aima.gov.pt/pt" },
        { label: "Gov.pt — vistos e autorizações para viver em Portugal", url: "https://www.gov.pt/guias/migrantes-vistos-e-autorizacoes-para-entrar-e-viver-em-portugal" },
        { label: "Diretiva de Retorno da União Europeia", url: "https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32008L0115" },
      ],
    },
  ],
  espanha: [
    {
      id: "es-work",
      title: "Trabalho",
      kind: "regular",
      summary: "Visto nacional de residência e trabalho por conta alheia, para trabalhar com contrato espanhol.",
      prerequisites: [
        "O empregador na Espanha solicita primeiro a autorização inicial de residência e trabalho.",
        "Com a autorização favorável, o trabalhador pede o visto no consulado competente dentro do prazo indicado.",
      ],
      money: [
        "O contrato e a autorização de trabalho são centrais; não há um saldo pessoal único que substitua essa autorização.",
        "Salário e condições devem respeitar a legislação espanhola e a categoria profissional aplicável.",
      ],
      documents: [
        "Formulário nacional, fotografia e passaporte válido.",
        "Autorização inicial de residência e trabalho e cópia do contrato aprovado.",
        "Antecedentes criminais e certificado médico, apostilados/legalizados e traduzidos quando exigido.",
        "Comprovativo de residência na área consular e demais documentos do Consulado da Espanha em São Paulo.",
      ],
      sources: [
        { label: "Consulado da Espanha em São Paulo — visto de trabalho", url: "https://www.exteriores.gob.es/Consulados/saopaulo/es/ServiciosConsulares/Paginas/index.aspx?scca=Visados&scco=Brasil&scd=263&scs=Visados+Nacionales+-+Visado+de+trabajo+por+cuenta+ajena" },
      ],
    },
    {
      id: "es-tourist",
      title: "Turista / curta duração",
      kind: "regular",
      summary: "Para brasileiro com passaporte comum, a visita turística curta costuma ser isenta de visto Schengen.",
      prerequisites: [
        "Limite de até 90 dias em qualquer período de 180 dias no Espaço Schengen.",
        "Turismo não autoriza emprego nem residência de longo prazo.",
        "A fronteira pode exigir prova do propósito, hospedagem, recursos e saída do Espaço Schengen.",
      ],
      money: [
        "A Espanha atualiza anualmente o valor de comprovação. Para 2026, a regra publicada usa 10% do SMI por pessoa/dia e um mínimo de 90% do SMI por pessoa.",
        "Com SMI 2026 de € 1.221/mês, isso corresponde a cerca de € 122,10/dia e mínimo de € 1.098,90; confirme o cálculo oficial perto da viagem.",
      ],
      documents: [
        "Passaporte válido, passagem de volta/continuação e comprovante de hospedagem ou convite.",
        "Prova de meios econômicos para todos os viajantes e seguro de viagem recomendado.",
        "As condições podem variar com nacionalidade, duração e perfil; a isenção de visto não garante a entrada.",
      ],
      sources: [
        { label: "Acordo UE–Brasil — estadias curtas", url: "https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:02012A0921(02)-20221001" },
        { label: "Consulado da Espanha no Rio — condições de entrada", url: "https://www.exteriores.gob.es/Consulados/riodejaneiro/es/ServiciosConsulares/Paginas/index.aspx?scca=Visados&scco=Brasil&scd=246&scs=Condiciones-de-entrada-en-Espana" },
        { label: "Governo da Espanha — SMI 2026", url: "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/trabajo14/Paginas/2023/140223-salario-minimo-interprofesional.aspx" },
      ],
    },
    {
      id: "es-student",
      title: "Estudante",
      kind: "regular",
      summary: "Autorização/visto nacional para estudos de longa duração; o procedimento do consulado depende do curso e da duração.",
      prerequisites: [
        "Carta de admissão de instituição/programa elegível e matrícula conforme exigido.",
        "Para permanência acima de 90 dias, solicitar a autorização/visto adequado antes da viagem.",
      ],
      money: [
        "Regra-base consular: comprovar recursos equivalentes a 100% do IPREM por mês da estadia; somam-se valores para familiares acompanhantes.",
        "O orçamento também deve cobrir propinas, alojamento, seguro e retorno. Bolsas podem compor a comprovação.",
      ],
      documents: [
        "Formulário, passaporte, foto e carta de admissão/matrícula.",
        "Comprovativos de recursos (próprios, patrocinador ou bolsa) e seguro médico aceito na Espanha.",
        "Para estadias longas, certificado médico e antecedentes criminais apostilados/traduzidos quando exigidos.",
      ],
      sources: [
        { label: "Consulado da Espanha em São Paulo — estudos (PDF oficial)", url: "https://exteriores.gob.es/Consulados/SAOPAULO/es/ServiciosConsulares/Documents/Requisitos%20Visados%20estudios.pdf" },
        { label: "Consulado da Espanha em São Paulo — agendamento de vistos", url: "https://www.exteriores.gob.es/Consulados/saopaulo/es/ServiciosConsulares/Paginas/Procedimiento-para-obtener-una-cita-de-Visados.aspx" },
      ],
    },
    {
      id: "es-irregular",
      title: "Ficar irregular após turismo",
      kind: "warning",
      summary: "Isto não é visto nem uma via legal de mudança: ocorre ao permanecer além do prazo autorizado ou descumprir as condições de entrada.",
      prerequisites: [
        "Não existe visto de turista que autorize permanecer indefinidamente ou trabalhar.",
        "Para morar ou trabalhar, obtenha previamente a autorização/visto correspondente; regras de regularização são específicas e podem mudar.",
      ],
      money: [
        "Não há valor que transforme uma estadia irregular em autorizada.",
        "Custos, sanções e consequências variam conforme os fatos; não planeje a mudança com base nessa hipótese.",
      ],
      documents: [
        "Não há checklist de visto para esta situação.",
        "Se já aconteceu, procure orientação jurídica migratória qualificada e os canais oficiais espanhóis; não use intermediários que prometam regularização garantida.",
      ],
      sources: [
        { label: "Consulado da Espanha em São Paulo — vistos nacionais", url: "https://www.exteriores.gob.es/Consulados/saopaulo/pt/ServiciosConsulares/Paginas/index.aspx" },
        { label: "Diretiva de Retorno da União Europeia", url: "https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32008L0115" },
      ],
    },
  ],
};
