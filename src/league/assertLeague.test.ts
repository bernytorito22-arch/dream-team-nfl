import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertLeague } from "./assertLeague";
import type { League } from "./types";

describe("league.json", () => {
  it("meets the 2026 short-menu contract", () => {
    const league = JSON.parse(
      readFileSync("src/data/league.json", "utf8"),
    ) as League;
    expect(() => assertLeague(league)).not.toThrow();
  });
});
