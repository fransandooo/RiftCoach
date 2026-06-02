"use client";

import { useEffect, useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

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

export default function DashboardPage() {
  const [playerProfileId, setPlayerProfileId] = useState<string | null>(null);
  const [riotId, setRiotId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<RefreshStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus(profileId: string) {
    setError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/players/${profileId}/refresh/status`,
      );
      const json = (await response.json()) as { refresh: RefreshStatus };

      if (!response.ok) {
        throw new Error(JSON.stringify(json));
      }

      setRefresh(json.refresh);
      localStorage.setItem(
        "riftcoach.latestRefresh",
        JSON.stringify(json.refresh),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unknown error",
      );
    }
  }

  useEffect(() => {
    const storedProfileId = localStorage.getItem("riftcoach.playerProfileId");
    const storedRiotId = localStorage.getItem("riftcoach.riotId");
    const storedRefresh = localStorage.getItem("riftcoach.latestRefresh");

    setPlayerProfileId(storedProfileId);
    setRiotId(storedRiotId);

    if (storedRefresh) {
      setRefresh(JSON.parse(storedRefresh) as RefreshStatus);
    }

    if (storedProfileId) {
      void loadStatus(storedProfileId);
    }
  }, []);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
          Imported data
        </p>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="max-w-2xl text-slate-300">
          Shows the latest backend refresh status so the frontend can display
          imported matches, skipped duplicates, and generated coach insights.
        </p>
      </div>

      {playerProfileId ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-sm text-slate-400">Active player</p>
          <p className="mt-2 text-xl font-semibold text-white">{riotId}</p>
          <p className="mt-1 text-xs text-slate-500">{playerProfileId}</p>
          <button
            className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-300"
            onClick={() => void loadStatus(playerProfileId)}
          >
            Poll refresh status
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-950/30 p-5 text-amber-100">
          No player configured yet. Go to /setup and run “Save & refresh”.
        </div>
      )}

      {error ? (
        <pre className="overflow-auto rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
          {error}
        </pre>
      ) : null}

      {refresh ? (
        <div className="grid gap-4 md:grid-cols-5">
          <Metric label="Status" value={refresh.state} />
          <Metric label="Requested" value={refresh.requestedMatches} />
          <Metric label="Imported" value={refresh.importedMatches} />
          <Metric label="Skipped" value={refresh.skippedMatches} />
          <Metric label="Insights" value={refresh.coachInsights} />
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
