import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { parseApiEnv } from "./config/env";

const defaultWebOrigin = "http://localhost:3000";

export const app = new Elysia()
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
  }));

if (import.meta.main) {
  const env = parseApiEnv(process.env);
  app.listen({ hostname: env.API_HOST, port: env.API_PORT });
  console.log(
    `RiftCoach API listening on http://${env.API_HOST}:${env.API_PORT}`,
  );
}
