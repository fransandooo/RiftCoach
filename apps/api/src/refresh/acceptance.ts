import { createPostgresClient } from "../db/client";
import { createApp } from "../index";

function postJson(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  const body = await response.json();

  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status}: ${JSON.stringify(body)}`,
    );
  }

  return body as Record<string, unknown>;
}

async function getMatchCount() {
  const sql = createPostgresClient();

  try {
    const rows = await sql<
      { count: string }[]
    >`select count(*)::text as count from matches`;
    return Number.parseInt(rows[0]?.count ?? "0", 10);
  } finally {
    await sql.end();
  }
}

const app = createApp();
const refreshCount = 5;

const beforeMatches = await getMatchCount();

const setup = await readJson(
  await app.handle(
    postJson("/players/setup", {
      gameName: "JUNI",
      tagLine: "MAD",
      platformRegion: "euw1",
      regionalRoute: "europe",
    }),
  ),
);

const playerProfile = setup.playerProfile as {
  id: string;
  gameName: string;
  tagLine: string;
};

const first = await readJson(
  await app.handle(
    postJson(`/players/${playerProfile.id}/refresh`, { count: refreshCount }),
  ),
);
const afterFirstMatches = await getMatchCount();

const second = await readJson(
  await app.handle(
    postJson(`/players/${playerProfile.id}/refresh`, { count: refreshCount }),
  ),
);
const afterSecondMatches = await getMatchCount();

const status = await readJson(
  await app.handle(
    new Request(`http://localhost/players/${playerProfile.id}/refresh/status`),
  ),
);

console.log(
  JSON.stringify(
    {
      playerProfile: {
        id: playerProfile.id,
        riotId: `${playerProfile.gameName}#${playerProfile.tagLine}`,
      },
      databaseRows: {
        matchesBefore: beforeMatches,
        matchesAfterFirstRefresh: afterFirstMatches,
        matchesAfterSecondRefresh: afterSecondMatches,
      },
      firstRefresh: first.refresh,
      secondRefresh: second.refresh,
      latestStatus: status.refresh,
      duplicateCheck: {
        secondRefreshAddedRows: afterSecondMatches - afterFirstMatches,
      },
    },
    null,
    2,
  ),
);

process.exit(0);
