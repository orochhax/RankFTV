import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public/evolution/datascience-projects");
const rng = (() => { let seed = 20261029; return () => ((seed = seed * 1664525 + 1013904223 >>> 0) / 4294967296); })();
const pick = (items) => items[Math.floor(rng() * items.length)];
const pad = (value) => String(value).padStart(2, "0");
const date = (start, offset) => { const current = new Date(`${start}T12:00:00Z`); current.setUTCDate(current.getUTCDate() + offset); return `${current.getUTCFullYear()}-${pad(current.getUTCMonth() + 1)}-${pad(current.getUTCDate())}`; };
const csvValue = (value) => { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
const writeCsv = (dir, name, rows) => {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(","))].join("\n");
  fs.writeFileSync(path.join(dir, name), `${csv}\n`, "utf8");
};
const writeJson = (dir, name, value) => fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
const makeDir = (slug) => { const dir = path.join(root, slug); fs.mkdirSync(dir, { recursive: true }); return dir; };

{
  const dir = makeDir("diagnostico-atendimento");
  const clients = Array.from({ length: 80 }, (_, index) => ({ cliente_id: `C${pad(index + 1)}`, segmento: pick(["PME", "Enterprise", "Pessoa física"]), cidade: pick(["Eunápolis", "Porto Seguro", "Itabuna", "Salvador"]), desde: date("2024-01-01", Math.floor(rng() * 700)) }));
  const agents = Array.from({ length: 12 }, (_, index) => ({ agente_id: `A${pad(index + 1)}`, equipe: pick(["Suporte 1", "Suporte 2", "Financeiro"]), turno: pick(["manhã", "tarde", "noite"]), experiencia_meses: 2 + Math.floor(rng() * 48) }));
  const tickets = Array.from({ length: 420 }, (_, index) => { const opened = date("2026-01-01", Math.floor(rng() * 210)); const minutes = 15 + Math.floor(rng() * 4200); return { ticket_id: index === 97 ? "T00097" : `T${String(index + 1).padStart(5, "0")}`, cliente_id: pick(clients).cliente_id, agente_id: rng() < .04 ? "A99" : pick(agents).agente_id, aberto_em: index % 89 === 0 ? "" : opened, canal: pick(["whatsapp", "WhatsApp", "email", "chat", "telefone"]), categoria: pick(["Cobrança", "cobranca", "Acesso", "Erro técnico", "Outros"]), prioridade: pick(["baixa", "media", "alta"]), status: pick(["resolvido", "fechado", "aberto"]), primeira_resposta_min: Math.floor(minutes * (.05 + rng() * .25)), resolucao_min: minutes } });
  const ratings = tickets.filter(() => rng() < .58).map((ticket) => ({ ticket_id: ticket.ticket_id, nota: 1 + Math.floor(rng() * 5), comentario: pick(["Resolveu rápido", "Demorou para responder", "Atendimento claro", "Problema voltou", "Sem comentário"]) }));
  writeCsv(dir, "clientes.csv", clients); writeCsv(dir, "agentes.csv", agents); writeCsv(dir, "tickets.csv", tickets); writeCsv(dir, "avaliacoes.csv", ratings);
  writeCsv(dir, "dicionario.csv", [{ tabela: "tickets", campo: "ticket_id", tipo: "texto", regra: "chave única" }, { tabela: "tickets", campo: "resolucao_min", tipo: "inteiro", regra: ">= primeira_resposta_min" }, { tabela: "avaliacoes", campo: "nota", tipo: "inteiro", regra: "1 a 5" }]);
}

