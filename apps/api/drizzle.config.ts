import { defineConfig } from "drizzle-kit";
import { parseApiEnv } from "./src/config/env";

const env = parseApiEnv(process.env);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
