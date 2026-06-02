import { describe, expect, it } from "bun:test";
import { createRefreshService } from "../src/refresh/service";
import type {
  PlayerProfileRecord,
  RefreshRepository,
  RefreshStatus,
  StoredMatchCandidate,
} from "../src/refresh/types";
import type {
  RiotAccount,
  RiotMatch,
  RiotRankedEntry,
} from "../src/riot/client";

const account: RiotAccount = {
  puuid: "player-puuid",
  gameName: "JUNI",
  tagLine: "MAD",
};

const rankedEntries: RiotRankedEntry[] = [
  {
    queueType: "RANKED_SOLO_5x5",
    tier: "GOLD",
    rank: "II",
    leaguePoints: 42,
    wins: 20,
    losses: 18,
  },
];

function riotMatch(matchId: string): RiotMatch {
  return {
    metadata: { matchId, participants: ["player-puuid", "ally-puuid"] },
    info: {
      gameCreation: 1_700_000_000_000,
      gameDuration: 1800,
      gameMode: "CLASSIC",
      queueId: 420,
      platformId: "EUW1",
      participants: [
        {
          puuid: "player-puuid",
          riotIdGameName: "JUNI",
          riotIdTagline: "MAD",
          championName: matchId.endsWith("1") ? "Ahri" : "Yasuo",
          championId: matchId.endsWith("1") ? 103 : 157,
          teamId: 100,
          win: matchId.endsWith("1"),
          lane: "MIDDLE",
          role: "SOLO",
          kills: matchId.endsWith("1") ? 8 : 3,
          deaths: matchId.endsWith("1") ? 2 : 9,
          assists: matchId.endsWith("1") ? 10 : 4,
          totalMinionsKilled: matchId.endsWith("1") ? 210 : 130,
          neutralMinionsKilled: 0,
          goldEarned: 12000,
          totalDamageDealtToChampions: 23000,
          visionScore: matchId.endsWith("1") ? 24 : 9,
          wardsPlaced: 10,
          wardsKilled: 3,
        },
        {
          puuid: "ally-puuid",
          riotIdGameName: "ALLY",
          riotIdTagline: "EUW",
          championName: "LeeSin",
          championId: 64,
          teamId: 100,
          win: matchId.endsWith("1"),
          kills: 10,
          deaths: 4,
          assists: 8,
          totalMinionsKilled: 40,
          neutralMinionsKilled: 130,
          goldEarned: 11000,
          totalDamageDealtToChampions: 18000,
          visionScore: 20,
          wardsPlaced: 8,
          wardsKilled: 4,
        },
      ],
    },
  };
}

class InMemoryRefreshRepository implements RefreshRepository {
  profile: PlayerProfileRecord | undefined;
  matches = new Map<string, StoredMatchCandidate>();
  insights: unknown[] = [];
  statuses = new Map<string, RefreshStatus>();

  async upsertPlayerProfile(input: Omit<PlayerProfileRecord, "id">) {
    this.profile = { id: "profile-1", ...input };
    return this.profile;
  }

  async getPlayerProfile(playerProfileId: string) {
    return this.profile?.id === playerProfileId ? this.profile : undefined;
  }

  async replaceRankedSnapshots() {}

  async findExistingMatchIds(matchIds: string[]) {
    return matchIds.filter((matchId) => this.matches.has(matchId));
  }

  async insertMatchWithParticipant(
    _playerProfileId: string,
    candidate: StoredMatchCandidate,
  ) {
    this.matches.set(candidate.riotMatchId, candidate);
  }

  async replaceCoachInsights(_playerProfileId: string, insights: unknown[]) {
    this.insights = insights;
  }

  async saveRefreshStatus(playerProfileId: string, status: RefreshStatus) {
    this.statuses.set(playerProfileId, status);
  }

  async getRefreshStatus(playerProfileId: string) {
    return this.statuses.get(playerProfileId);
  }
}

describe("refresh service", () => {
  it("sets up a player profile through Riot account lookup", async () => {
    const repository = new InMemoryRefreshRepository();
    const service = createRefreshService({
      repository,
      riotClient: {
        getAccountByRiotId: async () => account,
        getRankedEntriesByPuuid: async () => rankedEntries,
        getMatchIdsByPuuid: async () => [],
        getMatchById: async () => riotMatch("EUW1_1"),
      },
    });

    const profile = await service.setupPlayer({
      gameName: "JUNI",
      tagLine: "MAD",
      platformRegion: "euw1",
      regionalRoute: "europe",
    });

    expect(profile).toMatchObject({
      id: "profile-1",
      gameName: "JUNI",
      tagLine: "MAD",
      puuid: "player-puuid",
    });
  });

  it("imports only new matches and skips already stored matches on rerun", async () => {
    const repository = new InMemoryRefreshRepository();
    repository.profile = {
      id: "profile-1",
      gameName: "JUNI",
      tagLine: "MAD",
      puuid: "player-puuid",
      platformRegion: "euw1",
      regionalRoute: "europe",
    };

    let matchDetailCalls = 0;
    const service = createRefreshService({
      repository,
      riotClient: {
        getAccountByRiotId: async () => account,
        getRankedEntriesByPuuid: async () => rankedEntries,
        getMatchIdsByPuuid: async () => ["EUW1_1", "EUW1_2"],
        getMatchById: async ({ matchId }) => {
          matchDetailCalls += 1;
          return riotMatch(matchId);
        },
      },
    });

    const first = await service.refreshPlayer({
      playerProfileId: "profile-1",
      count: 2,
    });
    const second = await service.refreshPlayer({
      playerProfileId: "profile-1",
      count: 2,
    });

    expect(first).toMatchObject({
      importedMatches: 2,
      skippedMatches: 0,
      requestedMatches: 2,
    });
    expect(second).toMatchObject({
      importedMatches: 0,
      skippedMatches: 2,
      requestedMatches: 2,
    });
    expect(repository.matches.size).toBe(2);
    expect(matchDetailCalls).toBe(2);
    expect(repository.insights.length).toBeGreaterThan(0);
    expect(await repository.getRefreshStatus("profile-1")).toMatchObject({
      state: "completed",
      importedMatches: 0,
      skippedMatches: 2,
    });
  });
});
