import { describe, expect, it } from "bun:test";
import { checkDatabaseConnection } from "../src/db/client";

describe("database client", () => {
  it("checks a real database connection when DATABASE_URL is provided", async () => {
    if (!process.env.DATABASE_URL) {
      console.warn(
        "Skipping real DB connection test because DATABASE_URL is not set",
      );
      return;
    }

    await expect(checkDatabaseConnection()).resolves.toBe(true);
  });
});
