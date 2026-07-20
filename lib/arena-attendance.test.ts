import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  valorAvulsaComTaxa, temAcessoAoPlano, estadoPlanoAluno, interpretarErroRpc,
} from "@/lib/arena-attendance";
import { validarIntervaloHorario, horarioLabel } from "@/lib/arena-dates";

describe("validarIntervaloHorario (cadastro de aulas)", () => {
  test("início e fim vazios é válido (aula sem horário fixo)", () => {
    assert.equal(validarIntervaloHorario("", ""), null);
  });

  test("início e fim preenchidos com fim depois do início é válido", () => {
    assert.equal(validarIntervaloHorario("19:00", "20:00"), null);
  });

  test("fim igual ao início é inválido (duração zero)", () => {
    assert.ok(validarIntervaloHorario("19:00", "19:00"));
  });

  test("fim antes do início é inválido", () => {
    assert.ok(validarIntervaloHorario("20:00", "19:00"));
  });

  test("só o início preenchido é inválido", () => {
    assert.ok(validarIntervaloHorario("19:00", ""));
  });

  test("só o fim preenchido é inválido", () => {
    assert.ok(validarIntervaloHorario("", "20:00"));
  });
});

describe("horarioLabel (exibição HH:mm - HH:mm)", () => {
  test("formata início e fim juntos", () => {
    assert.equal(horarioLabel("19:00", "20:30"), "19:00 - 20:30");
  });
  test("sem hora_fim salva (dado legado) mostra só o início", () => {
    assert.equal(horarioLabel("19:00", null), "19:00");
  });
  test("sem horário nenhum retorna null (aula sem horário fixo)", () => {
    assert.equal(horarioLabel(null, null), null);
  });
});

