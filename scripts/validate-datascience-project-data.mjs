import fs from "node:fs";
import path from "node:path";

const base = path.join(process.cwd(), "public/evolution/datascience-projects");
const expected = {
  "diagnostico-atendimento": ["tickets.csv", "clientes.csv", "agentes.csv", "avaliacoes.csv", "dicionario.csv"],
  "painel-estoque": ["produtos.csv", "movimentacoes.csv", "vendas.csv", "pedidos_compra.csv", "filiais.csv"],
  "risco-credito": ["solicitantes.csv", "contratos.csv", "historico_pagamentos.csv", "alvo_inadimplencia.csv", "dicionario.csv"],
  "previsao-atendimento": ["volume_diario.csv", "calendario_eventos.csv", "capacidade_equipe.csv"],
  "api-churn": ["clientes.csv", "assinaturas.csv", "uso_mensal.csv", "alvo_churn.csv", "contrato_api.json", "casos_teste.json"],
  "inteligencia-avaliacoes": ["avaliacoes.csv", "produtos.csv", "taxonomia.csv", "amostra_anotada.csv", "casos_avaliacao.json"],
};

const results = [];
for (const [slug, files] of Object.entries(expected)) {
  for (const file of files) {
    const full = path.join(base, slug, file);
    if (!fs.existsSync(full)) throw new Error(`Arquivo ausente: ${slug}/${file}`);
    const text = fs.readFileSync(full, "utf8");
    if (!text.trim()) throw new Error(`Arquivo vazio: ${slug}/${file}`);
    if (file.endsWith(".json")) JSON.parse(text);
    const lines = file.endsWith(".csv") ? text.trim().split(/\r?\n/).length - 1 : null;
    if (lines !== null && lines < 1) throw new Error(`CSV sem dados: ${slug}/${file}`);
    results.push({ file: `${slug}/${file}`, rows: lines, bytes: Buffer.byteLength(text) });
  }
}

console.log(JSON.stringify({ status: "ok", files: results.length, csvRows: results.reduce((sum, item) => sum + (item.rows ?? 0), 0), results }, null, 2));