{
  const dir = makeDir("painel-estoque");
  const products = Array.from({ length: 60 }, (_, index) => ({ produto_id: `P${String(index + 1).padStart(4, "0")}`, produto: `Produto ${index + 1}`, categoria: pick(["Eletrônicos", "Casa", "Escritório", "Acessórios"]), custo_unitario: (8 + rng() * 240).toFixed(2), lead_time_dias: 2 + Math.floor(rng() * 28), estoque_minimo: 5 + Math.floor(rng() * 30) }));
  const branches = ["EUN", "SSA", "ITB"].map((id, index) => ({ filial_id: id, filial: ["Eunápolis", "Salvador", "Itabuna"][index], regiao: "Bahia" }));
  const sales = Array.from({ length: 1200 }, (_, index) => { const product = pick(products); return { venda_id: `V${String(index + 1).padStart(6, "0")}`, data: date("2026-01-01", Math.floor(rng() * 240)), produto_id: product.produto_id, filial_id: pick(branches).filial_id, quantidade: 1 + Math.floor(rng() * 8), preco_unitario: (Number(product.custo_unitario) * (1.3 + rng() * .8)).toFixed(2) }; });
  const moves = sales.map((sale, index) => ({ movimento_id: `M${String(index + 1).padStart(6, "0")}`, data: sale.data, produto_id: sale.produto_id, filial_id: sale.filial_id, tipo: "saida", quantidade: index % 173 === 0 ? sale.quantidade * -1 : sale.quantidade }));
  for (let index = 0; index < 300; index += 1) moves.push({ movimento_id: `E${String(index + 1).padStart(6, "0")}`, data: date("2026-01-01", Math.floor(rng() * 240)), produto_id: pick(products).produto_id, filial_id: pick(branches).filial_id, tipo: pick(["entrada", "ajuste", "devolucao"]), quantidade: 5 + Math.floor(rng() * 80) });
  const orders = Array.from({ length: 180 }, (_, index) => ({ pedido_id: `PC${String(index + 1).padStart(5, "0")}`, produto_id: pick(products).produto_id, filial_id: pick(branches).filial_id, pedido_em: date("2026-05-01", Math.floor(rng() * 120)), previsao_chegada: date("2026-05-05", Math.floor(rng() * 140)), quantidade: 10 + Math.floor(rng() * 100), status: pick(["recebido", "em trânsito", "atrasado", "cancelado"]) }));
  writeCsv(dir, "produtos.csv", products); writeCsv(dir, "filiais.csv", branches); writeCsv(dir, "vendas.csv", sales); writeCsv(dir, "movimentacoes.csv", moves); writeCsv(dir, "pedidos_compra.csv", orders);
}

{
  const dir = makeDir("risco-credito");
  const applicants = Array.from({ length: 900 }, (_, index) => ({ solicitante_id: `S${String(index + 1).padStart(5, "0")}`, idade: 18 + Math.floor(rng() * 53), renda_mensal: Math.round(1400 + rng() * 14800), vinculo: pick(["CLT", "Autônomo", "Servidor", "Empresário"]), tempo_emprego_meses: Math.floor(rng() * 180), dependentes: Math.floor(rng() * 5), regiao: pick(["Nordeste", "Sudeste", "Sul", "Centro-Oeste", "Norte"]) }));
  const contracts = applicants.map((person, index) => ({ contrato_id: `L${String(index + 1).padStart(5, "0")}`, solicitante_id: person.solicitante_id, data_contrato: date("2024-01-01", Math.floor(rng() * 600)), valor: Math.round(500 + rng() * 30000), prazo_meses: pick([6, 12, 18, 24, 36]), taxa_mensal: (1.2 + rng() * 5).toFixed(2), produto: pick(["Pessoal", "Consignado", "Capital de giro"]) }));
  const payments = contracts.flatMap((contract) => Array.from({ length: 8 }, (_, month) => ({ contrato_id: contract.contrato_id, parcela: month + 1, vencimento: date(contract.data_contrato, 30 * (month + 1)), dias_atraso: rng() < .16 ? Math.floor(rng() * 75) : 0, valor_pago: Math.round((contract.valor / contract.prazo_meses) * (.9 + rng() * .2)) })));
  const targets = contracts.map((contract) => { const person = applicants.find((item) => item.solicitante_id === contract.solicitante_id); const ratio = contract.valor / (person.renda_mensal * 10); return { contrato_id: contract.contrato_id, inadimplente_90d: rng() < Math.min(.65, .05 + ratio * .28) ? 1 : 0 }; });
  writeCsv(dir, "solicitantes.csv", applicants); writeCsv(dir, "contratos.csv", contracts); writeCsv(dir, "historico_pagamentos.csv", payments); writeCsv(dir, "alvo_inadimplencia.csv", targets);
  writeCsv(dir, "dicionario.csv", [{ campo: "inadimplente_90d", uso: "alvo", alerta: "não usar no treino como feature" }, { campo: "dias_atraso", uso: "histórico", alerta: "cortar antes da janela do alvo" }]);
}

{
  const dir = makeDir("previsao-atendimento");
  const events = [{ data: "2026-03-15", evento: "campanha", intensidade: 2 }, { data: "2026-06-24", evento: "feriado", intensidade: -1 }, { data: "2026-11-25", evento: "black_friday", intensidade: 3 }];
  const volume = Array.from({ length: 730 }, (_, index) => { const current = new Date(`${date("2025-01-01", index)}T12:00:00Z`); const weekly = [35, 82, 78, 75, 80, 95, 28][current.getUTCDay()]; const trend = index * .035; const campaign = events.some((event) => event.data === date("2025-01-01", index)) ? 80 : 0; return { data: date("2025-01-01", index), canal: "total", volume: Math.max(10, Math.round(weekly + trend + campaign + (rng() - .5) * 24)), tempo_medio_min: (6 + rng() * 8).toFixed(1) }; });
  const capacity = Array.from({ length: 104 }, (_, index) => ({ semana_inicio: date("2025-01-06", index * 7), agentes_planejados: 8 + Math.floor(rng() * 6), horas_produtivas_por_agente: (27 + rng() * 8).toFixed(1), absenteismo_pct: (2 + rng() * 10).toFixed(1) }));
  writeCsv(dir, "volume_diario.csv", volume); writeCsv(dir, "calendario_eventos.csv", events); writeCsv(dir, "capacidade_equipe.csv", capacity);
}

