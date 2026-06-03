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
  }).format(new Date(value));
}

function queueLabel(queueId: number) {
  if (queueId === 420) return "Ranked Solo";
  if (queueId === 440) return "Ranked Flex";
  if (queueId === 450) return "ARAM";
  return `Queue ${queueId}`;
}

export default function DashboardPage() {
  const [playerProfileId, setPlayerProfileId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const recentRecord = useMemo(() => {
    if (!dashboard) return "0W 0L";
    return `${dashboard.summary.wins}W ${dashboard.summary.losses}L`;
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
    return <PageShell title="Loading dashboard..." />;
  }

  if (!playerProfileId) {
    return (
      <PageShell title="Dashboard">
        <EmptyState
          title="No player configured yet"
          description="Go to /setup, save your Riot ID, and run a manual refresh to import matches."
        />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Dashboard">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
          <p className="font-semibold">Could not load dashboard</p>
          <pre className="mt-3 overflow-auto text-xs text-red-800">{error}</pre>
          <button
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void loadDashboard(playerProfileId)}
          >
            Retry
          </button>
        </div>
      </PageShell>
    );
  }

  if (!dashboard || dashboard.summary.matchCount === 0) {
    return (
      <PageShell title="Dashboard">
        <EmptyState
          title="No imported matches yet"
          description="Run a manual refresh from /setup. Once matches are stored, this page will show KDA, CS/min, vision, trends, and champion stats."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={dashboard.playerProfile.riotId}
      subtitle="Post-game profile overview inspired by OP.GG match history patterns."
      action={
        <button
          className="rounded-md bg-[#5383e8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4171d6]"
          onClick={() => void loadDashboard(playerProfileId)}
        >
          Refresh dashboard
        </button>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <OverviewCard
            matchCount={dashboard.summary.matchCount}
            recentRecord={recentRecord}
            summary={dashboard.summary}
          />
          <RecentFormCard trend={dashboard.winLossTrend} />
          <ChampionPanel champions={dashboard.championSummary} />
        </aside>

        <main className="space-y-4">
          <StatsStrip summary={dashboard.summary} />
          <CoachPanel recommendations={dashboard.coachRecommendations} />
          <MatchHistory matches={dashboard.recentMatches} />
        </main>
      </section>
    </PageShell>
  );
}

function PageShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl space-y-5 text-[#202d37]">
      <div className="flex flex-col gap-3 rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5383e8]">
            RiftCoach Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#202d37]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[#758592]">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function OverviewCard({
  matchCount,
  recentRecord,
  summary,
}: {
  matchCount: number;
  recentRecord: string;
  summary: DashboardSummary;
}) {
  const lossRate = 1 - summary.winRate;

  return (
    <section className="rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#202d37]">
            Recent overview
          </p>
          <p className="mt-1 text-xs text-[#758592]">
            Last {matchCount} imported games
          </p>
        </div>
        <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#5383e8]">
          {recentRecord}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div
          className="grid h-28 w-28 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#5383e8 ${summary.winRate * 360}deg, #e84057 ${summary.winRate * 360}deg ${summary.winRate * 360 + lossRate * 360}deg)`,
          }}
        >
          <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-inner">
            <div>
              <p className="text-2xl font-bold text-[#202d37]">
                {formatPercent(summary.winRate)}
              </p>
              <p className="text-[11px] font-semibold uppercase text-[#758592]">
                Win rate
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-sm">
          <MetricRow label="KDA" value={formatNumber(summary.averageKda)} />
          <MetricRow
            label="CS/min"
            value={formatNumber(summary.averageCsPerMinute)}
          />
          <MetricRow
            label="Vision/min"
            value={formatNumber(summary.averageVisionScorePerMinute)}
          />
        </div>
      </div>
    </section>
  );
}

function RecentFormCard({ trend }: { trend: DashboardTrendPoint[] }) {
  return (
    <section className="rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Recent form</p>
          <p className="mt-1 text-xs text-[#758592]">Oldest to newest</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {trend.map((point) => (
          <span
            className={`grid h-8 w-8 place-items-center rounded text-xs font-bold text-white shadow-sm ${point.win ? "bg-[#5383e8]" : "bg-[#e84057]"}`}
            key={point.matchId}
            title={`${point.championName} · ${point.win ? "Win" : "Loss"}`}
          >
            {point.win ? "W" : "L"}
          </span>
        ))}
      </div>
    </section>
  );
}

