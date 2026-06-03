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
  const [count, setCount] = useState(10);
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
    <section className="mx-auto max-w-5xl space-y-5 text-[#202d37]">
      <div className="rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5383e8]">
          Player setup
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
          Connect your Riot ID
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52616d]">
          Save a Riot profile, trigger a backend refresh, and store recent
          post-game data in PostgreSQL through the Bun + Elysia API.
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-sm md:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-[#52616d]">
            Game name
          </span>
          <input
            className="w-full rounded-md border border-[#dbe3ef] bg-[#f7f9fc] px-3 py-2 text-[#202d37] outline-none transition focus:border-[#5383e8] focus:bg-white"
            value={gameName}
            onChange={(event) => setGameName(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[#52616d]">Tag line</span>
          <input
            className="w-full rounded-md border border-[#dbe3ef] bg-[#f7f9fc] px-3 py-2 text-[#202d37] outline-none transition focus:border-[#5383e8] focus:bg-white"
            value={tagLine}
            onChange={(event) => setTagLine(event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-[#52616d]">
            Recent matches
          </span>
          <input
            className="w-full rounded-md border border-[#dbe3ef] bg-[#f7f9fc] px-3 py-2 text-[#202d37] outline-none transition focus:border-[#5383e8] focus:bg-white"
            min={1}
            max={20}
            type="number"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </label>

        <button
          className="self-end rounded-md bg-[#5383e8] px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-[#4171d6] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={handleSetupAndRefresh}
        >
          {isLoading ? "Refreshing..." : "Save & refresh"}
        </button>
      </div>

      {error ? (
        <pre className="overflow-auto rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </pre>
      ) : null}

      {playerProfile ? (
        <div className="rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Saved player</h2>
          <p className="mt-2 font-semibold text-[#202d37]">
            {playerProfile.gameName}#{playerProfile.tagLine}
          </p>
          <p className="mt-1 text-xs text-[#758592]">{playerProfile.id}</p>
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
    <div className="rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#758592]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#202d37]">{value}</p>
    </div>
  );
}
