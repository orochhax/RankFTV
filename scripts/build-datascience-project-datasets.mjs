import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputRoot = path.resolve("public/evolution/datascience-projects");
const previewRoot = path.resolve(".tmp/datascience-project-previews");

const pad = (value, length = 3) => String(value).padStart(length, "0");
const dateBr = (day, month, year = 2026) => `${pad(day, 2)}/${pad(month, 2)}/${year}`;
const moneyBr = (value) => value.toFixed(2).replace(".", ",");

function formatSheet(sheet, rows) {
  const range = sheet.getRangeByIndexes(0, 0, rows.length, rows[0].length);
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  range.format.font = { name: "Arial", size: 10, color: "#172033" };
  sheet.getRangeByIndexes(0, 0, 1, rows[0].length).format = {
    fill: "#155EEF",
    font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  };
  range.format.autofitColumns();
}

async function saveWorkbook(slug, sheets) {
  const workbook = Workbook.create();
  for (const source of sheets) {
    const sheet = workbook.worksheets.add(source.name);
    sheet.getRangeByIndexes(0, 0, source.rows.length, source.rows[0].length).values = source.rows;
    formatSheet(sheet, source.rows);
  }
  workbook.recalculate();
  const inspection = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 3000 });
  if (!inspection.ndjson.includes(sheets[0].name)) throw new Error(`Falha ao inspecionar ${slug}.`);
  const preview = await workbook.render({ sheetName: sheets[0].name, autoCrop: "all", scale: 0.7, format: "png" });
  const directory = path.join(outputRoot, slug);
  await fs.mkdir(directory, { recursive: true });
  await fs.mkdir(previewRoot, { recursive: true });
  await fs.writeFile(path.join(previewRoot, `${slug}.png`), new Uint8Array(await preview.arrayBuffer()));
  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(path.join(directory, "base-ficticia-completa.xlsx"));
}

const clientesPainel = [["cliente_id", "nome_cliente", "email", "cidade", "uf", "segmento"]];
for (let index = 1; index <= 24; index += 1) clientesPainel.push([
  `CLI-${pad(index)}`,
  index === 7 ? "Mercado Sol " : index === 14 ? "mercado sol" : `Cliente ${index}`,
  index === 9 ? "" : index === 14 ? "contato@mercadosol.com" : `cliente${index}@exemplo.com`,
  index % 6 === 0 ? "" : ["Eunápolis", "Porto Seguro", "Itabuna", "Teixeira de Freitas"][index % 4],
  index === 5 ? "ba" : index === 12 ? "" : "BA",
  ["Varejo", "Serviços", "Atacado"][index % 3],
]);

const pedidosPainel = [["pedido_id", "data_pedido", "cliente_id", "canal", "categoria", "quantidade", "preco_unitario", "status"]];
for (let index = 1; index <= 72; index += 1) {
  const price = 35 + (index % 9) * 17.5;
  pedidosPainel.push([
    index === 44 ? "PED-018" : `PED-${pad(index)}`,
    index === 11 ? "2026-10-12" : index === 39 ? "05-11-2026" : dateBr((index % 27) + 1, index <= 36 ? 10 : 11),
    index === 33 ? "CLI-999" : `CLI-${pad((index % 24) + 1)}`,
    index % 13 === 0 ? "whatsapp " : index % 7 === 0 ? "Loja fisica" : ["WhatsApp", "Loja física", "Instagram"][index % 3],
    index % 10 === 0 ? "acessorios" : ["Eletrônicos", "Acessórios", "Casa"][index % 3],
    index === 51 ? "" : index === 62 ? -1 : (index % 4) + 1,
    index === 28 ? `R$ ${moneyBr(price)}` : moneyBr(price),
    index === 17 ? "cancelado " : index === 40 ? "PAGO" : ["Pago", "Pendente", "Cancelado"][index % 3],
  ]);
}

