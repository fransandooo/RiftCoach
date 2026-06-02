import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "bun:test";
import {
  coachInsights,
  matchParticipants,
  matches,
  playerProfiles,
  rankedSnapshots,
} from "../src/db/schema";

describe("database schema", () => {
  it("defines the core RiftCoach tables", () => {
    expect(getTableName(playerProfiles)).toBe("player_profiles");
    expect(getTableName(rankedSnapshots)).toBe("ranked_snapshots");
    expect(getTableName(matches)).toBe("matches");
    expect(getTableName(matchParticipants)).toBe("match_participants");
    expect(getTableName(coachInsights)).toBe("coach_insights");
  });
});
