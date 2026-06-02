import type { RegionalRoute, RiotMatch, PlatformRegion } from "../riot/client";
import type { DerivedStats, MistakeFlag } from "../analytics/types";

export type PlayerProfileRecord = {
  id: string;
  gameName: string;
  tagLine: string;
  platformRegion: PlatformRegion;
  regionalRoute: RegionalRoute;
  puuid: string;
};

export type SetupPlayerInput = {
  gameName: string;
  tagLine: string;
  platformRegion: PlatformRegion;
  regionalRoute: RegionalRoute;
};

export type RefreshState = "idle" | "running" | "completed" | "failed";

export type RefreshStatus = {
  playerProfileId: string;
  state: RefreshState;
  requestedMatches: number;
  importedMatches: number;
  skippedMatches: number;
  coachInsights: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export type StoredMatchParticipant = {
  puuid: string;
  riotDisplayName?: string;
  championName: string;
  championId: number;
  teamId: number;
  win: boolean;
  lane?: string;
  role?: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  teamKills: number;
  detectorFlags: MistakeFlag[];
  derivedStats: DerivedStats;
};

export type StoredMatchCandidate = {
  riotMatchId: string;
  gameCreation: Date;
  gameDuration: number;
  gameMode: string;
  queueId: number;
  platformId: string;
  rawJson: RiotMatch;
  participant: StoredMatchParticipant;
};

export type CoachInsightInput = {
  scope: string;
  title: string;
  severity: string;
  description: string;
  evidence: unknown;
};

export type RefreshRepository = {
  upsertPlayerProfile(
    input: Omit<PlayerProfileRecord, "id">,
  ): Promise<PlayerProfileRecord>;
  getPlayerProfile(
    playerProfileId: string,
  ): Promise<PlayerProfileRecord | undefined>;
  replaceRankedSnapshots(
    playerProfileId: string,
    entries: Array<{
      queueType: string;
      tier?: string;
      rank?: string;
      leaguePoints: number;
      wins: number;
      losses: number;
    }>,
  ): Promise<void>;
  findExistingMatchIds(matchIds: string[]): Promise<string[]>;
  insertMatchWithParticipant(
    playerProfileId: string,
    candidate: StoredMatchCandidate,
  ): Promise<void>;
  replaceCoachInsights(
    playerProfileId: string,
    insights: CoachInsightInput[],
  ): Promise<void>;
  saveRefreshStatus(
    playerProfileId: string,
    status: RefreshStatus,
  ): Promise<void>;
  getRefreshStatus(playerProfileId: string): Promise<RefreshStatus | undefined>;
};

export type RefreshRiotClient = {
  getAccountByRiotId(args: {
    regionalRoute: RegionalRoute;
    gameName: string;
    tagLine: string;
  }): Promise<{ puuid: string; gameName: string; tagLine: string }>;
  getRankedEntriesByPuuid(args: {
    platformRegion: PlatformRegion;
    puuid: string;
  }): Promise<
    Array<{
      queueType: string;
      tier?: string;
      rank?: string;
      leaguePoints: number;
      wins: number;
      losses: number;
    }>
  >;
  getMatchIdsByPuuid(args: {
    regionalRoute: RegionalRoute;
    puuid: string;
    start?: number;
    count?: number;
  }): Promise<string[]>;
  getMatchById(args: {
    regionalRoute: RegionalRoute;
    matchId: string;
  }): Promise<RiotMatch>;
};

export type RefreshService = {
  setupPlayer(input: SetupPlayerInput): Promise<PlayerProfileRecord>;
  refreshPlayer(args: {
    playerProfileId: string;
    count?: number;
  }): Promise<RefreshStatus>;
  getRefreshStatus(playerProfileId: string): Promise<RefreshStatus>;
};