const pagamentosPainel = [["pagamento_id", "pedido_id", "data_pagamento", "valor_pago", "meio_pagamento", "situacao"]];
for (let index = 1; index <= 58; index += 1) pagamentosPainel.push([
  index === 31 ? "PG-015" : `PG-${pad(index)}`,
  `PED-${pad(index)}`,
  index % 9 === 0 ? "" : dateBr((index % 27) + 1, index <= 30 ? 10 : 11),
  index === 22 ? "1.250,00" : moneyBr(((index % 4) + 1) * (35 + (index % 9) * 17.5)),
  index % 8 === 0 ? "pix " : index % 5 === 0 ? "Cartao" : ["PIX", "Cartão", "Boleto"][index % 3],
  index % 11 === 0 ? "estornado" : ["Confirmado", "Confirmado", "Pendente"][index % 3],
]);

await saveWorkbook("painel-vendas", [
  { name: "Pedidos_raw", rows: pedidosPainel },
  { name: "Clientes_raw", rows: clientesPainel },
  { name: "Pagamentos_raw", rows: pagamentosPainel },
  { name: "Dicionario", rows: [["tabela", "campo", "regra esperada"], ["pedidos", "pedido_id", "não vazio; repetição exige justificativa"], ["pedidos", "quantidade", "inteiro positivo"], ["pagamentos", "valor_pago", "reconciliar por pedido"], ["clientes", "cliente_id", "chave única e não vazia"]] },
]);

const clientesPipeline = [["cliente_id", "nome", "segmento", "cidade", "data_cadastro"]];
for (let index = 1; index <= 36; index += 1) clientesPipeline.push([`C${pad(index, 4)}`, index === 18 ? "Empresa Horizonte " : index === 27 ? "empresa horizonte" : `Empresa ${index}`, ["PME", "Micro", "Médio"][index % 3], ["Salvador", "Eunápolis", "Ilhéus", "Vitória da Conquista"][index % 4], index % 10 === 0 ? "" : dateBr((index % 27) + 1, (index % 6) + 1)]);
const produtosPipeline = [["produto_id", "produto", "categoria", "custo_unitario"]];
for (let index = 1; index <= 18; index += 1) produtosPipeline.push([`P${pad(index)}`, `Produto ${index}`, ["Software", "Serviço", "Equipamento"][index % 3], moneyBr(20 + index * 4.75)]);
function vendasMes(month, amount, schemaDrift = false) {
  const rows = [schemaDrift ? ["id_venda", "data", "id_cliente", "id_produto", "qtd", "valor_unit", "situacao", "origem"] : ["venda_id", "data_venda", "cliente_id", "produto_id", "quantidade", "valor_unitario", "status", "canal"]];
  for (let index = 1; index <= amount; index += 1) rows.push([`V${month}${pad(index, 4)}`, index === 13 ? `2026-${pad(month, 2)}-31` : dateBr((index % 27) + 1, month), index === 19 ? "C9999" : `C${pad((index % 36) + 1, 4)}`, `P${pad((index % 18) + 1)}`, index === 27 ? "dois" : (index % 5) + 1, index === 35 ? "" : moneyBr(45 + (index % 12) * 13.2), index % 17 === 0 ? "CANCELADA" : ["Concluída", "Concluída", "Pendente"][index % 3], ["Site", "Indicação", "WhatsApp"][index % 3]]);
  return rows;
}
await saveWorkbook("pipeline-sql-python", [
  { name: "Vendas_Set_raw", rows: vendasMes(9, 42) }, { name: "Vendas_Out_raw", rows: vendasMes(10, 47) }, { name: "Vendas_Nov_schema", rows: vendasMes(11, 51, true) },
  { name: "Clientes_raw", rows: clientesPipeline }, { name: "Produtos_raw", rows: produtosPipeline },
  { name: "Regras", rows: [["regra", "critério de aceite"], ["Preservar brutos", "nenhuma célula raw sobrescrita"], ["Padronizar schema", "saída usa nomes canônicos"], ["Rejeitar inválidos", "erros vão para tabela de rejeitados"], ["Reconciliação mensal", "contagem e soma explicadas"], ["Execução reproduzível", "um comando processa uma nova pasta"]] },
]);

