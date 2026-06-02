"use client";

import { useEffect, useMemo, useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type DashboardSummary = {
  matchCount: number;
  wins: number;
  losses: number;
  winRate: number;
  averageKda: number;
  averageCsPerMinute: number;
  averageKillParticipation: number;
  averageVisionScorePerMinute: number;
};

type DashboardRecentMatch = {
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

type DashboardTrendPoint = {
  matchId: string;
  championName: string;
  win: boolean;
  gameCreation: string;
};

type DashboardChampionSummary = {
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

type DashboardCoachRecommendation = {
  title: string;
  severity: string;
  description: string;
};

type RefreshStatus = {
  state: string;
  requestedMatches: number;
  importedMatches: number;
  skippedMatches: number;
  coachInsights: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

type PlayerDashboard = {
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number, decimals = 2) {
  return value.toFixed(decimals).replace(/\.00$/, "");
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const [playerProfileId, setPlayerProfileId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const recentRecord = useMemo(() => {
    if (!dashboard) {
      return "0W - 0L";
    }

    return `${dashboard.summary.wins}W - ${dashboard.summary.losses}L`;
  }, [dashboard]);

  async function loadDashboard(profileId: string) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/players/${profileId}/dashboard`,
      );
      const json = (await response.json()) as { dashboard: PlayerDashboard };

      if (!response.ok) {
        throw new Error(JSON.stringify(json));
      }

      setDashboard(json.dashboard);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unknown error",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const storedProfileId = localStorage.getItem("riftcoach.playerProfileId");
    setPlayerProfileId(storedProfileId);

    if (storedProfileId) {
      void loadDashboard(storedProfileId);
      return;
    }

    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <DashboardShell title="Loading dashboard..." />;
  }

  if (!playerProfileId) {
    return (
      <DashboardShell title="Dashboard">
        <EmptyState
          title="No player configured yet"
          description="Go to /setup, save your Riot ID, and run a manual refresh to import matches."
        />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Dashboard">
        <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-5 text-red-100">
          <p className="font-medium">Could not load dashboard</p>
          <pre className="mt-3 overflow-auto text-xs text-red-100/80">
            {error}
          </pre>
          <button
            className="mt-4 rounded-lg border border-red-300/30 px-4 py-2 text-sm"
            onClick={() => void loadDashboard(playerProfileId)}
          >
            Retry
          </button>
        </div>
      </DashboardShell>
    );
  }

  if (!dashboard || dashboard.summary.matchCount === 0) {
    return (
      <DashboardShell title="Dashboard">
        <EmptyState
          title="No imported matches yet"
          description="Run a manual refresh from /setup. Once matches are stored, this page will show KDA, CS/min, vision, trends, and champion stats."
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Recent competitive form, champion patterns, and post-game coaching signals."
    >
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(94,106,210,0.22),transparent_36%),rgba(255,255,255,0.03)] p-6 shadow-2xl shadow-black/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-indigo-300">
              Live profile
            </p>
            <h1 className="mt-3 text-4xl font-medium tracking-[-0.04em] text-slate-50 md:text-5xl">
              {dashboard.playerProfile.riotId}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              {dashboard.summary.matchCount} imported matches analysed. Latest
              refresh: {dashboard.refresh?.state ?? "not available"}.
            </p>
          </div>

          <button
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-indigo-300/50 hover:bg-indigo-400/10"
            onClick={() => void loadDashboard(playerProfileId)}
          >
            Refresh dashboard
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Recent record"
          value={recentRecord}
          detail={`${formatPercent(dashboard.summary.winRate)} win rate`}
          accent="indigo"
        />
        <SummaryCard
          label="Average KDA"
          value={formatNumber(dashboard.summary.averageKda)}
          detail="Kills + assists / deaths"
        />
        <SummaryCard
          label="CS/min"
          value={formatNumber(dashboard.summary.averageCsPerMinute)}
          detail="Lane + neutral farm"
        />
        <SummaryCard
          label="KP"
          value={formatPercent(dashboard.summary.averageKillParticipation)}
          detail="Kill participation"
        />
        <SummaryCard
          label="Vision/min"
          value={formatNumber(dashboard.summary.averageVisionScorePerMinute)}
          detail="Vision score pace"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Win/loss trend"
          description="Last imported matches, oldest to newest."
        >
          <div className="flex items-end gap-2 pt-4">
            {dashboard.winLossTrend.map((point, index) => (
              <div
                className="flex flex-1 flex-col items-center gap-2"
                key={point.matchId}
              >
                <div
                  className={`h-20 w-full rounded-t-lg border ${point.win ? "border-emerald-300/40 bg-emerald-400/70" : "border-red-300/40 bg-red-400/55"}`}
                  title={`${point.championName} ${point.win ? "Win" : "Loss"}`}
                  style={{ opacity: 0.55 + index / 22 }}
                />
                <span className="max-w-16 truncate text-[10px] text-slate-500">
                  {point.championName}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Coach recommendations"
          description="Current deterministic insights from stored games."
        >
          <div className="space-y-3">
            {dashboard.coachRecommendations.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active recommendations yet.
              </p>
            ) : (
              dashboard.coachRecommendations.map((recommendation) => (
                <div
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-4"
                  key={recommendation.title}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-100">
                      {recommendation.title}
                    </p>
                    <span className="rounded-full border border-indigo-300/20 bg-indigo-400/10 px-2 py-1 text-[10px] uppercase tracking-wide text-indigo-200">
                      {recommendation.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-400">
                    {recommendation.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </Panel>
      </section>

      <Panel
        title="Recent matches"
        description="Core post-game stats imported from Riot."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border-b border-white/10 pb-3">Match</th>
                <th className="border-b border-white/10 pb-3">Champion</th>
                <th className="border-b border-white/10 pb-3">Result</th>
                <th className="border-b border-white/10 pb-3">KDA</th>
                <th className="border-b border-white/10 pb-3">CS/min</th>
                <th className="border-b border-white/10 pb-3">KP</th>
                <th className="border-b border-white/10 pb-3">Vision/min</th>
                <th className="border-b border-white/10 pb-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentMatches.slice(0, 10).map((match) => (
                <tr className="text-slate-300" key={match.matchId}>
                  <td className="border-b border-white/[0.06] py-3">
                    <div className="font-mono text-xs text-slate-400">
                      {match.matchId}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {formatDate(match.gameCreation)}
                    </div>
                  </td>
                  <td className="border-b border-white/[0.06] py-3 font-medium text-slate-100">
                    {match.championName}
                  </td>
                  <td className="border-b border-white/[0.06] py-3">
                    <ResultPill win={match.win} />
                  </td>
                  <td className="border-b border-white/[0.06] py-3">
                    {match.kills}/{match.deaths}/{match.assists}{" "}
                    <span className="text-slate-500">
                      ({formatNumber(match.kda)})
                    </span>
                  </td>
                  <td className="border-b border-white/[0.06] py-3">
                    {formatNumber(match.csPerMinute)}
                  </td>
                  <td className="border-b border-white/[0.06] py-3">
                    {formatPercent(match.killParticipation)}
                  </td>
                  <td className="border-b border-white/[0.06] py-3">
                    {formatNumber(match.visionScorePerMinute)}
                  </td>
                  <td className="border-b border-white/[0.06] py-3">
                    {formatDuration(match.gameDurationSeconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Champion summary"
        description="Your most played champions in the imported sample."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.championSummary.map((champion) => (
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
              key={champion.championName}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">
                    {champion.championName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {champion.matchCount} matches · {champion.wins}W{" "}
                    {champion.losses}L
                  </p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
                  {formatPercent(champion.winRate)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <MiniMetric
                  label="KDA"
                  value={formatNumber(champion.averageKda)}
                />
                <MiniMetric
                  label="CS/min"
                  value={formatNumber(champion.averageCsPerMinute)}
                />
                <MiniMetric
                  label="KP"
                  value={formatPercent(champion.averageKillParticipation)}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </DashboardShell>
  );
}

function DashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-indigo-300">
          RiftCoach MVP
        </p>
        <h1 className="text-3xl font-medium tracking-[-0.03em] text-slate-50">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  accent = "slate",
}: {
  label: string;
  value: string;
  detail: string;
  accent?: "indigo" | "slate";
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${accent === "indigo" ? "border-indigo-300/20 bg-indigo-400/10" : "border-white/10 bg-white/[0.025]"}`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-medium tracking-[-0.04em] text-slate-50">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-xl shadow-black/20">
      <div className="mb-4">
        <h2 className="text-lg font-medium tracking-[-0.02em] text-slate-100">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ResultPill({ win }: { win: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${win ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}
    >
      {win ? "Win" : "Loss"}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 p-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 font-medium text-slate-200">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-6 text-amber-50">
      <p className="font-medium">{title}</p>
      <p className="mt-2 max-w-2xl text-sm text-amber-100/75">{description}</p>
    </div>
  );
}
