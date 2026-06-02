"use client";

import { useState } from "react";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type PlayerProfile = {
  id: string;
  gameName: string;
  tagLine: string;
  puuid: string;
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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(json));
  }

  return json as T;
}

export default function SetupPage() {
  const [gameName, setGameName] = useState("JUNI");
  const [tagLine, setTagLine] = useState("MAD");
  const [count, setCount] = useState(2);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(
    null,
  );
  const [refresh, setRefresh] = useState<RefreshStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSetupAndRefresh() {
    setIsLoading(true);
    setError(null);

    try {
      const setup = await postJson<{ playerProfile: PlayerProfile }>(
        "/players/setup",
        {
          gameName,
          tagLine,
          platformRegion: "euw1",
          regionalRoute: "europe",
        },
      );
      setPlayerProfile(setup.playerProfile);
      localStorage.setItem("riftcoach.playerProfileId", setup.playerProfile.id);
      localStorage.setItem(
        "riftcoach.riotId",
        `${setup.playerProfile.gameName}#${setup.playerProfile.tagLine}`,
      );

      const refreshed = await postJson<{ refresh: RefreshStatus }>(
        `/players/${setup.playerProfile.id}/refresh`,
        { count },
      );
      setRefresh(refreshed.refresh);
      localStorage.setItem(
        "riftcoach.latestRefresh",
        JSON.stringify(refreshed.refresh),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unknown error",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
          Phase 5
        </p>
        <h1 className="text-3xl font-bold">Player setup & manual refresh</h1>
        <p className="max-w-2xl text-slate-300">
          Connect your Riot ID, trigger a backend refresh, and store recent
          post-game data in PostgreSQL through the Bun + Elysia API.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 md:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm text-slate-400">Game name</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            value={gameName}
            onChange={(event) => setGameName(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-400">Tag line</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            value={tagLine}
            onChange={(event) => setTagLine(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-400">Recent matches</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            min={1}
            max={20}
            type="number"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </label>

        <button
          className="self-end rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={handleSetupAndRefresh}
        >
          {isLoading ? "Refreshing..." : "Save & refresh"}
        </button>
      </div>

      {error ? (
        <pre className="overflow-auto rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
          {error}
        </pre>
      ) : null}

      {playerProfile ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-xl font-semibold">Saved player</h2>
          <p className="mt-2 text-slate-300">
            {playerProfile.gameName}#{playerProfile.tagLine}
          </p>
          <p className="mt-1 text-xs text-slate-500">{playerProfile.id}</p>
        </div>
      ) : null}

      {refresh ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Status" value={refresh.state} />
          <Metric label="Imported" value={refresh.importedMatches} />
          <Metric label="Skipped existing" value={refresh.skippedMatches} />
          <Metric label="Coach insights" value={refresh.coachInsights} />
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
