import { eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createDbClient } from "../db/client";
import {
  coachInsights,
  matches,
  matchParticipants,
  playerProfiles,
  rankedSnapshots,
} from "../db/schema";
import type {
  CoachInsightInput,
  PlayerProfileRecord,
  RefreshRepository,
  RefreshStatus,
  StoredMatchCandidate,
} from "./types";

const refreshStatuses = new Map<string, RefreshStatus>();

type RiftCoachDb =
  | ReturnType<typeof createDbClient>
  | PostgresJsDatabase
  | NodePgDatabase;

function toPlayerProfileRecord(
  row: typeof playerProfiles.$inferSelect,
): PlayerProfileRecord {
  return {
    id: row.id,
    gameName: row.gameName,
    tagLine: row.tagLine,
    platformRegion: row.platformRegion as PlayerProfileRecord["platformRegion"],
    regionalRoute: row.regionalRoute as PlayerProfileRecord["regionalRoute"],
    puuid: row.puuid,
  };
}

export function createPostgresRefreshRepository(
  db: RiftCoachDb = createDbClient(),
): RefreshRepository {
  return {
    async upsertPlayerProfile(input) {
      const [row] = await db
        .insert(playerProfiles)
        .values(input)
        .onConflictDoUpdate({
          target: playerProfiles.puuid,
          set: {
            gameName: input.gameName,
            tagLine: input.tagLine,
            platformRegion: input.platformRegion,
            regionalRoute: input.regionalRoute,
            updatedAt: new Date(),
          },
        })
        .returning();

      return toPlayerProfileRecord(row);
    },

    async getPlayerProfile(playerProfileId) {
      const [row] = await db
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.id, playerProfileId))
        .limit(1);

      return row ? toPlayerProfileRecord(row) : undefined;
    },

    async replaceRankedSnapshots(playerProfileId, entries) {
      await db
        .delete(rankedSnapshots)
        .where(eq(rankedSnapshots.playerProfileId, playerProfileId));

      if (entries.length === 0) {
        return;
      }

      await db.insert(rankedSnapshots).values(
        entries.map((entry) => ({
          playerProfileId,
          queueType: entry.queueType,
          tier: entry.tier,
          rank: entry.rank,
          leaguePoints: entry.leaguePoints,
          wins: entry.wins,
          losses: entry.losses,
        })),
      );
    },

    async findExistingMatchIds(matchIds) {
      if (matchIds.length === 0) {
        return [];
      }

      const rows = await db
        .select({ riotMatchId: matches.riotMatchId })
        .from(matches)
        .where(inArray(matches.riotMatchId, matchIds));

      return rows.map((row) => row.riotMatchId);
    },

    async insertMatchWithParticipant(playerProfileId, candidate) {
      const [matchRow] = await db
        .insert(matches)
        .values({
          riotMatchId: candidate.riotMatchId,
          gameCreation: candidate.gameCreation,
          gameDuration: candidate.gameDuration,
          gameMode: candidate.gameMode,
          queueId: candidate.queueId,
          platformId: candidate.platformId,
          rawJson: candidate.rawJson,
        })
        .onConflictDoNothing({ target: matches.riotMatchId })
        .returning({ id: matches.id });

      const matchId =
        matchRow?.id ??
        (
          await db
            .select({ id: matches.id })
            .from(matches)
            .where(eq(matches.riotMatchId, candidate.riotMatchId))
            .limit(1)
        )[0]?.id;

      if (!matchId) {
        throw new Error(
          `Could not insert or find match ${candidate.riotMatchId}`,
        );
      }

      await db
        .insert(matchParticipants)
        .values({
          matchId,
          playerProfileId,
          puuid: candidate.participant.puuid,
          riotDisplayName: candidate.participant.riotDisplayName,
          championName: candidate.participant.championName,
          championId: candidate.participant.championId,
          teamId: candidate.participant.teamId,
          win: candidate.participant.win,
          lane: candidate.participant.lane,
          role: candidate.participant.role,
          kills: candidate.participant.kills,
          deaths: candidate.participant.deaths,
          assists: candidate.participant.assists,
          totalMinionsKilled: candidate.participant.totalMinionsKilled,
          neutralMinionsKilled: candidate.participant.neutralMinionsKilled,
          goldEarned: candidate.participant.goldEarned,
          totalDamageDealtToChampions:
            candidate.participant.totalDamageDealtToChampions,
          visionScore: candidate.participant.visionScore,
          wardsPlaced: candidate.participant.wardsPlaced,
          wardsKilled: candidate.participant.wardsKilled,
          detectorFlags: candidate.participant.detectorFlags,
          derivedStats: candidate.participant.derivedStats,
        })
        .onConflictDoNothing({
          target: [matchParticipants.matchId, matchParticipants.puuid],
        });
    },

    async replaceCoachInsights(playerProfileId, insights) {
      await db
        .delete(coachInsights)
        .where(eq(coachInsights.playerProfileId, playerProfileId));

      if (insights.length === 0) {
        return;
      }

      await db.insert(coachInsights).values(
        insights.map((insight: CoachInsightInput) => ({
          playerProfileId,
          scope: insight.scope,
          title: insight.title,
          severity: insight.severity,
          description: insight.description,
          evidence: insight.evidence,
        })),
      );
    },

    async saveRefreshStatus(playerProfileId, status) {
      refreshStatuses.set(playerProfileId, status);
    },

    async getRefreshStatus(playerProfileId) {
      return refreshStatuses.get(playerProfileId);
    },
  };
}
