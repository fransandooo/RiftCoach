import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { parseApiEnv } from "./config/env";
import { createPostgresRefreshRepository } from "./refresh/repository";
import { createRefreshService } from "./refresh/service";
import type { RefreshService } from "./refresh/types";
import { createRiotClient } from "./riot/client";

const defaultWebOrigin = "http://localhost:3000";

type AppDependencies = {
  refreshService?: RefreshService;
};

function getDefaultRefreshService() {
  const env = parseApiEnv(process.env);
  return createRefreshService({
    repository: createPostgresRefreshRepository(),
    riotClient: createRiotClient({ apiKey: env.RIOT_API_KEY }),
  });
}

export function createApp(dependencies: AppDependencies = {}) {
  let defaultRefreshService: RefreshService | undefined;
  const getRefreshService = () => {
    if (dependencies.refreshService) {
      return dependencies.refreshService;
    }

    defaultRefreshService ??= getDefaultRefreshService();
    return defaultRefreshService;
  };

  return new Elysia()
    .use(
      cors({
        origin: process.env.WEB_ORIGIN ?? defaultWebOrigin,
      }),
    )
    .get("/health", () => ({
      status: "ok",
      service: "riftcoach-api",
      version: "0.1.0",
    }))
    .get("/", () => ({
      name: "RiftCoach API",
      health: "/health",
    }))
    .post(
      "/players/setup",
      async ({ body }) => {
        const playerProfile = await getRefreshService().setupPlayer(body);
        return { playerProfile };
      },
      {
        body: t.Object({
          gameName: t.String({ minLength: 1 }),
          tagLine: t.String({ minLength: 1 }),
          platformRegion: t.Union([
            t.Literal("br1"),
            t.Literal("eun1"),
            t.Literal("euw1"),
            t.Literal("jp1"),
            t.Literal("kr"),
            t.Literal("la1"),
            t.Literal("la2"),
            t.Literal("na1"),
            t.Literal("oc1"),
            t.Literal("tr1"),
            t.Literal("ru"),
          ]),
          regionalRoute: t.Union([
            t.Literal("americas"),
            t.Literal("asia"),
            t.Literal("europe"),
            t.Literal("sea"),
          ]),
        }),
      },
    )
    .post(
      "/players/:playerProfileId/refresh",
      async ({ body, params }) => {
        const refresh = await getRefreshService().refreshPlayer({
          playerProfileId: params.playerProfileId,
          count: body.count,
        });
        return { refresh };
      },
      {
        body: t.Object({
          count: t.Optional(t.Number({ minimum: 1, maximum: 20 })),
        }),
      },
    )
    .get("/players/:playerProfileId/refresh/status", async ({ params }) => {
      const refresh = await getRefreshService().getRefreshStatus(
        params.playerProfileId,
      );
      return { refresh };
    });
}

export const app = createApp();

if (import.meta.main) {
  const env = parseApiEnv(process.env);
  app.listen({ hostname: env.API_HOST, port: env.API_PORT });
  console.log(
    `RiftCoach API listening on http://${env.API_HOST}:${env.API_PORT}`,
  );
}
