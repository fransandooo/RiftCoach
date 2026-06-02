import {
  analyzeMatches,
  computeDerivedStats,
  detectMistakeFlags,
} from "../analytics/engine";
import type { AnalyticsMatchInput } from "../analytics/types";
import type { RiotMatch } from "../riot/client";
import type {
  CoachInsightInput,
  RefreshRepository,
  RefreshRiotClient,
  RefreshService,
  RefreshStatus,
  StoredMatchCandidate,
  StoredMatchParticipant,
} from "./types";

const DEFAULT_REFRESH_MATCH_COUNT = 10;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function getParticipants(match: RiotMatch) {
  const info = asRecord(match.info);
  const participants = info.participants;
  return Array.isArray(participants) ? participants.map(asRecord) : [];
}

function getTeamKills(participants: Record<string, unknown>[], teamId: number) {
  return participants
    .filter((participant) => asNumber(participant.teamId) === teamId)
    .reduce((total, participant) => total + asNumber(participant.kills), 0);
}

function getRiotDisplayName(participant: Record<string, unknown>) {
  const gameName = asString(participant.riotIdGameName);
  const tagLine = asString(participant.riotIdTagline);

  if (gameName && tagLine) {
    return `${gameName}#${tagLine}`;
  }

  return (
    asString(participant.summonerName, undefined as unknown as string) ||
    undefined
  );
}

function toAnalyticsInput(
  match: RiotMatch,
  participant: StoredMatchParticipant,
): AnalyticsMatchInput {
  const info = asRecord(match.info);

  return {
    matchId: match.metadata.matchId,
    gameDurationSeconds: asNumber(info.gameDuration),
    queueId: asNumber(info.queueId),
    gameMode: asString(info.gameMode, "UNKNOWN"),
    win: participant.win,
    championName: participant.championName,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    totalMinionsKilled: participant.totalMinionsKilled,
    neutralMinionsKilled: participant.neutralMinionsKilled,
    visionScore: participant.visionScore,
    wardsPlaced: participant.wardsPlaced,
    wardsKilled: participant.wardsKilled,
    teamKills: participant.teamKills,
  };
}

export function createStoredMatchCandidate(
  match: RiotMatch,
  playerPuuid: string,
): StoredMatchCandidate {
  const info = asRecord(match.info);
  const participants = getParticipants(match);
  const riotParticipant = participants.find(
    (participant) => asString(participant.puuid) === playerPuuid,
  );

  if (!riotParticipant) {
    throw new Error(
      `Player participant not found in match ${match.metadata.matchId}`,
    );
  }

  const teamId = asNumber(riotParticipant.teamId);
  const baseParticipant = {
    puuid: playerPuuid,
    riotDisplayName: getRiotDisplayName(riotParticipant),
    championName: asString(riotParticipant.championName, "Unknown"),
    championId: asNumber(riotParticipant.championId),
    teamId,
    win: asBoolean(riotParticipant.win),
    lane: asString(riotParticipant.lane) || undefined,
    role: asString(riotParticipant.role) || undefined,
    kills: asNumber(riotParticipant.kills),
    deaths: asNumber(riotParticipant.deaths),
    assists: asNumber(riotParticipant.assists),
    totalMinionsKilled: asNumber(riotParticipant.totalMinionsKilled),
    neutralMinionsKilled: asNumber(riotParticipant.neutralMinionsKilled),
    goldEarned: asNumber(riotParticipant.goldEarned),
    totalDamageDealtToChampions: asNumber(
      riotParticipant.totalDamageDealtToChampions,
    ),
    visionScore: asNumber(riotParticipant.visionScore),
    wardsPlaced: asNumber(riotParticipant.wardsPlaced),
    wardsKilled: asNumber(riotParticipant.wardsKilled),
    teamKills: getTeamKills(participants, teamId),
  };

  const analyticsInput = toAnalyticsInput(match, {
    ...baseParticipant,
    detectorFlags: [],
    derivedStats: computeDerivedStats({
      matchId: match.metadata.matchId,
      gameDurationSeconds: asNumber(info.gameDuration),
      queueId: asNumber(info.queueId),
      gameMode: asString(info.gameMode, "UNKNOWN"),
      win: baseParticipant.win,
      championName: baseParticipant.championName,
      kills: baseParticipant.kills,
      deaths: baseParticipant.deaths,
      assists: baseParticipant.assists,
      totalMinionsKilled: baseParticipant.totalMinionsKilled,
      neutralMinionsKilled: baseParticipant.neutralMinionsKilled,
      visionScore: baseParticipant.visionScore,
      wardsPlaced: baseParticipant.wardsPlaced,
      wardsKilled: baseParticipant.wardsKilled,
      teamKills: baseParticipant.teamKills,
    }),
  });

  const participant: StoredMatchParticipant = {
    ...baseParticipant,
    detectorFlags: detectMistakeFlags(analyticsInput),
    derivedStats: computeDerivedStats(analyticsInput),
  };

  return {
    riotMatchId: match.metadata.matchId,
    gameCreation: new Date(asNumber(info.gameCreation)),
    gameDuration: asNumber(info.gameDuration),
    gameMode: asString(info.gameMode, "UNKNOWN"),
    queueId: asNumber(info.queueId),
    platformId: asString(info.platformId, "UNKNOWN"),
    rawJson: match,
    participant,
  };
}

