import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isEligibleOpportunityVideo,
  median,
  rankOpportunityVideos,
  type OpportunityVideoInput,
} from "./opportunity-ranking";

const video = (
  channel: string,
  id: string,
  title: string,
  views: number,
  publishedText = "há 2 semanas",
): OpportunityVideoInput => ({
  id,
  channel,
  title,
  originalTitle: title,
  url: `https://youtube.com/watch?v=${id}`,
  thumbnail: "https://i.ytimg.com/example.jpg",
  thumbnailUrl: null,
  views,
  durationSeconds: 900,
  publishedAt: null,
  publishedText,
  observedAt: "2026-10-24T12:00:00.000Z",
});

describe("ranking editorial de oportunidade", () => {
  test("calcula a mediana sem deixar um único viral distorcer a base", () => {
    assert.equal(median([1_000, 2_000, 3_000, 100_000]), 2_500);
  });

  test("exclui podcasts e entrevistas do ranking principal", () => {
    const podcast = video("Canal", "p1", "PODCAST: como usar IA no trabalho", 1_000_000);
    const interview = video("Canal", "p2", "Entrevista sobre produtividade e IA", 900_000);
    assert.equal(isEligibleOpportunityVideo(podcast), false);
    assert.equal(isEligibleOpportunityVideo(interview), false);
  });

  test("favorece o desempenho relativo, não apenas o maior número bruto", () => {
    const videos = [
      video("Canal grande", "g1", "Como usar IA no trabalho", 1_000_000),
      video("Canal grande", "g2", "Tutorial de ChatGPT para produtividade", 900_000),
      video("Canal grande", "g3", "Sistema de foco com inteligência artificial", 1_100_000),
      video("Canal pequeno", "p1", "Como criei um sistema de foco com IA", 100_000),
      video("Canal pequeno", "p2", "Rotina de produtividade com ChatGPT", 5_000),
      video("Canal pequeno", "p3", "Aprenda inteligência artificial no trabalho", 4_000),
    ];
    const [first] = rankOpportunityVideos(videos, { limit: 6, perChannel: 3, now: new Date("2026-10-24") });
    assert.equal(first.id, "p1");
    assert.ok(first.relativePerformanceMultiple > 10);
  });

  test("limita a seleção a três vídeos por canal e expõe nota de 0 a 100", () => {
    const videos = Array.from({ length: 6 }, (_, index) =>
      video("Mesmo canal", `a${index}`, `Como usar IA para produtividade ${index + 1}`, 50_000 + index * 10_000),
    ).concat([
      video("Outro canal", "b1", "Como organizar trabalho e estudos com IA", 40_000),
      video("Terceiro canal", "c1", "Sistema prático de foco com ChatGPT", 30_000),
    ]);
    const ranked = rankOpportunityVideos(videos, { limit: 8, perChannel: 3, now: new Date("2026-10-24") });
    assert.equal(ranked.filter((item) => item.channel === "Mesmo canal").length, 3);
    assert.ok(ranked.every((item) => item.opportunityScore >= 0 && item.opportunityScore <= 100));
  });

  test("compõe o top 15 com dez pautas de IA aplicada, quatro de evolução e uma notícia", () => {
    const applied = Array.from({ length: 12 }, (_, index) =>
      video(`IA ${index}`, `ia${index}`, `Como usar ChatGPT para criar resultados em ${index + 1} minutos`, 50_000 + index * 1_000),
    );
    const growth = Array.from({ length: 6 }, (_, index) =>
      video(`Crescimento ${index}`, `g${index}`, `Sistema de produtividade e carreira ${index + 1}`, 40_000 + index * 1_000),
    );
    const news = Array.from({ length: 3 }, (_, index) =>
      video(`Notícia ${index}`, `n${index}`, `Notícia: novo lançamento mudou o mercado ${index + 1}`, 30_000 + index * 1_000),
    );

    const ranked = rankOpportunityVideos([...applied, ...growth, ...news], {
      limit: 15,
      perChannel: 3,
      now: new Date("2026-10-30"),
    });

    assert.equal(ranked.filter((item) => item.editorialPillar === "ai_applied").length, 10);
    assert.equal(ranked.filter((item) => item.editorialPillar === "growth_systems").length, 4);
    assert.equal(ranked.filter((item) => item.editorialPillar === "news").length, 1);
    assert.ok(ranked.every((item) => item.breakdown.promiseBenefit >= 0));
    assert.ok(ranked.every((item) => item.breakdown.longevity >= 0));
  });
});
