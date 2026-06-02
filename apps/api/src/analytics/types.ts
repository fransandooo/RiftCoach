export type AnalyticsMatchInput = {
  matchId: string;
  gameDurationSeconds: number;
  queueId: number;
  gameMode: string;
  win: boolean;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  teamKills: number;
};

export type MistakeFlagKind =
  | "high_deaths"
  | "low_kill_participation"
  | "low_cs_per_minute"
  | "low_vision_score";

export type MistakeSeverity = "low" | "medium" | "high";

export type DerivedStats = {
  gameMinutes: number;
  kda: number;
  perfectKda: boolean;
  cs: number;
  csPerMinute: number;
  killParticipation: number;
  visionScorePerMinute: number;
  isShortGame: boolean;
  isRemakeCandidate: boolean;
};

export type MistakeFlag = {
  kind: MistakeFlagKind;
  severity: MistakeSeverity;
  title: string;
  description: string;
  value: number;
  threshold: number;
};

export type RecentMatchAggregate = {
  matchCount: number;
  wins: number;
  losses: number;
  winRate: number;
  averageKda: number;
  averageCsPerMinute: number;
  averageKillParticipation: number;
  averageVisionScorePerMinute: number;
  flagCounts: Partial<Record<MistakeFlagKind, number>>;
};

export type ChampionAggregate = {
  championName: string;
  matchCount: number;
  wins: number;
  losses: number;
  winRate: number;
  averageKda: number;
  averageCsPerMinute: number;
  averageKillParticipation: number;
  averageVisionScorePerMinute: number;
  flagCounts: Partial<Record<MistakeFlagKind, number>>;
};

export type CoachRecommendation = {
  kind: MistakeFlagKind;
  severity: MistakeSeverity;
  title: string;
  description: string;
  occurrences: number;
};

export type AnalyticsReport = {
  recent: RecentMatchAggregate;
  champions: ChampionAggregate[];
  recommendations: CoachRecommendation[];
};
