import type {
  DashboardParticipantRecord,
  DashboardRepository,
  DashboardSummary,
  DashboardChampionSummary,
  DashboardRecentMatch,
  DashboardService,
} from "./types";

const DEFAULT_RECENT_LIMIT = 20;

function round(value: number, decimals = 2) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function numberFromDerivedStats(
  derivedStats: unknown,
  key: string,
  fallback = 0,
) {
  if (!derivedStats || typeof derivedStats !== "object") {
    return fallback;
  }

  const value = (derivedStats as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toRecentMatch(
  record: DashboardParticipantRecord,
): DashboardRecentMatch {
  const kda = numberFromDerivedStats(record.derivedStats, "kda");
  const csPerMinute = numberFromDerivedStats(
    record.derivedStats,
    "csPerMinute",
  );
  const killParticipation = numberFromDerivedStats(
    record.derivedStats,
    "killParticipation",
  );
  const visionScorePerMinute = numberFromDerivedStats(
    record.derivedStats,
    "visionScorePerMinute",
  );

  return {
    matchId: record.riotMatchId,
    championName: record.championName,
    win: record.win,
    kills: record.kills,
    deaths: record.deaths,
    assists: record.assists,
    kda: round(kda),
    csPerMinute: round(csPerMinute),
    killParticipation: round(killParticipation, 4),
    visionScorePerMinute: round(visionScorePerMinute),
    gameDurationSeconds: record.gameDurationSeconds,
    gameCreation: record.gameCreation.toISOString(),
    queueId: record.queueId,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function buildSummary(matches: DashboardRecentMatch[]): DashboardSummary {
  const wins = matches.filter((match) => match.win).length;
  const losses = matches.length - wins;

  return {
    matchCount: matches.length,
    wins,
    losses,
    winRate: round(matches.length > 0 ? wins / matches.length : 0, 4),
    averageKda: round(average(matches.map((match) => match.kda))),
    averageCsPerMinute: round(
      average(matches.map((match) => match.csPerMinute)),
    ),
    averageKillParticipation: round(
      average(matches.map((match) => match.killParticipation)),
      4,
    ),
    averageVisionScorePerMinute: round(
      average(matches.map((match) => match.visionScorePerMinute)),
    ),
  };
}

function buildChampionSummary(
  matches: DashboardRecentMatch[],
): DashboardChampionSummary[] {
  const grouped = new Map<string, DashboardRecentMatch[]>();

  for (const match of matches) {
    grouped.set(match.championName, [
      ...(grouped.get(match.championName) ?? []),
      match,
    ]);
  }

  return [...grouped.entries()]
    .map(([championName, championMatches]) => {
      const wins = championMatches.filter((match) => match.win).length;
      const losses = championMatches.length - wins;

      return {
        championName,
        matchCount: championMatches.length,
        wins,
        losses,
        winRate: round(wins / championMatches.length, 4),
        averageKda: round(average(championMatches.map((match) => match.kda))),
        averageCsPerMinute: round(
          average(championMatches.map((match) => match.csPerMinute)),
        ),
        averageKillParticipation: round(
          average(championMatches.map((match) => match.killParticipation)),
          4,
        ),
        averageVisionScorePerMinute: round(
          average(championMatches.map((match) => match.visionScorePerMinute)),
        ),
      };
    })
    .sort((left, right) => {
      if (right.matchCount !== left.matchCount) {
        return right.matchCount - left.matchCount;
      }

      return left.championName.localeCompare(right.championName);
    });
}

export function createDashboardService(
  repository: DashboardRepository,
): DashboardService {
  return {
    async getPlayerDashboard(playerProfileId) {
      const player = await repository.getPlayer(playerProfileId);

      if (!player) {
        throw new Error(`Player profile not found: ${playerProfileId}`);
      }

      const participantRecords = await repository.listRecentParticipants(
        playerProfileId,
        DEFAULT_RECENT_LIMIT,
      );
      const recentMatches = participantRecords.map(toRecentMatch);
      const coachRecommendations = await repository.listCoachRecommendations(
        playerProfileId,
        5,
      );

      return {
        playerProfile: {
          id: player.id,
          riotId: `${player.gameName}#${player.tagLine}`,
        },
        summary: buildSummary(recentMatches),
        recentMatches,
        winLossTrend: [...recentMatches]
          .reverse()
          .slice(-10)
          .map((match) => ({
            matchId: match.matchId,
            championName: match.championName,
            win: match.win,
            gameCreation: match.gameCreation,
          })),
        championSummary: buildChampionSummary(recentMatches),
        coachRecommendations,
      };
    },
  };
}
