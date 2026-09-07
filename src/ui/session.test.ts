import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { League } from "../league/types";
import { createSetupDefaults, startGame } from "../game/engine";
import { spinAndLand } from "./session";

const league = JSON.parse(
  readFileSync("src/data/league.fixture.json", "utf8"),
) as League;

describe("session helpers", () => {
  it("spinAndLand moves setup game to pick", () => {
    const state = startGame(createSetupDefaults(2), "roundRobin");
    const next = spinAndLand(state, league, () => 0);
    expect(next.phase).toBe("pick");
    expect(next.currentTeamId).toBeTruthy();
  });
});