describe("valorAvulsaComTaxa (10% de taxa de serviço, igual mensalidade/aluguel/diária)", () => {
  test("soma 10% e arredonda pra 2 casas", () => {
    assert.equal(valorAvulsaComTaxa(50), 55);
    assert.equal(valorAvulsaComTaxa(49.9), 54.89);
  });
  test("valor zero continua zero", () => {
    assert.equal(valorAvulsaComTaxa(0), 0);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Acesso ao plano — separado do estado ao vivo do plano (fluxo financeiro
// da arena: plano arquivado/reprecificado nunca tira, na hora, um acesso
// já pago).
// ═════════════════════════════════════════════════════════════════════════

describe("temAcessoAoPlano", () => {
  test("sem plan_id nunca tem acesso, mesmo com accessUntil no futuro", () => {
    assert.equal(temAcessoAoPlano({ planId: null, accessUntil: "2026-12-31", hoje: "2026-08-01" }), false);
  });

  test("accessUntil nulo (legado ou plano gratuito) é liberado enquanto tiver plan_id", () => {
    assert.equal(temAcessoAoPlano({ planId: "p1", accessUntil: null, hoje: "2026-08-01" }), true);
  });

  test("accessUntil no futuro tem acesso; no passado, não", () => {
    assert.equal(temAcessoAoPlano({ planId: "p1", accessUntil: "2026-08-20", hoje: "2026-08-10" }), true);
    assert.equal(temAcessoAoPlano({ planId: "p1", accessUntil: "2026-08-05", hoje: "2026-08-10" }), false);
  });

  test("accessUntil igual a hoje ainda é válido (inclusivo)", () => {
    assert.equal(temAcessoAoPlano({ planId: "p1", accessUntil: "2026-08-10", hoje: "2026-08-10" }), true);
  });
});

describe("estadoPlanoAluno — exemplo obrigatório (pagou 20/07 até 20/08, plano alterado/excluído em 25/07)", () => {
  const accessUntil = "2026-08-20"; // pago até aqui, pouco importa se foi mensalidade paga em 20/07

  test("antes da mudança do plano: renovação ativa + dentro do período = 'ativo'", () => {
    const estado = estadoPlanoAluno({ planId: "p1", renovacaoAtiva: true, accessUntil, hoje: "2026-07-22" });
    assert.deepEqual(estado, { estado: "ativo" });
  });

  test("em 25/07, o organizador reprecifica/exclui o plano: renovação para, mas o acesso pago continua até 20/08", () => {
    const estado = estadoPlanoAluno({ planId: "p1", renovacaoAtiva: false, accessUntil, hoje: "2026-07-25" });
    assert.deepEqual(estado, { estado: "encerrado_com_acesso", accessUntil: "2026-08-20" });
  });

  test("ainda em 20/08 (último dia pago), o acesso continua válido", () => {
    const estado = estadoPlanoAluno({ planId: "p1", renovacaoAtiva: false, accessUntil, hoje: "2026-08-20" });
    assert.deepEqual(estado, { estado: "encerrado_com_acesso", accessUntil: "2026-08-20" });
    // e temAcessoAoPlano concorda: ainda pode usar créditos/marcar presença
    assert.equal(temAcessoAoPlano({ planId: "p1", accessUntil, hoje: "2026-08-20" }), true);
  });

  test("a partir de 21/08, o aluno fica sem plano", () => {
    const estado = estadoPlanoAluno({ planId: "p1", renovacaoAtiva: false, accessUntil, hoje: "2026-08-21" });
    assert.deepEqual(estado, { estado: "encerrado_sem_acesso", accessUntil: "2026-08-20" });
    assert.equal(temAcessoAoPlano({ planId: "p1", accessUntil, hoje: "2026-08-21" }), false);
  });

  test("sem plan_id nenhum: 'sem_plano', independente de qualquer outro campo", () => {
    assert.deepEqual(
      estadoPlanoAluno({ planId: null, renovacaoAtiva: true, accessUntil: "2026-12-31", hoje: "2026-08-01" }),
      { estado: "sem_plano" },
    );
  });

  test("renovação ainda ativa mas accessUntil já passou (pagamento não confirmou a tempo): 'encerrado_sem_acesso', não 'ativo'", () => {
    const estado = estadoPlanoAluno({ planId: "p1", renovacaoAtiva: true, accessUntil: "2026-08-01", hoje: "2026-08-10" });
    assert.deepEqual(estado, { estado: "encerrado_sem_acesso", accessUntil: "2026-08-01" });
  });
});

describe("interpretarErroRpc (traduz RAISE EXCEPTION de arena_confirm_attendance/arena_cancel_attendance)", () => {
  test("PERFIL_SEM_GENERO vira o código, pra UI mostrar o link de completar perfil", () => {
    assert.equal(interpretarErroRpc("PERFIL_SEM_GENERO").mensagem, "PERFIL_SEM_GENERO");
  });

  test("GENERO_INCOMPATIVEL:masculino vira mensagem legível com o gênero certo", () => {
    const r = interpretarErroRpc("GENERO_INCOMPATIVEL:masculino");
    assert.match(r.mensagem, /gênero masculino/);
  });

  test("GENERO_INCOMPATIVEL:feminino vira mensagem legível com o gênero certo", () => {
    const r = interpretarErroRpc("GENERO_INCOMPATIVEL:feminino");
    assert.match(r.mensagem, /gênero feminino/);
  });

  test("AVULSA_PREVIEW:55.00 preserva o valor separado da mensagem (pro preview de preço)", () => {
    const r = interpretarErroRpc("AVULSA_PREVIEW:55.00");
    assert.equal(r.codigo, "AVULSA_PREVIEW");
    assert.equal(r.valor, "55.00");
  });

  test("AULA_LOTADA vira mensagem amigável", () => {
    assert.equal(interpretarErroRpc("AULA_LOTADA").mensagem, "Essa aula já está lotada.");
  });

  test("PRAZO_EXPIRADO:3 usa o número de horas configurado pela arena na mensagem", () => {
    assert.match(interpretarErroRpc("PRAZO_EXPIRADO:3").mensagem, /3h antes da aula/);
  });

  test("CARTAO_NECESSARIO vira o código, pra UI linkar pro Financeiro", () => {
    assert.equal(interpretarErroRpc("CARTAO_NECESSARIO").mensagem, "CARTAO_NECESSARIO");
  });

  test("mensagem de prosa sem prefixo de código passa direto (já vem em português da própria função)", () => {
    assert.equal(interpretarErroRpc("Essa aula não acontece nesse dia.").mensagem, "Essa aula não acontece nesse dia.");
  });

  test("string vazia (erro sem mensagem) cai no texto genérico", () => {
    assert.equal(interpretarErroRpc("").mensagem, "Erro ao confirmar presença. Tente novamente.");
  });
});