function StatsStrip({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Average KDA"
        value={formatNumber(summary.averageKda)}
        tone="blue"
      />
      <StatTile
        label="CS/min"
        value={formatNumber(summary.averageCsPerMinute)}
        tone="gold"
      />
      <StatTile
        label="Kill participation"
        value={formatPercent(summary.averageKillParticipation)}
        tone="purple"
      />
      <StatTile
        label="Vision/min"
        value={formatNumber(summary.averageVisionScorePerMinute)}
        tone="green"
      />
    </section>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "gold" | "purple" | "green";
}) {
  const tones = {
    blue: "bg-[#eef4ff] text-[#5383e8]",
    gold: "bg-[#fff7df] text-[#c98a00]",
    purple: "bg-[#f3efff] text-[#7c5cff]",
    green: "bg-[#eaf8f0] text-[#16a466]",
  };

  return (
    <div className="rounded-xl border border-[#dbe3ef] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#758592]">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold tracking-[-0.04em] text-[#202d37]">
          {value}
        </p>
        <span
          className={`rounded-md px-2 py-1 text-xs font-bold ${tones[tone]}`}
        >
          AVG
        </span>
      </div>
    </div>
  );
}

function MatchHistory({ matches }: { matches: DashboardRecentMatch[] }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-[#202d37]">Match history</h2>
          <p className="text-sm text-[#758592]">
            OP.GG-style compact post-game cards
          </p>
        </div>
      </div>

      {matches.slice(0, 10).map((match) => (
        <MatchCard key={match.matchId} match={match} />
      ))}
    </section>
  );
}

function MatchCard({ match }: { match: DashboardRecentMatch }) {
  const resultClasses = match.win
    ? "border-[#b8cdfa] bg-[#ecf2ff]"
    : "border-[#f1c6cc] bg-[#fff1f3]";
  const resultText = match.win ? "text-[#5383e8]" : "text-[#e84057]";

  return (
    <article
      className={`overflow-hidden rounded-xl border shadow-sm ${resultClasses}`}
    >
      <div className="grid gap-3 p-4 md:grid-cols-[110px_1.25fr_150px_170px] md:items-center">
        <div>
          <p className={`text-sm font-bold ${resultText}`}>
            {match.win ? "Victory" : "Defeat"}
          </p>
          <p className="mt-1 text-xs font-medium text-[#758592]">
            {queueLabel(match.queueId)}
          </p>
          <p className="mt-1 text-xs text-[#9aa8b4]">
            {formatDate(match.gameCreation)}
          </p>
          <p className="mt-2 text-xs font-semibold text-[#758592]">
            {formatDuration(match.gameDurationSeconds)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ChampionAvatar name={match.championName} />
          <div>
            <p className="text-base font-bold text-[#202d37]">
              {match.championName}
            </p>
            <p className="mt-1 font-mono text-xs text-[#758592]">
              {match.matchId}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xl font-bold text-[#202d37]">
            {match.kills} /{" "}
            <span className="text-[#e84057]">{match.deaths}</span> /{" "}
            {match.assists}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#758592]">
            {formatNumber(match.kda)} KDA
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <SmallStat label="CS/m" value={formatNumber(match.csPerMinute)} />
          <SmallStat
            label="KP"
            value={formatPercent(match.killParticipation)}
          />
          <SmallStat
            label="Vision"
            value={formatNumber(match.visionScorePerMinute)}
          />
        </div>
      </div>
    </article>
  );
}

function ChampionPanel({
  champions,
}: {
  champions: DashboardChampionSummary[];
}) {
  return (
    <section className="rounded-xl border border-[#dbe3ef] bg-white shadow-sm">
      <div className="border-b border-[#ebeef1] p-4">
        <h2 className="text-sm font-bold text-[#202d37]">
          Most played champions
        </h2>
        <p className="mt-1 text-xs text-[#758592]">Performance by champion</p>
      </div>
      <div className="divide-y divide-[#ebeef1]">
        {champions.slice(0, 7).map((champion) => (
          <div
            className="flex items-center gap-3 p-4"
            key={champion.championName}
          >
            <ChampionAvatar name={champion.championName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#202d37]">
                {champion.championName}
              </p>
              <p className="mt-0.5 text-xs text-[#758592]">
                {champion.matchCount} games · {champion.wins}W {champion.losses}
                L
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-bold ${champion.winRate >= 0.5 ? "text-[#5383e8]" : "text-[#e84057]"}`}
              >
                {formatPercent(champion.winRate)}
              </p>
              <p className="text-xs text-[#758592]">
                {formatNumber(champion.averageKda)} KDA
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoachPanel({
  recommendations,
}: {
  recommendations: DashboardCoachRecommendation[];
}) {
  return (
    <section className="rounded-xl border border-[#dbe3ef] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#202d37]">Coach notes</h2>
          <p className="text-sm text-[#758592]">
            Deterministic issues detected in recent games
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {recommendations.length === 0 ? (
          <p className="text-sm text-[#758592]">
            No active recommendations yet.
          </p>
        ) : (
          recommendations.map((recommendation) => (
            <div
              className="rounded-lg border border-[#ebeef1] bg-[#f7f9fc] p-3"
              key={recommendation.title}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-[#202d37]">
                  {recommendation.title}
                </p>
                <span className="rounded bg-[#eef4ff] px-2 py-1 text-[10px] font-bold uppercase text-[#5383e8]">
                  {recommendation.severity}
                </span>
              </div>
              <p className="mt-2 text-sm leading-5 text-[#52616d]">
                {recommendation.description}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ChampionAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const initials = name.slice(0, 2).toUpperCase();
  const dimensions = size === "sm" ? "h-10 w-10 text-xs" : "h-14 w-14 text-sm";

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5383e8] to-[#7c5cff] font-black text-white shadow-sm ${dimensions}`}
    >
      {initials}
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/60 px-2 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#9aa8b4]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#202d37]">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#ebeef1] py-2 last:border-0">
      <span className="text-[#758592]">{label}</span>
      <span className="font-bold text-[#202d37]">{value}</span>
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
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 max-w-2xl text-sm text-amber-800">{description}</p>
    </div>
  );
}
