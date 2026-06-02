import type { RefreshStatus } from "../refresh/types";

export type DashboardSummary = {
  matchCount: number;
  wins: number;
  losses: number;
  winRate: number;
  averageKda: number;
  averageCsPerMinute: number;
  averageKillParticipation: number;
  averageVisionScorePerMinute: number;
};

export type DashboardRecentMatch = {
  matchId: string;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  csPerMinute: number;
  killParticipation: number;
  visionScorePerMinute: number;
  gameDurationSeconds: number;
  gameCreation: string;
  queueId: number;
};

export type DashboardTrendPoint = {
  matchId: string;
  championName: string;
  win: boolean;
  gameCreation: string;
};

export type DashboardChampionSummary = {
  championName: string;
  matchCount: number;
  wins: number;
  losses: number;
  winRate: number;
  averageKda: number;
  averageCsPerMinute: number;
  averageKillParticipation: number;
  averageVisionScorePerMinute: number;
};

export type DashboardCoachRecommendation = {
  title: string;
  severity: string;
  description: string;
};

export type PlayerDashboard = {
  playerProfile: {
    id: string;
    riotId: string;
  };
  summary: DashboardSummary;
  recentMatches: DashboardRecentMatch[];
  winLossTrend: DashboardTrendPoint[];
  championSummary: DashboardChampionSummary[];
  coachRecommendations: DashboardCoachRecommendation[];
  refresh?: RefreshStatus | null;
};

export type DashboardParticipantRecord = {
  riotMatchId: string;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gameDurationSeconds: number;
  gameCreation: Date;
  queueId: number;
  derivedStats: unknown;
};

export type DashboardPlayerRecord = {
  id: string;
  gameName: string;
  tagLine: string;
};

export type DashboardRepository = {
  getPlayer(
    playerProfileId: string,
  ): Promise<DashboardPlayerRecord | undefined>;
  listRecentParticipants(
    playerProfileId: string,
    limit: number,
  ): Promise<DashboardParticipantRecord[]>;
  listCoachRecommendations(
    playerProfileId: string,
    limit: number,
  ): Promise<DashboardCoachRecommendation[]>;
};

export type DashboardService = {
  getPlayerDashboard(playerProfileId: string): Promise<PlayerDashboard>;
};
