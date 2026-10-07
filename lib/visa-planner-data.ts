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
        "Conseguir contrato de trabalho ou promessa de contrato de empregador em Portugal.",
        "Pedir o visto no posto consular competente antes da mudança.",
        "A aprovação depende da análise do consulado.",
      ],
      money: [
        "A remuneração e os meios de subsistência da família são avaliados conforme o caso.",
        "Saldo bancário, sozinho, não substitui o contrato de trabalho.",
        "Salário mínimo português em 2026: € 920/mês (≈ R$ 5.151,17). É referência salarial, não garantia de visto.",
      ],
      documents: [
        "Formulário preenchido, passaporte válido e fotografias.",
        "Contrato de trabalho ou promessa de contrato.",
        "Comprovante de qualificação profissional, se aplicável.",
        "Comprovante de alojamento e de meios de subsistência.",
        "Registo criminal e seguro de viagem/saúde.",
        "Outros documentos que o consulado solicitar.",
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
        "Brasileiros com passaporte comum válido costumam ser isentos de visto para visita curta.",
        "Limite: até 90 dias em qualquer período de 180 dias no Espaço Schengen.",
        "A viagem deve ser para turismo ou visita; não autoriza trabalho ou residência.",
        "A isenção não garante a entrada: a fronteira pode pedir comprovantes.",
      ],
      money: [
        "Demonstre recursos para a estadia e para o retorno; a avaliação considera a duração e as condições da viagem.",
        "Referência portuguesa publicada: € 75 por entrada (≈ R$ 419,93).",
        "Some € 40 por dia (≈ R$ 223,96/dia) à referência acima.",
        "Como a regra é geral e brasileiros podem ser isentos de visto, confirme a aplicação ao seu caso.",
        "Alojamento e alimentação garantidos podem ser considerados na avaliação; confirme com a autoridade competente.",
      ],
      documents: [
        "Passaporte válido e plano/objetivo da viagem.",
        "Passagem de retorno ou de continuação da viagem.",
        "Reserva de hospedagem ou carta-convite.",
        "Comprovantes de recursos para a estadia.",
        "Confira se o seguro de viagem é exigido para sua situação e nacionalidade.",
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
        "Ser admitido por instituição de ensino reconhecida.",
        "O tipo de visto varia conforme o nível, a duração e o programa de estudos.",
        "Se for visto de residência, o processo é feito antes da mudança; confirme a modalidade aplicável ao curso.",
      ],
      money: [
        "A comprovação financeira varia conforme o tipo e a duração do curso.",
        "Referência geral de subsistência em 2026: € 920/mês (≈ R$ 5.151,17). Não é mínimo universal para todo visto de estudante.",
        "Algumas situações permitem redução ou dispensa, por exemplo, conforme bolsa ou modalidade de mobilidade.",
        "Taxa publicada para visto de residência de estudo: € 90 (≈ R$ 503,92); confirme o valor e eventuais isenções antes de pagar.",
      ],
      documents: [
        "Carta de admissão ou comprovante de matrícula.",
        "Comprovante de propinas ou bolsa, quando aplicável.",
        "Comprovante de alojamento aceito para a modalidade do visto. Não precisa ser Airbnb especificamente; confirme quais alternativas o checklist atual aceita.",
        "Passaporte, formulário, fotografias e seguro de saúde/viagem.",
        "Registo criminal e comprovantes financeiros, conforme o caso.",
        "Passagem: a exigência depende da modalidade e do checklist atual. Confirme com a VFS/consulado se uma reserva só de ida é suficiente antes de comprar.",
      ],
      sources: [
        { label: "Gov.pt — visto de residência para estudo", url: "https://www.gov.pt/servicos/pedir-um-visto-de-residencia-para-estudo-intercambio-de-estudantes-estagio-profissional-ou-voluntariado" },
        { label: "AIMA — autorização de residência para estudantes", url: "https://aima.gov.pt/pt/estudar/autorizacao-de-residencia-para-estudantes-art-92-o" },
        { label: "AIMA — meios de subsistência", url: "https://aima.gov.pt/pt/temas-transversais/meios-de-subsistencia" },
        { label: "VFS Portugal no Brasil — vistos e listas de documentos", url: "https://visa.vfsglobal.com/one-pager/portugal/brazil/portuguese/index.html" },
      ],
    },
    {
      id: "pt-irregular",
      title: "Ficar irregular após turismo",
      kind: "warning",
      summary: "Isto não é visto nem uma via legal de mudança: ocorre ao ultrapassar o prazo autorizado ou descumprir as condições da entrada.",
      prerequisites: [
        "Estar como turista não transforma automaticamente a estadia em residência.",
        "Para morar ou trabalhar, escolha a autorização adequada antes de vencer o prazo permitido.",
      ],
      money: [
        "Nenhum valor em dinheiro torna a permanência irregular legal.",
        "Custos e consequências administrativas podem variar; não inclua essa hipótese no orçamento da mudança.",
      ],
      documents: [
        "Não existe checklist de visto para permanecer irregularmente.",
        "Se isso já aconteceu, procure orientação jurídica migratória qualificada.",
        "Use os canais oficiais da AIMA e evite conselhos informais.",
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
        "Depois da autorização favorável, peça o visto no consulado competente.",
        "Respeite o prazo indicado pelo consulado para apresentar o pedido.",
      ],
      money: [
        "O contrato e a autorização de trabalho são centrais; saldo pessoal não substitui a autorização.",
        "Salário mínimo espanhol em 2026: € 1.221 por pagamento mensal, em 14 pagamentos (≈ R$ 6.836,50 por pagamento).",
        "Esse valor é referência salarial, não saldo bancário exigido para o visto.",
      ],
      documents: [
        "Formulário nacional, fotografia e passaporte válido.",
        "Autorização inicial de residência e trabalho.",
        "Cópia do contrato de trabalho aprovado.",
        "Antecedentes criminais e certificado médico, com apostila/legalização e tradução quando exigidas.",
        "Comprovante de residência na área consular.",
        "Demais documentos da lista atual do Consulado da Espanha em São Paulo.",
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
        "Brasileiros com passaporte comum válido costumam ser isentos de visto para visita curta.",
        "Limite: até 90 dias em qualquer período de 180 dias no Espaço Schengen.",
        "Turismo não autoriza emprego nem residência de longo prazo.",
        "A fronteira pode pedir prova do motivo da viagem, hospedagem, recursos e saída do Espaço Schengen.",
      ],
      money: [
        "A Espanha atualiza anualmente a comprovação financeira para visitantes.",
        "Referência de 2026: 10% do SMI por pessoa/dia e um mínimo de 90% do SMI por pessoa.",
        "Com SMI de € 1.221/mês: cerca de € 122,10/dia (≈ R$ 683,65/dia).",
        "Mínimo de referência: € 1.098,90 (≈ R$ 6.152,85 por pessoa). Confirme o cálculo antes da viagem.",
      ],
      documents: [
        "Passaporte válido e passagem de volta ou continuação da viagem.",
        "Comprovante de hospedagem ou carta-convite.",
        "Comprovante de recursos financeiros para todos os viajantes.",
        "Seguro de viagem é recomendado.",
        "A isenção não garante a entrada; as condições variam conforme nacionalidade, duração e perfil.",
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
        "Conseguir admissão em instituição ou programa de estudos elegível.",
        "Apresentar a matrícula quando exigida para o curso.",
        "Para estudar por mais de 90 dias, solicitar a autorização/visto nacional adequado antes da viagem.",
      ],
      money: [
        "Regra-base consultada para 2026: 100% do IPREM por mês de estadia.",
        "IPREM de referência: € 600/mês (≈ R$ 3.359,46).",
        "Para 12 meses: € 7.200 (≈ R$ 40.313,52). O total depende da duração do curso; € 7.400 não é o mínimo fixo oficial consultado.",
        "Primeiro familiar acompanhante: 75% do IPREM = € 450/mês (≈ R$ 2.519,60). Cada familiar adicional: 50% = € 300/mês (≈ R$ 1.679,73).",
        "Alojamento pago antecipadamente para toda a estadia pode reduzir a quantia financeira exigida.",
        "Inclua também propinas, seguro e demais despesas. Bolsas podem contar como recursos.",
      ],
      documents: [
        "Formulário, passaporte, fotografia e comprovante de admissão/matrícula.",
        "Comprovantes de recursos próprios, de patrocinador ou de bolsa.",
        "Seguro médico aceito na Espanha durante o período exigido.",
        "Airbnb/reserva: não aparece como exigência obrigatória na lista de estudos consultada. Sem alojamento pré-pago, continua necessário comprovar recursos suficientes; confirme com o consulado se pedirá informação adicional de endereço.",
        "Passagem: a lista consultada pede comprovação de recursos para estadia e retorno, mas não afirma que a passagem de volta já precise estar comprada. Uma passagem só de ida pode ser compatível com a mudança para estudar; confirme com o consulado antes de emitir.",
        "Para estadias longas, certificado médico e antecedentes criminais apostilados/traduzidos quando exigidos.",
      ],
      sources: [
        { label: "Consulado da Espanha em São Paulo — estudos (PDF oficial)", url: "https://exteriores.gob.es/Consulados/SAOPAULO/es/ServiciosConsulares/Documents/Requisitos%20Visados%20estudios.pdf" },
        { label: "Consulado da Espanha em São Paulo — agendamento de vistos", url: "https://www.exteriores.gob.es/Consulados/saopaulo/es/ServiciosConsulares/Paginas/Procedimiento-para-obtener-una-cita-de-Visados.aspx" },
        { label: "Consulado da Espanha no Brasil — requisitos de visto de estudos", url: "https://www.exteriores.gob.es/es/ServiciosAlCiudadano/Paginas/Servicios-consulares.aspx?scca=Visados&scco=Brasil&scd=33&scs=Visados+Nacionales+-+Visado+de+estudios" },
        { label: "Governo da Espanha — IPREM e 2026", url: "https://www.exteriores.gob.es/Consulados/losangeles/en/ServiciosConsulares/Paginas/Consular/Visado-de-estudios.aspx" },
        { label: "Embaixada da Espanha em Brasília — visto de estudos e prova de recursos", url: "https://www.exteriores.gob.es/Embajadas/brasilia/pt/ServiciosConsulares/Paginas/Consular/Visado-de-estudios.aspx" },
      ],
    },
    {
      id: "es-irregular",
      title: "Ficar irregular após turismo",
      kind: "warning",
      summary: "Isto não é visto nem uma via legal de mudança: ocorre ao permanecer além do prazo autorizado ou descumprir as condições de entrada.",
      prerequisites: [
        "Visto ou isenção de turista não autoriza permanência indefinida nem trabalho.",
        "Para morar ou trabalhar, obtenha a autorização/visto correspondente antes de mudar.",
        "Regras de regularização são específicas e podem mudar.",
      ],
      money: [
        "Nenhum valor em dinheiro torna uma estadia irregular autorizada.",
        "Custos, sanções e consequências variam conforme cada situação.",
        "Não planeje a mudança com base nessa hipótese.",
      ],
      documents: [
        "Não há checklist de visto para esta situação.",
        "Se já aconteceu, procure orientação jurídica migratória qualificada e canais oficiais espanhóis.",
        "Desconfie de intermediários que prometem regularização garantida.",
      ],
      sources: [
        { label: "Consulado da Espanha em São Paulo — vistos nacionais", url: "https://www.exteriores.gob.es/Consulados/saopaulo/pt/ServiciosConsulares/Paginas/index.aspx" },
        { label: "Diretiva de Retorno da União Europeia", url: "https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32008L0115" },
      ],
    },
  ],
};
