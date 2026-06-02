import { createApp } from "../index";

function request(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

function postJson(path: string, body: unknown) {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson<T>(response: Response) {
  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status}: ${JSON.stringify(body)}`,
    );
  }

  return body as T;
}

const app = createApp();
const refreshCount = 10;

const setup = await readJson<{
  playerProfile: { id: string; gameName: string; tagLine: string };
}>(
  await app.handle(
    postJson("/players/setup", {
      gameName: "JUNI",
      tagLine: "MAD",
      platformRegion: "euw1",
      regionalRoute: "europe",
    }),
  ),
);

const playerProfile = setup.playerProfile;
const refresh = await readJson<{ refresh: unknown }>(
  await app.handle(
    postJson(`/players/${playerProfile.id}/refresh`, { count: refreshCount }),
  ),
);
const dashboard = await readJson<{
  dashboard: {
    summary: {
      matchCount: number;
      wins: number;
      losses: number;
      winRate: number;
      averageKda: number;
      averageCsPerMinute: number;
      averageKillParticipation: number;
      averageVisionScorePerMinute: number;
    };
    recentMatches: unknown[];
    winLossTrend: unknown[];
    championSummary: unknown[];
    coachRecommendations: unknown[];
  };
}>(await app.handle(request(`/players/${playerProfile.id}/dashboard`)));

console.log(
  JSON.stringify(
    {
      player: `${playerProfile.gameName}#${playerProfile.tagLine}`,
      refresh: refresh.refresh,
      summary: dashboard.dashboard.summary,
      renderedSections: {
        recentMatches: dashboard.dashboard.recentMatches.length,
        winLossTrend: dashboard.dashboard.winLossTrend.length,
        championSummary: dashboard.dashboard.championSummary.length,
        coachRecommendations: dashboard.dashboard.coachRecommendations.length,
      },
      acceptance: {
        hasAtLeastTenMatches: dashboard.dashboard.summary.matchCount >= 10,
        hasAverageKda: dashboard.dashboard.summary.averageKda > 0,
        hasCsPerMinute: dashboard.dashboard.summary.averageCsPerMinute > 0,
        hasVisionPerMinute:
          dashboard.dashboard.summary.averageVisionScorePerMinute >= 0,
        hasRecentMatches: dashboard.dashboard.recentMatches.length > 0,
        hasChampionSummary: dashboard.dashboard.championSummary.length > 0,
      },
    },
    null,
    2,
  ),
);

process.exit(0);
