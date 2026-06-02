import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getApiEnv } from "../config/env";
import * as schema from "./schema";

export function createPostgresClient(databaseUrl = getApiEnv().DATABASE_URL) {
  return postgres(databaseUrl, {
    max: 10,
  });
}

export function createDbClient(databaseUrl = getApiEnv().DATABASE_URL) {
  const queryClient = createPostgresClient(databaseUrl);
  return drizzle(queryClient, { schema });
}

export const db = createDbClient;

export async function checkDatabaseConnection(
  databaseUrl = getApiEnv().DATABASE_URL,
) {
  const client = createPostgresClient(databaseUrl);

  try {
    const result = await client<{ ok: number }[]>`select 1 as ok`;
    return result[0]?.ok === 1;
  } finally {
    await client.end();
  }
}
