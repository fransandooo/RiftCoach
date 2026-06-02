import { describe, expect, it } from "bun:test";
import { createApp } from "../src/index";
import type { RefreshService } from "../src/refresh/types";

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("refresh API routes", () => {
  const refreshService: RefreshService = {
    setupPlayer: async (input) => ({
      id: "profile-1",
      gameName: input.gameName,
      tagLine: input.tagLine,
      platformRegion: input.platformRegion,
      regionalRoute: input.regionalRoute,
      puuid: "player-puuid",
    }),
    refreshPlayer: async () => ({
      playerProfileId: "profile-1",
      state: "completed",
      requestedMatches: 2,
      importedMatches: 1,
      skippedMatches: 1,
      coachInsights: 2,
      error: undefined,
      startedAt: "2026-06-02T10:00:00.000Z",
      completedAt: "2026-06-02T10:00:01.000Z",
    }),
    getRefreshStatus: async () => ({
      playerProfileId: "profile-1",
      state: "completed",
      requestedMatches: 2,
      importedMatches: 1,
      skippedMatches: 1,
      coachInsights: 2,
      error: undefined,
      startedAt: "2026-06-02T10:00:00.000Z",
      completedAt: "2026-06-02T10:00:01.000Z",
    }),
  };

  it("sets up a player profile", async () => {
    const app = createApp({ refreshService });

    const response = await app.handle(
      jsonRequest("/players/setup", {
        gameName: "JUNI",
        tagLine: "MAD",
        platformRegion: "euw1",
        regionalRoute: "europe",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      playerProfile: {
        id: "profile-1",
        gameName: "JUNI",
        tagLine: "MAD",
        puuid: "player-puuid",
      },
    });
  });

  it("triggers a manual refresh", async () => {
    const app = createApp({ refreshService });

    const response = await app.handle(
      jsonRequest("/players/profile-1/refresh", { count: 2 }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      refresh: {
        state: "completed",
        importedMatches: 1,
        skippedMatches: 1,
      },
    });
  });

  it("returns refresh status", async () => {
    const app = createApp({ refreshService });

    const response = await app.handle(
      new Request("http://localhost/players/profile-1/refresh/status"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      refresh: {
        state: "completed",
        importedMatches: 1,
        skippedMatches: 1,
      },
    });
  });
});
