import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dowOfISO, addDaysISO, addMonthsISO, addYearsISO, weekRangeISO,
  startOfMonthISO, endOfMonthISO, startOfYearISO, endOfYearISO,
  monthMatrixISO, addMinutesToTime, generateOccurrences, classeCombinaComFiltro,
  type ArenaClassRow,
} from "./arena-dates";

describe("dowOfISO", () => {
  it("domingo = 0, segunda = 1 ... sábado = 6", () => {
    assert.equal(dowOfISO("2026-07-12"), 0); // domingo
    assert.equal(dowOfISO("2026-07-13"), 1); // segunda
    assert.equal(dowOfISO("2026-07-18"), 6); // sábado
  });
});

describe("addDaysISO", () => {
  it("vira o mês corretamente", () => {
    assert.equal(addDaysISO("2026-07-31", 1), "2026-08-01");
  });
  it("vira o ano corretamente", () => {
    assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
  });
  it("ano bissexto inclui 29 de fevereiro", () => {
    assert.equal(addDaysISO("2028-02-28", 1), "2028-02-29");
    assert.equal(addDaysISO("2028-02-29", 1), "2028-03-01");
  });
  it("ano não-bissexto pula direto pra março", () => {
    assert.equal(addDaysISO("2026-02-28", 1), "2026-03-01");
  });
  it("aceita deslocamento negativo", () => {
    assert.equal(addDaysISO("2026-01-01", -1), "2025-12-31");
  });
});

