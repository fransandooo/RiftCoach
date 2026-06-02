import { createPostgresClient } from "../db/client";
import type {
  DashboardCoachRecommendation,
  DashboardParticipantRecord,
  DashboardPlayerRecord,
  DashboardRepository,
} from "./types";

type SqlClient = ReturnType<typeof createPostgresClient>;

type ParticipantRow = {
  riot_match_id: string;
  champion_name: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  game_duration: number;
  game_creation: Date;
  queue_id: number;
  derived_stats: unknown;
};

export function createPostgresDashboardRepository(
  sql: SqlClient = createPostgresClient(),
): DashboardRepository {
  return {
    async getPlayer(playerProfileId) {
      const rows = await sql<DashboardPlayerRecord[]>`
        select id, game_name as "gameName", tag_line as "tagLine"
        from player_profiles
        where id = ${playerProfileId}
        limit 1
      `;

      return rows[0];
    },

    async listRecentParticipants(playerProfileId, limit) {
      const rows = await sql<ParticipantRow[]>`
        select
          m.riot_match_id,
          mp.champion_name,
          mp.win,
          mp.kills,
          mp.deaths,
          mp.assists,
          m.game_duration,
          m.game_creation,
          m.queue_id,
          mp.derived_stats
        from match_participants mp
        inner join matches m on m.id = mp.match_id
        where mp.player_profile_id = ${playerProfileId}
        order by m.game_creation desc
        limit ${limit}
      `;

      return rows.map((row) => ({
        riotMatchId: row.riot_match_id,
        championName: row.champion_name,
        win: row.win,
        kills: row.kills,
        deaths: row.deaths,
        assists: row.assists,
        gameDurationSeconds: row.game_duration,
        gameCreation: row.game_creation,
        queueId: row.queue_id,
        derivedStats: row.derived_stats,
      }));
    },

    async listCoachRecommendations(playerProfileId, limit) {
      return sql<DashboardCoachRecommendation[]>`
        select title, severity, description
        from coach_insights
        where player_profile_id = ${playerProfileId}
        order by created_at desc
        limit ${limit}
      `;
    },
  };
}
