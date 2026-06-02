import { getApiEnv } from "../config/env";
import { createRiotClient } from "./client";

const env = getApiEnv();
const client = createRiotClient({ apiKey: env.RIOT_API_KEY });

const regionalRoute = "europe";
const platformRegion = "euw1";
const gameName = "JUNI";
const tagLine = "MAD";

const account = await client.getAccountByRiotId({
  regionalRoute,
  gameName,
  tagLine,
});

console.log(`Account OK: ${account.gameName}#${account.tagLine}`);
console.log(`PUUID prefix: ${account.puuid.slice(0, 8)}...`);

const summoner = await client.getSummonerByPuuid({
  platformRegion,
  puuid: account.puuid,
});

console.log(`Summoner OK: level ${summoner.summonerLevel ?? "unknown"}`);

const rankedEntries = await client.getRankedEntriesByPuuid({
  platformRegion,
  puuid: account.puuid,
});

console.log(`Ranked entries OK: ${rankedEntries.length}`);

const matchIds = await client.getMatchIdsByPuuid({
  regionalRoute,
  puuid: account.puuid,
  start: 0,
  count: 1,
});

console.log(`Match IDs OK: ${matchIds.length}`);

if (matchIds[0]) {
  const match = await client.getMatchById({
    regionalRoute,
    matchId: matchIds[0],
  });

  console.log(`Match detail OK: ${match.metadata.matchId}`);
}