const pedidosConsultoria = [["pedido_id", "data_pedido", "cliente_id", "canal", "loja", "status_pedido", "desconto"]];
const itensConsultoria = [["pedido_id", "item_id", "produto_id", "quantidade", "preco_unitario"]];
const pagamentosConsultoria = [["pagamento_id", "pedido_id", "data_vencimento", "data_pagamento", "valor", "status_pagamento"]];
for (let index = 1; index <= 120; index += 1) {
  pedidosConsultoria.push([`AUR-${pad(index, 4)}`, index === 37 ? "2026/11/31" : dateBr((index % 27) + 1, 9 + (index % 3)), `C${pad((index % 44) + 1, 4)}`, index % 14 === 0 ? "whats app" : ["Loja", "WhatsApp", "Instagram", "Site"][index % 4], ["Centro", "Bairro", "Online"][index % 3], index % 19 === 0 ? "Cancelado" : index % 7 === 0 ? "pendente" : "Concluído", index % 23 === 0 ? "" : moneyBr((index % 5) * 5)]);
  for (let item = 1; item <= (index % 3) + 1; item += 1) itensConsultoria.push([`AUR-${pad(index, 4)}`, `I${item}`, `P${pad(((index + item) % 28) + 1)}`, index === 66 && item === 1 ? -2 : ((index + item) % 4) + 1, moneyBr(25 + ((index + item) % 16) * 8.4)]);
  if (index <= 104) pagamentosConsultoria.push([`PA${pad(index, 4)}`, `AUR-${pad(index, 4)}`, dateBr((index % 27) + 1, 9 + (index % 3)), index % 9 === 0 ? "" : dateBr(((index + 3) % 27) + 1, 9 + (index % 3)), moneyBr(60 + (index % 11) * 32.5), index % 13 === 0 ? "Estornado" : index % 9 === 0 ? "Em aberto" : "Pago"]);
}
const estoqueConsultoria = [["produto_id", "data_referencia", "estoque_atual", "estoque_minimo", "custo_unitario"]];
for (let index = 1; index <= 28; index += 1) estoqueConsultoria.push([`P${pad(index)}`, "30/11/2026", index === 8 ? "" : (index * 3) % 45, 8 + (index % 5), moneyBr(10 + index * 3.8)]);
const marketingConsultoria = [["campanha_id", "mes", "canal", "investimento", "leads", "pedidos_atribuidos"]];
for (let index = 1; index <= 18; index += 1) marketingConsultoria.push([`MKT-${pad(index)}`, `2026-${pad(9 + (index % 3), 2)}`, ["Instagram", "Google", "Indicação"][index % 3], moneyBr(300 + index * 47), index === 11 ? "" : 20 + index * 4, index % 6 === 0 ? -1 : 4 + (index % 12)]);
await saveWorkbook("consultoria-dados", [
  { name: "Briefing", rows: [["campo", "conteúdo"], ["Empresa fictícia", "Casa Aurora — varejo de utilidades domésticas"], ["Problema", "Receita cresce, mas caixa e estoque não acompanham"], ["Decisão", "Definir categorias, canais e regiões a priorizar"], ["Entregas", "Diagnóstico, SQL, painel, análise Python, relatório e proposta"], ["Restrições", "Dados sintéticos; sem causalidade inventada; documentar limitações"]] },
  { name: "Pedidos_raw", rows: pedidosConsultoria }, { name: "Itens_raw", rows: itensConsultoria }, { name: "Pagamentos_raw", rows: pagamentosConsultoria }, { name: "Estoque_raw", rows: estoqueConsultoria }, { name: "Marketing_raw", rows: marketingConsultoria },
]);

console.log("Três bases XLSX geradas, inspecionadas e renderizadas.");
