import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ordenarHistoricoCobrancas, mensalidadeParaHistorico, aulaAvulsaParaHistorico,
  type CobrancaHistorico,
} from "@/lib/arena-cobranca";

describe("mensalidadeParaHistorico", () => {
  test("mapeia status_pagamento pago/estornado/cancelado/pendente corretamente", () => {
    const base = { id: "c1", competencia: "2026-08", valor: 150 };
    assert.equal(mensalidadeParaHistorico({ ...base, status_pagamento: "pago" }).status, "pago");
    assert.equal(mensalidadeParaHistorico({ ...base, status_pagamento: "estornado" }).status, "estornado");
    assert.equal(mensalidadeParaHistorico({ ...base, status_pagamento: "cancelado" }).status, "cancelado");
    assert.equal(mensalidadeParaHistorico({ ...base, status_pagamento: "pendente" }).status, "pendente");
  });

  test("categoria é sempre mensalidade e a data usa o primeiro dia da competência", () => {
    const item = mensalidadeParaHistorico({ id: "c1", competencia: "2026-08", valor: 150, status_pagamento: "pago" });
    assert.equal(item.categoria, "mensalidade");
    assert.equal(item.data, "2026-08-01");
    assert.equal(item.valor, 150);
  });
});

describe("aulaAvulsaParaHistorico", () => {
  test("mapeia pagamento_status pago/processando/falhou/pendente corretamente", () => {
    const base = { id: "a1", data: "2026-08-10", titulo: "Treino técnico", valor_avulso: 55 };
    assert.equal(aulaAvulsaParaHistorico({ ...base, pagamento_status: "pago" }).status, "pago");
    assert.equal(aulaAvulsaParaHistorico({ ...base, pagamento_status: "processando" }).status, "processando");
    assert.equal(aulaAvulsaParaHistorico({ ...base, pagamento_status: "falhou" }).status, "falhou");
    assert.equal(aulaAvulsaParaHistorico({ ...base, pagamento_status: "pendente" }).status, "pendente");
  });

  test("categoria é sempre aula_avulsa e a descrição inclui o título da aula", () => {
    const item = aulaAvulsaParaHistorico({ id: "a1", data: "2026-08-10", titulo: "Treino técnico", valor_avulso: 55, pagamento_status: "pago" });
    assert.equal(item.categoria, "aula_avulsa");
    assert.match(item.descricao, /Treino técnico/);
  });

  test("valor_avulso nulo (dado inconsistente) não quebra — valor vira 0", () => {
    const item = aulaAvulsaParaHistorico({ id: "a1", data: "2026-08-10", titulo: "X", valor_avulso: null, pagamento_status: "pendente" });
    assert.equal(item.valor, 0);
  });
});

describe("ordenarHistoricoCobrancas", () => {
  function item(id: string, data: string): CobrancaHistorico {
    return { id, data, descricao: id, valor: 10, status: "pago", categoria: "mensalidade" };
  }

  test("ordena do mais recente pro mais antigo, misturando mensalidade e aula avulsa", () => {
    const itens = [item("a", "2026-08-01"), item("b", "2026-08-15"), item("c", "2026-07-20")];
    assert.deepEqual(ordenarHistoricoCobrancas(itens).map((i) => i.id), ["b", "a", "c"]);
  });

  test("não muta o array original", () => {
    const itens = [item("a", "2026-08-01"), item("b", "2026-08-15")];
    const original = itens.map((i) => i.id);
    ordenarHistoricoCobrancas(itens);
    assert.deepEqual(itens.map((i) => i.id), original);
  });
});
