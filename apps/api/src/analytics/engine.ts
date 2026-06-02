import type {
  AnalyticsMatchInput,
  AnalyticsReport,
  ChampionAggregate,
  CoachRecommendation,
  DerivedStats,
  MistakeFlag,
  MistakeFlagKind,
  MistakeSeverity,
  RecentMatchAggregate,
} from "./types";

const MIN_NORMAL_GAME_SECONDS = 5 * 60;

const FLAG_PRIORITY: Record<MistakeFlagKind, number> = {
  high_deaths: 1,
  low_kill_participation: 2,
  low_cs_per_minute: 3,
  low_vision_score: 4,
};

const RECOMMENDATION_COPY: Record<
  MistakeFlagKind,
  { title: string; description: string; severity: MistakeSeverity }
> = {
  high_deaths: {
    title: "Reduce tus muertes evitables",
    description:
      "Hay demasiadas partidas con muchas muertes. Prioriza resets seguros, visión antes de avanzar y evita pelear sin información.",
    severity: "high",
  },
  low_kill_participation: {
    title: "Participa más en las jugadas importantes",
    description:
      "Tu kill participation aparece baja en varias partidas. Revisa timings de rotación, peleas de objetivos y si estás llegando tarde a skirmishes.",
    severity: "medium",
  },
  low_cs_per_minute: {
    title: "Mejora la consistencia de farmeo",
    description:
      "El CS/min cae por debajo del objetivo en varias partidas. Trabaja recalls, side waves y evitar perder oleadas por peleas malas.",
    severity: "medium",
  },
  low_vision_score: {
    title: "Sube tu impacto de visión",
    description:
      "La visión por minuto es baja. Compra y coloca wards con intención antes de objetivos, y limpia visión cuando tengas prioridad.",
    severity: "medium",
  },
};

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function incrementFlagCount(
  counts: Partial<Record<MistakeFlagKind, number>>,
  kind: MistakeFlagKind,
) {
  counts[kind] = (counts[kind] ?? 0) + 1;
}

export function computeDerivedStats(match: AnalyticsMatchInput): DerivedStats {
  const gameMinutes = match.gameDurationSeconds / 60;
  const safeGameMinutes = gameMinutes > 0 ? gameMinutes : 1;
  const cs = match.totalMinionsKilled + match.neutralMinionsKilled;
  const kda =
    match.deaths === 0
      ? match.kills + match.assists
      : (match.kills + match.assists) / match.deaths;
  const killParticipation =
    match.teamKills > 0 ? (match.kills + match.assists) / match.teamKills : 0;

  return {
    gameMinutes: round(gameMinutes),
    kda: round(kda),
    perfectKda: match.deaths === 0,
    cs,
    csPerMinute: round(cs / safeGameMinutes),
    killParticipation: round(killParticipation, 4),
    visionScorePerMinute: round(match.visionScore / safeGameMinutes),
    isShortGame: match.gameDurationSeconds < MIN_NORMAL_GAME_SECONDS,
    isRemakeCandidate: match.gameDurationSeconds < MIN_NORMAL_GAME_SECONDS,
  };
}

export function detectMistakeFlags(match: AnalyticsMatchInput): MistakeFlag[] {
  const stats = computeDerivedStats(match);

  if (stats.isRemakeCandidate) {
    return [];
  }

  const flags: MistakeFlag[] = [];

  if (match.deaths >= 7) {
    flags.push({
      kind: "high_deaths",
      severity: match.deaths >= 9 ? "high" : "medium",
      title: "Muchas muertes",
      description:
        "La partida supera el umbral de muertes para una revisión post-game.",
      value: match.deaths,
      threshold: 7,
    });
  }

  if (stats.killParticipation < 0.4) {
    flags.push({
      kind: "low_kill_participation",
      severity: stats.killParticipation < 0.25 ? "high" : "medium",
      title: "Baja participación en kills",
      description:
        "La participación en kills está por debajo del objetivo inicial del MVP.",
      value: stats.killParticipation,
      threshold: 0.4,
    });
  }

  if (stats.csPerMinute < 6) {
    flags.push({
      kind: "low_cs_per_minute",
      severity: stats.csPerMinute < 5 ? "high" : "medium",
      title: "CS/min bajo",
      description: "El farmeo por minuto está por debajo del objetivo base.",
      value: stats.csPerMinute,
      threshold: 6,
    });
  }

  if (stats.visionScorePerMinute < 0.6) {
    flags.push({
      kind: "low_vision_score",
      severity: stats.visionScorePerMinute < 0.4 ? "high" : "medium",
      title: "Visión baja",
      description: "La visión por minuto está por debajo del objetivo base.",
      value: stats.visionScorePerMinute,
      threshold: 0.6,
    });
  }

  return flags.sort((a, b) => FLAG_PRIORITY[a.kind] - FLAG_PRIORITY[b.kind]);
}

export function aggregateRecentMatches(
  matches: AnalyticsMatchInput[],
): RecentMatchAggregate {
  const stats = matches.map(computeDerivedStats);
  const flagCounts: Partial<Record<MistakeFlagKind, number>> = {};

  for (const match of matches) {
    for (const flag of detectMistakeFlags(match)) {
      incrementFlagCount(flagCounts, flag.kind);
    }
  }

  const wins = matches.filter((match) => match.win).length;
  const losses = matches.length - wins;

  return {
    matchCount: matches.length,
    wins,
    losses,
    winRate: matches.length > 0 ? wins / matches.length : 0,
    averageKda: round(average(stats.map((stat) => stat.kda))),
    averageCsPerMinute: round(average(stats.map((stat) => stat.csPerMinute))),
    averageKillParticipation: round(
      average(stats.map((stat) => stat.killParticipation)),
      4,
    ),
    averageVisionScorePerMinute: round(
      average(stats.map((stat) => stat.visionScorePerMinute)),
    ),
    flagCounts,
  };
}

export function aggregateByChampion(
  matches: AnalyticsMatchInput[],
): ChampionAggregate[] {
  const groups = new Map<string, AnalyticsMatchInput[]>();

  for (const match of matches) {
    const group = groups.get(match.championName) ?? [];
    group.push(match);
    groups.set(match.championName, group);
  }

  return Array.from(groups.entries())
    .map(([championName, championMatches]) => ({
      championName,
      ...aggregateRecentMatches(championMatches),
    }))
    .sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }

      return a.championName.localeCompare(b.championName);
    });
}

export function generateCoachRecommendations(
  matches: AnalyticsMatchInput[],
): CoachRecommendation[] {
  const aggregate = aggregateRecentMatches(matches);

  return Object.entries(aggregate.flagCounts)
    .map(([kind, occurrences]) => {
      const typedKind = kind as MistakeFlagKind;
      const copy = RECOMMENDATION_COPY[typedKind];

      return {
        kind: typedKind,
        severity: copy.severity,
        title: copy.title,
        description: copy.description,
        occurrences: occurrences ?? 0,
      };
    })
    .filter((recommendation) => recommendation.occurrences > 0)
    .sort((a, b) => {
      if (b.occurrences !== a.occurrences) {
        return b.occurrences - a.occurrences;
      }

      return FLAG_PRIORITY[a.kind] - FLAG_PRIORITY[b.kind];
    });
}

export function analyzeMatches(
  matches: AnalyticsMatchInput[],
): AnalyticsReport {
  return {
    recent: aggregateRecentMatches(matches),
    champions: aggregateByChampion(matches),
    recommendations: generateCoachRecommendations(matches),
  };
}
