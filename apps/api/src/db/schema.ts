import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const playerProfiles = pgTable(
  "player_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameName: varchar("game_name", { length: 64 }).notNull(),
    tagLine: varchar("tag_line", { length: 16 }).notNull(),
    platformRegion: varchar("platform_region", { length: 16 }).notNull(),
    regionalRoute: varchar("regional_route", { length: 16 }).notNull(),
    puuid: varchar("puuid", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("player_profiles_puuid_idx").on(table.puuid),
    uniqueIndex("player_profiles_riot_id_idx").on(
      table.gameName,
      table.tagLine,
      table.platformRegion,
    ),
  ],
);

export const rankedSnapshots = pgTable(
  "ranked_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerProfileId: uuid("player_profile_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),
    queueType: varchar("queue_type", { length: 32 }).notNull(),
    tier: varchar("tier", { length: 32 }),
    rank: varchar("rank", { length: 8 }),
    leaguePoints: integer("league_points"),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ranked_snapshots_player_profile_id_idx").on(table.playerProfileId),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    riotMatchId: varchar("riot_match_id", { length: 32 }).notNull(),
    gameCreation: timestamp("game_creation", { withTimezone: true }).notNull(),
    gameDuration: integer("game_duration").notNull(),
    gameMode: varchar("game_mode", { length: 32 }).notNull(),
    queueId: integer("queue_id").notNull(),
    platformId: varchar("platform_id", { length: 16 }).notNull(),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("matches_riot_match_id_idx").on(table.riotMatchId)],
);

export const matchParticipants = pgTable(
  "match_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerProfileId: uuid("player_profile_id").references(
      () => playerProfiles.id,
      { onDelete: "set null" },
    ),
    puuid: varchar("puuid", { length: 128 }).notNull(),
    riotDisplayName: varchar("riot_display_name", { length: 128 }),
    championName: varchar("champion_name", { length: 64 }).notNull(),
    championId: integer("champion_id").notNull(),
    teamId: integer("team_id").notNull(),
    win: boolean("win").notNull(),
    lane: varchar("lane", { length: 32 }),
    role: varchar("role", { length: 32 }),
    kills: integer("kills").notNull().default(0),
    deaths: integer("deaths").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    totalMinionsKilled: integer("total_minions_killed").notNull().default(0),
    neutralMinionsKilled: integer("neutral_minions_killed")
      .notNull()
      .default(0),
    goldEarned: integer("gold_earned").notNull().default(0),
    totalDamageDealtToChampions: integer("total_damage_dealt_to_champions")
      .notNull()
      .default(0),
    visionScore: integer("vision_score").notNull().default(0),
    wardsPlaced: integer("wards_placed").notNull().default(0),
    wardsKilled: integer("wards_killed").notNull().default(0),
    detectorFlags: jsonb("detector_flags"),
    derivedStats: jsonb("derived_stats"),
  },
  (table) => [
    index("match_participants_match_id_idx").on(table.matchId),
    index("match_participants_player_profile_id_idx").on(table.playerProfileId),
    uniqueIndex("match_participants_match_puuid_idx").on(
      table.matchId,
      table.puuid,
    ),
  ],
);

export const coachInsights = pgTable(
  "coach_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerProfileId: uuid("player_profile_id")
      .notNull()
      .references(() => playerProfiles.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 32 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    severity: varchar("severity", { length: 16 }).notNull(),
    description: text("description").notNull(),
    evidence: jsonb("evidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("coach_insights_player_profile_id_idx").on(table.playerProfileId),
  ],
);

export const playerProfilesRelations = relations(
  playerProfiles,
  ({ many }) => ({
    rankedSnapshots: many(rankedSnapshots),
    matchParticipants: many(matchParticipants),
    coachInsights: many(coachInsights),
  }),
);

export const rankedSnapshotsRelations = relations(
  rankedSnapshots,
  ({ one }) => ({
    playerProfile: one(playerProfiles, {
      fields: [rankedSnapshots.playerProfileId],
      references: [playerProfiles.id],
    }),
  }),
);

export const matchesRelations = relations(matches, ({ many }) => ({
  participants: many(matchParticipants),
}));

export const matchParticipantsRelations = relations(
  matchParticipants,
  ({ one }) => ({
    match: one(matches, {
      fields: [matchParticipants.matchId],
      references: [matches.id],
    }),
    playerProfile: one(playerProfiles, {
      fields: [matchParticipants.playerProfileId],
      references: [playerProfiles.id],
    }),
  }),
);

export const coachInsightsRelations = relations(coachInsights, ({ one }) => ({
  playerProfile: one(playerProfiles, {
    fields: [coachInsights.playerProfileId],
    references: [playerProfiles.id],
  }),
}));
