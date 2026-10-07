export type VisaComparisonStatus = "required" | "differs" | "depends" | "not_applicable";

export type VisaComparisonRow = {
  topic: string;
  portugal: { status: VisaComparisonStatus; text: string };
  espanha: { status: VisaComparisonStatus; text: string };
};

export const visaComparisons: Record<string, VisaComparisonRow[]> = {
  work: [
    {
      topic: "Oferta de trabalho e autorização",
      portugal: { status: "required", text: "Contrato ou promessa de contrato; pedir o visto no consulado." },
      espanha: { status: "required", text: "O empregador obtém primeiro a autorização inicial; depois o trabalhador pede o visto." },
    },
    {
      topic: "Comprovação financeira",
      portugal: { status: "differs", text: "Contrato, remuneração e meios do agregado são avaliados; não há saldo universal que substitua o contrato." },
      espanha: { status: "differs", text: "Contrato e autorização são centrais; o salário mínimo é referência laboral, não saldo bancário do visto." },
    },
    {
      topic: "Documentos pessoais e certificados",
      portugal: { status: "required", text: "Passaporte, formulário, fotos e registo criminal; outros itens dependem do consulado." },
      espanha: { status: "required", text: "Passaporte, formulário, foto, antecedentes e certificado médico conforme a lista consular." },
    },
    {
      topic: "Alojamento e seguro",
      portugal: { status: "depends", text: "Comprovantes podem constar do checklist aplicável; confira a modalidade do visto." },
      espanha: { status: "depends", text: "Siga a lista do consulado competente; documentos adicionais podem ser solicitados no caso concreto." },
    },
  ],
  tourist: [
    {
      topic: "Isenção e duração da visita",
      portugal: { status: "required", text: "Brasileiros costumam ser isentos de visto para curta duração: até 90 dias em qualquer período de 180 dias Schengen." },
      espanha: { status: "required", text: "Brasileiros costumam ser isentos de visto para curta duração: até 90 dias em qualquer período de 180 dias Schengen." },
    },
    {
      topic: "Passagem de saída/retorno",
      portugal: { status: "required", text: "Tenha passagem de retorno ou continuação da viagem para demonstrar a saída dentro do prazo." },
      espanha: { status: "required", text: "A autoridade pode exigir passagem de ida e volta ou circuito turístico na entrada de curta duração." },
    },
    {
      topic: "Alojamento",
      portugal: { status: "depends", text: "Pode ser solicitado na avaliação de entrada; reserva ou carta-convite são exemplos de comprovante." },
      espanha: { status: "depends", text: "Pode ser solicitado na entrada; hospedagem ou convite devem demonstrar onde ficará." },
    },
    {
      topic: "Dinheiro para a viagem",
      portugal: { status: "differs", text: "Referência publicada: € 75 por entrada + € 40 por dia; confirme se se aplica ao seu caso de isenção." },
      espanha: { status: "differs", text: "Referência de 2026: 10% do SMI por dia e mínimo de 90% do SMI por pessoa; confirme perto da viagem." },
    },
    {
      topic: "Trabalho e residência",
      portugal: { status: "not_applicable", text: "A entrada como turista não autoriza trabalhar nem residir a longo prazo." },
      espanha: { status: "not_applicable", text: "A entrada como turista não autoriza trabalhar nem residir a longo prazo." },
    },
  ],
  student: [
    {
      topic: "Admissão em instituição de ensino",
      portugal: { status: "required", text: "É necessário ser admitido; o tipo de visto depende do curso e da duração." },
      espanha: { status: "required", text: "É necessário ser admitido em instituição/programa elegível; acima de 90 dias, use a autorização adequada." },
    },
    {
      topic: "Comprovação financeira",
      portugal: { status: "differs", text: "Varia por curso e categoria. € 920/mês é referência geral de 2026, não mínimo universal." },
      espanha: { status: "differs", text: "Regra-base consultada: 100% do IPREM por mês; € 600/mês em 2026, com possíveis ajustes conforme o caso." },
    },
    {
      topic: "Alojamento (não precisa ser Airbnb)",
      portugal: { status: "depends", text: "O checklist da modalidade pode exigir prova de alojamento. Airbnb não é o único formato: confirme quais alternativas são aceitas." },
      espanha: { status: "depends", text: "A lista consultada não exige reserva de Airbnb especificamente. Alojamento pago antecipadamente pode reduzir os recursos a comprovar; confirme documentos e endereço com o consulado." },
    },
    {
      topic: "Passagem de ida ou volta",
      portugal: { status: "depends", text: "A exigência depende da categoria e duração do visto. Confirme com a VFS/consulado se reserva só de ida basta antes de comprar." },
      espanha: { status: "differs", text: "A lista de estudos consultada pede recursos para estadia e retorno, mas não afirma que a passagem de volta já precise estar comprada. Confirme antes de emitir só ida." },
    },
    {
      topic: "Seguro e documentos pessoais",
      portugal: { status: "required", text: "Passaporte, formulário, fotos, seguro e registo criminal, conforme categoria e checklist." },
      espanha: { status: "required", text: "Passaporte, formulário, seguro médico aceito e, em estadias longas, certificados exigidos pelo consulado." },
    },
  ],
  irregular: [
    {
      topic: "É uma categoria de visto?",
      portugal: { status: "not_applicable", text: "Não. Exceder a estadia ou violar as condições pode deixar a pessoa irregular." },
      espanha: { status: "not_applicable", text: "Não. Exceder a estadia ou violar as condições pode deixar a pessoa irregular." },
    },
    {
      topic: "Autoriza trabalhar ou morar?",
      portugal: { status: "not_applicable", text: "Não. Turismo não é autorização de residência ou trabalho." },
      espanha: { status: "not_applicable", text: "Não. Turismo não é autorização de residência ou trabalho." },
    },
    {
      topic: "Como planejar uma mudança regular",
      portugal: { status: "differs", text: "Escolha a autorização portuguesa correspondente antes do fim da estadia permitida." },
      espanha: { status: "differs", text: "Escolha a autorização espanhola correspondente antes da mudança; regras de regularização são próprias e podem mudar." },
    },
  ],
};
