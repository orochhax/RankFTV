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
): OpportunityVideoInput => ({
  id,
  channel,
  title,
  originalTitle: title,
  url: `https://youtube.com/watch?v=${id}`,
  thumbnail: "https://i.ytimg.com/example.jpg",
  thumbnailUrl: null,
  views,
  likes: Math.round(views * 0.045),
  comments: Math.round(views * 0.002),
  durationSeconds: 900,
  publishedAt: "2026-10-10T12:00:00.000Z",
  publishedText: "há 2 semanas",
  observedAt: "2026-10-24T12:00:00.000Z",
});

describe("ranking editorial de oportunidade em 5 camadas", () => {
  test("calcula a mediana sem deixar um único viral distorcer a base", () => {
    assert.equal(median([1_000, 2_000, 3_000, 100_000]), 2_500);
  });

  test("exclui podcasts, entrevistas e vlogs pessoais sem método replicável", () => {
    const podcast = video("Canal", "p1", "PODCAST: como usar IA no trabalho", 1_000_000);
    const interview = video("Canal", "p2", "Entrevista sobre produtividade e IA", 900_000);
    const personalFlex = video("Canal", "p3", "I bought a $75,000,000 business and here is why", 800_000);
    assert.equal(isEligibleOpportunityVideo(podcast), false);
    assert.equal(isEligibleOpportunityVideo(interview), false);
    assert.equal(isEligibleOpportunityVideo(personalFlex), false);
  });

  test("combina explosão no canal com escala de audiência para destacar outliers reais", () => {
    const videos = [
      video("Canal grande", "g1", "Como usar IA no trabalho", 300_000),
      video("Canal grande", "g2", "Tutorial de ChatGPT para produtividade", 290_000),
      video("Canal grande", "g3", "Sistema de foco com inteligência artificial", 310_000),
      video("Canal pequeno", "p1", "Como criei um sistema de vendas com Claude Code", 180_000),
      video("Canal pequeno", "p2", "Rotina de produtividade com ChatGPT", 5_000),
      video("Canal pequeno", "p3", "Aprenda inteligência artificial no trabalho", 4_000),
    ];
    const ranked = rankOpportunityVideos(videos, { limit: 6, perChannel: 3, now: new Date("2026-10-24") });
    const smallOutlier = ranked.find((item) => item.id === "p1");
    const averageLargeVideo = ranked.find((item) => item.id === "g1");
    assert.ok(smallOutlier && averageLargeVideo);
    assert.ok(smallOutlier.relativePerformanceMultiple > 15);
    assert.ok(smallOutlier.opportunityScore > averageLargeVideo.opportunityScore);
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

  test("compõe a nota pelas 5 camadas (32/26/22/10/10) e prioriza a stack até R$ 200/mês", () => {
    const coreStack = video(
      "Canal A",
      "claude-hit",
      "Give Me 26 minutes, I'll Give You 10,000 hours of Claude Knowledge",
      1_850_000,
    );
    const baselineA1 = video("Canal A", "base-a1", "How to use AI for productivity", 300_000);
    const baselineA2 = video("Canal A", "base-a2", "How to build AI workflows", 310_000);
    const expensiveTool = video(
      "Canal A",
      "higgsfield-hit",
      "How To Make $10,000/Month With Higgsfield (No Experience)",
      1_100_000,
    );

    const ranked = rankOpportunityVideos([coreStack, baselineA1, baselineA2, expensiveTool], {
      limit: 4,
      perChannel: 4,
      now: new Date("2026-10-24"),
    });

    const claudeRanked = ranked.find((item) => item.id === "claude-hit");
    const higgsfieldRanked = ranked.find((item) => item.id === "higgsfield-hit");
    assert.ok(claudeRanked && higgsfieldRanked);
    assert.ok(
      claudeRanked.breakdown.replicabilityAndValidity > higgsfieldRanked.breakdown.replicabilityAndValidity,
    );

    for (const item of ranked) {
      const sum = item.breakdown.outlierExplosion
        + item.breakdown.audienceScale
        + item.breakdown.activeTraction
        + item.breakdown.relativeEngagement
        + item.breakdown.replicabilityAndValidity;
      assert.equal(item.opportunityScore, Math.round(sum));
    }
  });
});
