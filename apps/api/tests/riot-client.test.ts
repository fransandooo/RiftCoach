import { describe, expect, it } from "bun:test";
import {
  createRiotClient,
  RiotApiError,
  RiotMissingApiKeyError,
} from "../src/riot/client";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function createMockFetch(responses: Response[]) {
  const calls: FetchCall[] = [];
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, init });
    const response = responses.shift();

    if (!response) {
      throw new Error(`Unexpected fetch call to ${url}`);
    }

    return response;
  };

  return { calls, fetcher };
}

describe("Riot API client", () => {
  it("requires a Riot API key before making requests", async () => {
    const { fetcher } = createMockFetch([]);
    const client = createRiotClient({
      apiKey: "",
      fetcher,
    });

    await expect(
      client.getAccountByRiotId({
        regionalRoute: "europe",
        gameName: "JUNI",
        tagLine: "MAD",
      }),
    ).rejects.toBeInstanceOf(RiotMissingApiKeyError);
  });

  it("looks up an account by Riot ID with the regional account endpoint", async () => {
    const { calls, fetcher } = createMockFetch([
      jsonResponse({ puuid: "puuid-1", gameName: "JUNI", tagLine: "MAD" }),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    const account = await client.getAccountByRiotId({
      regionalRoute: "europe",
      gameName: "JUNI",
      tagLine: "MAD",
    });

    expect(account).toEqual({
      puuid: "puuid-1",
      gameName: "JUNI",
      tagLine: "MAD",
    });
    expect(calls[0].url).toBe(
      "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/JUNI/MAD",
    );
    expect(new Headers(calls[0].init?.headers).get("X-Riot-Token")).toBe(
      "RGAPI-test",
    );
  });

  it("encodes Riot ID path segments", async () => {
    const { calls, fetcher } = createMockFetch([
      jsonResponse({ puuid: "puuid-1", gameName: "A B", tagLine: "M/D" }),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    await client.getAccountByRiotId({
      regionalRoute: "europe",
      gameName: "A B",
      tagLine: "M/D",
    });

    expect(calls[0].url).toBe(
      "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/A%20B/M%2FD",
    );
  });

  it("fetches summoner data by PUUID from the platform endpoint", async () => {
    const { calls, fetcher } = createMockFetch([
      jsonResponse({ id: "summoner-id", puuid: "puuid-1", profileIconId: 1 }),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    const summoner = await client.getSummonerByPuuid({
      platformRegion: "euw1",
      puuid: "puuid-1",
    });

    expect(summoner.id).toBe("summoner-id");
    expect(calls[0].url).toBe(
      "https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/puuid-1",
    );
  });

  it("fetches ranked entries by PUUID", async () => {
    const { calls, fetcher } = createMockFetch([
      jsonResponse([
        {
          queueType: "RANKED_SOLO_5x5",
          tier: "GOLD",
          rank: "II",
          leaguePoints: 42,
          wins: 12,
          losses: 10,
        },
      ]),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    const entries = await client.getRankedEntriesByPuuid({
      platformRegion: "euw1",
      puuid: "puuid-1",
    });

    expect(entries[0].queueType).toBe("RANKED_SOLO_5x5");
    expect(calls[0].url).toBe(
      "https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/puuid-1",
    );
  });

  it("fetches recent match ids by PUUID with query parameters", async () => {
    const { calls, fetcher } = createMockFetch([
      jsonResponse(["EUW1_1", "EUW1_2"]),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    const matchIds = await client.getMatchIdsByPuuid({
      regionalRoute: "europe",
      puuid: "puuid-1",
      start: 5,
      count: 10,
    });

    expect(matchIds).toEqual(["EUW1_1", "EUW1_2"]);
    expect(calls[0].url).toBe(
      "https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/puuid-1/ids?start=5&count=10",
    );
  });

  it("fetches match detail by match id", async () => {
    const { calls, fetcher } = createMockFetch([
      jsonResponse({
        metadata: { matchId: "EUW1_1" },
        info: { gameDuration: 1800 },
      }),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    const match = await client.getMatchById({
      regionalRoute: "europe",
      matchId: "EUW1_1",
    });

    expect(match.metadata.matchId).toBe("EUW1_1");
    expect(calls[0].url).toBe(
      "https://europe.api.riotgames.com/lol/match/v5/matches/EUW1_1",
    );
  });

  it("maps 403 responses to a typed Riot API error", async () => {
    const { fetcher } = createMockFetch([
      jsonResponse(
        { status: { message: "Forbidden", status_code: 403 } },
        { status: 403 },
      ),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    await expect(
      client.getAccountByRiotId({
        regionalRoute: "europe",
        gameName: "JUNI",
        tagLine: "MAD",
      }),
    ).rejects.toMatchObject({
      name: "RiotApiError",
      status: 403,
      kind: "forbidden",
    });
  });

  it("maps 404 responses to a typed Riot API error", async () => {
    const { fetcher } = createMockFetch([
      jsonResponse(
        { status: { message: "Not Found", status_code: 404 } },
        { status: 404 },
      ),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    await expect(
      client.getMatchById({ regionalRoute: "europe", matchId: "missing" }),
    ).rejects.toMatchObject({
      name: "RiotApiError",
      status: 404,
      kind: "not_found",
    });
  });

  it("maps 429 responses with Retry-After to a typed Riot API error", async () => {
    const { fetcher } = createMockFetch([
      jsonResponse(
        { status: { message: "Rate limit exceeded", status_code: 429 } },
        { status: 429, headers: { "Retry-After": "7" } },
      ),
    ]);
    const client = createRiotClient({ apiKey: "RGAPI-test", fetcher });

    await expect(
      client.getMatchIdsByPuuid({ regionalRoute: "europe", puuid: "puuid-1" }),
    ).rejects.toMatchObject({
      name: "RiotApiError",
      status: 429,
      kind: "rate_limited",
      retryAfterSeconds: 7,
    } satisfies Partial<RiotApiError>);
  });
});