function toCoachInsights(matches: StoredMatchCandidate[]): CoachInsightInput[] {
  const analyticsInputs = matches.map((match) =>
    toAnalyticsInput(match.rawJson, match.participant),
  );
  const report = analyzeMatches(analyticsInputs);

  return report.recommendations.map((recommendation) => ({
    scope: "recent_matches",
    title: recommendation.title,
    severity: recommendation.severity,
    description: recommendation.description,
    evidence: {
      kind: recommendation.kind,
      occurrences: recommendation.occurrences,
      recent: report.recent,
      champions: report.champions.slice(0, 5),
    },
  }));
}

export function createRefreshService(args: {
  repository: RefreshRepository;
  riotClient: RefreshRiotClient;
}): RefreshService {
  const { repository, riotClient } = args;

  return {
    async setupPlayer(input) {
      const account = await riotClient.getAccountByRiotId({
        regionalRoute: input.regionalRoute,
        gameName: input.gameName,
        tagLine: input.tagLine,
      });

      return repository.upsertPlayerProfile({
        gameName: account.gameName,
        tagLine: account.tagLine,
        platformRegion: input.platformRegion,
        regionalRoute: input.regionalRoute,
        puuid: account.puuid,
      });
    },

    async refreshPlayer({
      playerProfileId,
      count = DEFAULT_REFRESH_MATCH_COUNT,
    }) {
      const startedAt = new Date().toISOString();
      const runningStatus: RefreshStatus = {
        playerProfileId,
        state: "running",
        requestedMatches: count,
        importedMatches: 0,
        skippedMatches: 0,
        coachInsights: 0,
        startedAt,
      };
      await repository.saveRefreshStatus(playerProfileId, runningStatus);

      try {
        const profile = await repository.getPlayerProfile(playerProfileId);

        if (!profile) {
          throw new Error(`Player profile not found: ${playerProfileId}`);
        }

        const rankedEntries = await riotClient.getRankedEntriesByPuuid({
          platformRegion: profile.platformRegion,
          puuid: profile.puuid,
        });
        await repository.replaceRankedSnapshots(playerProfileId, rankedEntries);

        const matchIds = await riotClient.getMatchIdsByPuuid({
          regionalRoute: profile.regionalRoute,
          puuid: profile.puuid,
          start: 0,
          count,
        });
        const existingMatchIds =
          await repository.findExistingMatchIds(matchIds);
        const existingSet = new Set(existingMatchIds);
        const newMatchIds = matchIds.filter(
          (matchId) => !existingSet.has(matchId),
        );
        const importedMatches: StoredMatchCandidate[] = [];

        for (const matchId of newMatchIds) {
          const match = await riotClient.getMatchById({
            regionalRoute: profile.regionalRoute,
            matchId,
          });
          const candidate = createStoredMatchCandidate(match, profile.puuid);
          await repository.insertMatchWithParticipant(
            playerProfileId,
            candidate,
          );
          importedMatches.push(candidate);
        }

        const insights = toCoachInsights(importedMatches);

        if (importedMatches.length > 0) {
          await repository.replaceCoachInsights(playerProfileId, insights);
        }

        const completedStatus: RefreshStatus = {
          playerProfileId,
          state: "completed",
          requestedMatches: matchIds.length,
          importedMatches: importedMatches.length,
          skippedMatches: existingMatchIds.length,
          coachInsights: insights.length,
          startedAt,
          completedAt: new Date().toISOString(),
        };
        await repository.saveRefreshStatus(playerProfileId, completedStatus);
        return completedStatus;
      } catch (error) {
        const failedStatus: RefreshStatus = {
          ...runningStatus,
          state: "failed",
          error:
            error instanceof Error ? error.message : "Unknown refresh error",
          completedAt: new Date().toISOString(),
        };
        await repository.saveRefreshStatus(playerProfileId, failedStatus);
        throw error;
      }
    },

    async getRefreshStatus(playerProfileId) {
      return (
        (await repository.getRefreshStatus(playerProfileId)) ?? {
          playerProfileId,
          state: "idle",
          requestedMatches: 0,
          importedMatches: 0,
          skippedMatches: 0,
          coachInsights: 0,
        }
      );
    },
  };
}
