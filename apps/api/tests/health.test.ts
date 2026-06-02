import { describe, expect, it } from "bun:test";
import { app } from "../src/index";

describe("health route", () => {
  it("returns ok status", async () => {
    const response = await app.handle(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "riftcoach-api",
    });
  });
});
