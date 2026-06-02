import { describe, expect, it } from "bun:test";
import { createApp } from "../src/index";
import type { DashboardService } from "../src/dashboard/types";
import type { RefreshService } from "../src/refresh/types";

const refreshService: RefreshService = {
  async setupPlayer() {
    throw new Error("not used");
  },
  async refreshPlayer() {
    throw new Error("not used");
  },
  async getRefreshStatus(playerProfileId) {
    return {
      playerProfileId,
      state: "completed",
      requestedMatches: 10,
      importedMatches: 5,
      skippedMatches: 5,
      coachInsights: 4,
    };
  },
};

const dashboardService: DashboardService = {
  async getPlayerDashboard(playerProfileId) {
    return {
      playerProfile: {
        id: playerProfileId,
        riotId: "JUNI#MAD",
      },
      summary: {
        matchCount: 10,
        wins: 6,
        losses: 4,
        winRate: 0.6,
        averageKda: 3.42,
        averageCsPerMinute: 6.8,
        averageKillParticipation: 0.58,
        averageVisionScorePerMinute: 1.12,
      },
      recentMatches: [
        {
          matchId: "EUW1_1",
          championName: "Orianna",
          win: true,
          kills: 8,
          deaths: 2,
          assists: 11,
          kda: 9.5,
          csPerMinute: 7.1,
          killParticipation: 0.63,
          visionScorePerMinute: 1.2,
          gameDurationSeconds: 1800,
          gameCreation: "2026-06-02T09:00:00.000Z",
          queueId: 420,
        },
      ],
      winLossTrend: [
        {
          matchId: "EUW1_1",
          championName: "Orianna",
          win: true,
          gameCreation: "2026-06-02T09:00:00.000Z",
        },
      ],
      championSummary: [
        {
          championName: "Orianna",
          matchCount: 4,
          wins: 3,
          losses: 1,
          winRate: 0.75,
          averageKda: 4.1,
          averageCsPerMinute: 7.4,
          averageKillParticipation: 0.62,
          averageVisionScorePerMinute: 1.3,
        },
      ],
      coachRecommendations: [
        {
          title: "Improve vision consistency",
          severity: "medium",
          description: "Your vision score is below target in repeated matches.",
        },
      ],
      refresh: {
        playerProfileId,
        state: "completed",
        requestedMatches: 10,
        importedMatches: 5,
        skippedMatches: 5,
        coachInsights: 4,
      },
    };
  },
};

describe("dashboard API route", () => {
  it("returns dashboard summary, recent matches, trend, champions, and recommendations", async () => {
    const app = createApp({ refreshService, dashboardService });

    const response = await app.handle(
      new Request("http://localhost/players/profile-1/dashboard"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dashboard.summary.matchCount).toBe(10);
    expect(body.dashboard.summary.averageKda).toBe(3.42);
    expect(body.dashboard.summary.averageCsPerMinute).toBe(6.8);
    expect(body.dashboard.summary.averageVisionScorePerMinute).toBe(1.12);
    expect(body.dashboard.recentMatches).toHaveLength(1);
    expect(body.dashboard.winLossTrend).toEqual([
      {
        matchId: "EUW1_1",
        championName: "Orianna",
        win: true,
        gameCreation: "2026-06-02T09:00:00.000Z",
      },
    ]);
    expect(body.dashboard.championSummary[0]).toMatchObject({
      championName: "Orianna",
      matchCount: 4,
      winRate: 0.75,
    });
    expect(body.dashboard.coachRecommendations[0].title).toBe(
      "Improve vision consistency",
    );
  });
});