describe("addMonthsISO", () => {
  it("preserva o dia quando o mês de destino tem dias suficientes", () => {
    assert.equal(addMonthsISO("2026-01-15", 1), "2026-02-15");
  });
  it("faz clamp no fim do mês (31 jan -> fev)", () => {
    assert.equal(addMonthsISO("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonthsISO("2028-01-31", 1), "2028-02-29"); // bissexto
  });
  it("vira o ano ao somar meses", () => {
    assert.equal(addMonthsISO("2026-11-15", 2), "2027-01-15");
  });
  it("aceita retrocesso", () => {
    assert.equal(addMonthsISO("2026-01-15", -1), "2025-12-15");
  });
});

describe("addYearsISO", () => {
  it("mantém dia 29/fev só quando o ano de destino também é bissexto", () => {
    assert.equal(addYearsISO("2028-02-29", 4), "2032-02-29");
    assert.equal(addYearsISO("2028-02-29", 1), "2029-02-28");
  });
});

describe("weekRangeISO — semana sempre segunda a domingo", () => {
  it("uma segunda-feira é o início da própria semana", () => {
    const { start, end } = weekRangeISO("2026-07-13"); // segunda
    assert.equal(start, "2026-07-13");
    assert.equal(end, "2026-07-19");
  });
  it("um domingo é o fim da semana que começou na segunda anterior", () => {
    const { start, end } = weekRangeISO("2026-07-19"); // domingo
    assert.equal(start, "2026-07-13");
    assert.equal(end, "2026-07-19");
  });
  it("semana que atravessa a virada do mês", () => {
    const { start, end } = weekRangeISO("2026-08-01"); // sábado
    assert.equal(start, "2026-07-27");
    assert.equal(end, "2026-08-02");
  });
  it("semana que atravessa a virada do ano", () => {
    const { start, end } = weekRangeISO("2026-12-31"); // quinta
    assert.equal(start, "2026-12-28");
    assert.equal(end, "2027-01-03");
  });
});

describe("limites de mês e ano", () => {
  it("startOfMonthISO / endOfMonthISO", () => {
    assert.equal(startOfMonthISO("2026-02-17"), "2026-02-01");
    assert.equal(endOfMonthISO("2026-02-17"), "2026-02-28");
    assert.equal(endOfMonthISO("2028-02-17"), "2028-02-29"); // bissexto
  });
  it("startOfYearISO / endOfYearISO", () => {
    assert.equal(startOfYearISO("2026-07-12"), "2026-01-01");
    assert.equal(endOfYearISO("2026-07-12"), "2026-12-31");
  });
});

describe("monthMatrixISO", () => {
  it("gera 6 semanas de 7 dias, começando na segunda", () => {
    const weeks = monthMatrixISO("2026-07-12");
    assert.equal(weeks.length, 6);
    for (const w of weeks) assert.equal(w.length, 7);
    for (const w of weeks) assert.equal(dowOfISO(w[0]), 1); // segunda
  });
  it("cobre o mês inteiro de julho de 2026", () => {
    const weeks = monthMatrixISO("2026-07-01");
    const flat = weeks.flat();
    assert.ok(flat.includes("2026-07-01"));
    assert.ok(flat.includes("2026-07-31"));
  });
});

describe("addMinutesToTime", () => {
  it("soma minutos dentro do mesmo dia", () => {
    assert.equal(addMinutesToTime("09:00", 60), "10:00");
    assert.equal(addMinutesToTime("09:15", 45), "10:00");
  });
  it("faz wrap ao virar meia-noite", () => {
    assert.equal(addMinutesToTime("23:30", 60), "00:30");
  });
});

describe("classeCombinaComFiltro", () => {
  it("todos aceita qualquer nível, incluindo nulo", () => {
    assert.equal(classeCombinaComFiltro(null, "todos"), true);
    assert.equal(classeCombinaComFiltro("avancado", "todos"), true);
  });
  it("sem_categoria só aceita nível nulo", () => {
    assert.equal(classeCombinaComFiltro(null, "sem_categoria"), true);
    assert.equal(classeCombinaComFiltro("iniciante", "sem_categoria"), false);
  });
  it("filtro específico exige nível igual", () => {
    assert.equal(classeCombinaComFiltro("iniciante", "iniciante"), true);
    assert.equal(classeCombinaComFiltro("avancado", "iniciante"), false);
  });
});

describe("generateOccurrences", () => {
  const classes: ArenaClassRow[] = [
    { id: "a", titulo: "Treino técnico", horario: "19:00", duracaoMinutos: 60, diasSemana: [1, 3], nivel: "iniciante", maxAlunos: 10, ativo: true },
    { id: "b", titulo: "Aula livre", horario: "07:00", duracaoMinutos: 90, diasSemana: [0, 6], nivel: null, maxAlunos: null, ativo: true },
    { id: "c", titulo: "Inativa", horario: "08:00", duracaoMinutos: 60, diasSemana: [1], nivel: null, maxAlunos: null, ativo: false },
  ];

  it("gera só ocorrências dentro do intervalo pedido, ignorando aulas inativas", () => {
    const occ = generateOccurrences(classes, "2026-07-13", "2026-07-19"); // seg a dom
    assert.equal(occ.every((o) => o.classId !== "c"), true);
    // seg (13) e qua (15) pra "a"; sáb (18) e dom (19) pra "b"
    assert.deepEqual(occ.map((o) => o.date).sort(), ["2026-07-13", "2026-07-15", "2026-07-18", "2026-07-19"]);
  });

  it("calcula hora de fim a partir da duração", () => {
    const occ = generateOccurrences(classes, "2026-07-13", "2026-07-13");
    assert.equal(occ[0].horaInicio, "19:00");
    assert.equal(occ[0].horaFim, "20:00");
  });

  it("intervalo invertido não gera nada e não trava", () => {
    assert.deepEqual(generateOccurrences(classes, "2026-07-19", "2026-07-13"), []);
  });

  it("ordena por data e depois por horário", () => {
    const occ = generateOccurrences(classes, "2026-07-13", "2026-07-19");
    const sorted = [...occ].sort((a, b) => (a.date === b.date ? (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "") : a.date.localeCompare(b.date)));
    assert.deepEqual(occ, sorted);
  });
});