{
  const dir = makeDir("api-churn");
  const customers = Array.from({ length: 700 }, (_, index) => ({ cliente_id: `C${String(index + 1).padStart(5, "0")}`, segmento: pick(["individual", "PME"]), estado: pick(["BA", "SP", "MG", "PR", "PE"]), meses_cliente: 1 + Math.floor(rng() * 60) }));
  const subscriptions = customers.map((client) => ({ cliente_id: client.cliente_id, plano: pick(["Básico", "Pro", "Equipe"]), mensalidade: pick([39, 79, 149]), desconto_pct: pick([0, 0, 0, 10, 20]), suporte_chamados_90d: Math.floor(rng() * 9) }));
  const usage = customers.flatMap((client) => Array.from({ length: 6 }, (_, month) => ({ cliente_id: client.cliente_id, mes: `2026-${pad(month + 1)}`, logins: Math.floor(rng() * 45), acoes: Math.floor(rng() * 500), dias_ativos: Math.floor(rng() * 28) })));
  const targets = customers.map((client) => { const recent = usage.filter((item) => item.cliente_id === client.cliente_id).at(-1); return { cliente_id: client.cliente_id, churn_60d: rng() < (.08 + (recent.logins < 5 ? .32 : 0)) ? 1 : 0 }; });
  writeCsv(dir, "clientes.csv", customers); writeCsv(dir, "assinaturas.csv", subscriptions); writeCsv(dir, "uso_mensal.csv", usage); writeCsv(dir, "alvo_churn.csv", targets);
  writeJson(dir, "contrato_api.json", { version: "1.0", request: { plano: "string", meses_cliente: "integer", logins_30d: "integer", dias_ativos_30d: "integer" }, response: { risco: "number 0..1", faixa: "baixa|media|alta", model_version: "string" } });
  writeJson(dir, "casos_teste.json", [{ name: "válido", input: { plano: "Pro", meses_cliente: 14, logins_30d: 18, dias_ativos_30d: 12 }, expected_status: 200 }, { name: "campo inválido", input: { plano: "Pro", meses_cliente: -1 }, expected_status: 422 }]);
}

{
  const dir = makeDir("inteligencia-avaliacoes");
  const products = Array.from({ length: 25 }, (_, index) => ({ produto_id: `P${pad(index + 1)}`, produto: `Produto ${index + 1}`, categoria: pick(["Software", "Curso", "Serviço"] ) }));
  const texts = ["O atendimento demorou muito", "Produto fácil de usar", "Cobrança veio duplicada", "Não consegui acessar minha conta", "A entrega foi rápida", "O recurso trava no celular", "Suporte resolveu no mesmo dia", "Preço aumentou sem explicação", "Gostei da qualidade", "Cancelamento foi confuso"];
  const reviews = Array.from({ length: 1200 }, (_, index) => { const text = pick(texts); return { avaliacao_id: `R${String(index + 1).padStart(6, "0")}`, data: date("2025-01-01", Math.floor(rng() * 600)), produto_id: pick(products).produto_id, nota: text.includes("Gostei") || text.includes("fácil") || text.includes("rápida") || text.includes("resolveu") ? pick([4, 5]) : pick([1, 2, 3]), texto: text }; });
  const taxonomy = [{ tema: "atendimento", criterio: "tempo, clareza ou resolução pelo suporte" }, { tema: "cobranca", criterio: "preço, cobrança, reembolso ou duplicidade" }, { tema: "acesso", criterio: "login, conta ou autenticação" }, { tema: "produto", criterio: "qualidade, erro, travamento ou usabilidade" }, { tema: "outro", criterio: "não se encaixa com segurança" }];
  const annotated = reviews.slice(0, 180).map((review) => ({ ...review, tema_referencia: review.texto.includes("atend") || review.texto.includes("Suporte") ? "atendimento" : review.texto.includes("Cobrança") || review.texto.includes("Preço") ? "cobranca" : review.texto.includes("acessar") ? "acesso" : "produto" }));
  writeCsv(dir, "avaliacoes.csv", reviews); writeCsv(dir, "produtos.csv", products); writeCsv(dir, "taxonomia.csv", taxonomy); writeCsv(dir, "amostra_anotada.csv", annotated);
  writeJson(dir, "casos_avaliacao.json", [{ id: "amb-1", texto: "O suporte resolveu, mas a cobrança continua errada", esperado: ["atendimento", "cobranca"] }, { id: "fora-1", texto: "Vi o anúncio ontem", esperado: ["outro"] }]);
}

console.log("Bases sintéticas geradas em", root);
