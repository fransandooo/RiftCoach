import { describe, expect, it } from "bun:test";
import { parseApiEnv } from "../src/config/env";

describe("API environment validation", () => {
  it("requires DATABASE_URL", () => {
    expect(() =>
      parseApiEnv({
        API_HOST: "127.0.0.1",
        API_PORT: "4000",
      }),
    ).toThrow("DATABASE_URL");
  });

  it("parses database URL, Riot key, and default server settings", () => {
    const env = parseApiEnv({
      DATABASE_URL: "postgres://riftcoach:***@localhost:5432/riftcoach",
      RIOT_API_KEY: "RGAPI-test",
    });

    expect(env.DATABASE_URL).toBe(
      "postgres://riftcoach:***@localhost:5432/riftcoach",
    );
    expect(env.RIOT_API_KEY).toBe("RGAPI-test");
    expect(env.API_HOST).toBe("0.0.0.0");
    expect(env.API_PORT).toBe(4000);
    expect(env.WEB_ORIGIN).toBe("http://localhost:3000");
  });

  it("requires RIOT_API_KEY for Riot-backed API calls", () => {
    expect(() =>
      parseApiEnv({
        DATABASE_URL: "postgres://riftcoach:***@localhost:5432/riftcoach",
      }),
    ).toThrow("RIOT_API_KEY");
  });
});
