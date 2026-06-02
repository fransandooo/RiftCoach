import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  RIOT_API_KEY: z.string().min(1, "RIOT_API_KEY is required"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function parseApiEnv(source: NodeJS.ProcessEnv): ApiEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const messages = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid API environment: ${messages.join("; ")}`);
  }

  return parsed.data;
}

let cachedEnv: ApiEnv | undefined;

export function getApiEnv() {
  cachedEnv ??= parseApiEnv(process.env);
  return cachedEnv;
}
