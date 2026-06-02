import { describe, expect, it } from "bun:test";
import {
  aggregateByChampion,
  aggregateRecentMatches,
  analyzeMatches,
  computeDerivedStats,
  detectMistakeFlags,
} from "../src/analytics/engine";
import type { AnalyticsMatchInput } from "../src/analytics/types";

const baseMatch = {
  matchId: "EUW1_base",
  gameDurationSeconds: 30 * 60,
  queueId: 420,
  gameMode: "CLASSIC",
  win: true,
  championName: "Ahri",
  kills: 8,
  deaths: 2,
  assists: 10,
  totalMinionsKilled: 210,
  neutralMinionsKilled: 10,
  visionScore: 24,
  wardsPlaced: 11,
  wardsKilled: 4,
  teamKills: 30,
} satisfies AnalyticsMatchInput;

function match(
  overrides: Partial<AnalyticsMatchInput> = {},
): AnalyticsMatchInput {
  return {
    ...baseMatch,
    matchId: overrides.matchId ?? baseMatch.matchId,
    ...overrides,
  };
}

describe("analytics derived stats", () => {
  it("computes KDA, CS/min, kill participation, vision/min, and game length", () => {
    const stats = computeDerivedStats(baseMatch);

    expect(stats.gameMinutes).toBe(30);
    expect(stats.kda).toBe(9);
    expect(stats.cs).toBe(220);
    expect(stats.csPerMinute).toBeCloseTo(7.33, 2);
    expect(stats.killParticipation).toBe(0.6);
    expect(stats.visionScorePerMinute).toBe(0.8);
  });

  it("handles zero deaths without dividing by zero", () => {
    const stats = computeDerivedStats(
      match({ kills: 12, deaths: 0, assists: 6, teamKills: 24 }),
    );

    expect(stats.kda).toBe(18);
    expect(stats.perfectKda).toBe(true);
    expect(stats.killParticipation).toBe(0.75);
  });

  it("handles zero team kills without producing NaN kill participation", () => {
    const stats = computeDerivedStats(
      match({ kills: 0, assists: 0, teamKills: 0 }),
    );

    expect(stats.killParticipation).toBe(0);
    expect(Number.isNaN(stats.killParticipation)).toBe(false);
  });

  it("marks very short games as remakes and avoids per-minute inflation", () => {
    const stats = computeDerivedStats(
      match({
        gameDurationSeconds: 180,
        totalMinionsKilled: 12,
        visionScore: 3,
      }),
    );

    expect(stats.gameMinutes).toBe(3);
    expect(stats.isShortGame).toBe(true);
    expect(stats.isRemakeCandidate).toBe(true);
  });
});

describe("analytics deterministic mistake flags", () => {
  it("flags low vision, low CS, low kill participation, and high deaths in normal games", () => {
    const flags = detectMistakeFlags(
      match({
        championName: "Yasuo",
        gameDurationSeconds: 32 * 60,
        kills: 3,
        deaths: 9,
        assists: 4,
        totalMinionsKilled: 130,
        neutralMinionsKilled: 0,
        visionScore: 9,
        teamKills: 35,
      }),
    );

    expect(flags.map((flag) => flag.kind)).toEqual([
      "high_deaths",
      "low_kill_participation",
      "low_cs_per_minute",
      "low_vision_score",
    ]);
  });

  it("does not flag short remake-like games", () => {
    const flags = detectMistakeFlags(
      match({
        gameDurationSeconds: 180,
        deaths: 4,
        visionScore: 0,
        teamKills: 5,
      }),
    );

    expect(flags).toEqual([]);
  });
});

describe("analytics aggregation", () => {
  const fixtureMatches = [
    match({
      matchId: "EUW1_1",
      championName: "Ahri",
      win: true,
      kills: 8,
      deaths: 2,
      assists: 10,
      totalMinionsKilled: 210,
      neutralMinionsKilled: 10,
      visionScore: 24,
      teamKills: 30,
    }),
    match({
      matchId: "EUW1_2",
      championName: "Ahri",
      win: false,
      kills: 4,
      deaths: 7,
      assists: 5,
      totalMinionsKilled: 165,
      neutralMinionsKilled: 5,
      visionScore: 12,
      teamKills: 22,
    }),
    match({
      matchId: "EUW1_3",
      championName: "Lee Sin",
      win: false,
      kills: 2,
      deaths: 8,
      assists: 6,
      totalMinionsKilled: 35,
      neutralMinionsKilled: 120,
      visionScore: 18,
      teamKills: 24,
    }),
  ] satisfies AnalyticsMatchInput[];

  it("aggregates recent matches into averages and totals", () => {
    const aggregate = aggregateRecentMatches(fixtureMatches);

    expect(aggregate.matchCount).toBe(3);
    expect(aggregate.winRate).toBeCloseTo(1 / 3, 4);
    expect(aggregate.averageKda).toBeCloseTo(3.76, 2);
    expect(aggregate.averageCsPerMinute).toBeCloseTo(6.06, 2);
    expect(aggregate.averageKillParticipation).toBeCloseTo(0.4475, 4);
    expect(aggregate.flagCounts.high_deaths).toBe(2);
  });

  it("aggregates performance by champion", () => {
    const champions = aggregateByChampion(fixtureMatches);

    expect(champions).toHaveLength(2);
    expect(champions[0]).toMatchObject({
      championName: "Ahri",
      matchCount: 2,
      wins: 1,
      losses: 1,
    });
    expect(champions[0].averageCsPerMinute).toBeCloseTo(6.5, 1);
    expect(champions[1]).toMatchObject({
      championName: "Lee Sin",
      matchCount: 1,
    });
  });

  it("generates top coach recommendations from repeated deterministic flags", () => {
    const report = analyzeMatches(fixtureMatches);

    expect(report.recommendations.slice(0, 3).map((item) => item.kind)).toEqual(
      ["high_deaths", "low_cs_per_minute", "low_kill_participation"],
    );
    expect(report.recommendations[0].title).toContain("muertes");
    expect(report.champions[0].championName).toBe("Ahri");
  });
});
