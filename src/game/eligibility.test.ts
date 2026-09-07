import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DreamTeam, League } from "../league/types";
import {
  emptySlots,
  legalMenu,
  legalTeamsForPlayer,
} from "./eligibility";

const league = JSON.parse(
  readFileSync("src/data/league.fixture.json", "utf8"),
) as League;

const emptyBerny: DreamTeam = { playerId: "p0", name: "Berny", picks: [] };

describe("eligibility", () => {
  it("empty roster has 9 empty slots", () => {
    expect(emptySlots(emptyBerny)).toHaveLength(9);
  });

  it("does not offer a franchise already on this dream team", () => {
    const berny: DreamTeam = {
      playerId: "p0",
      name: "Berny",
      picks: [{ slotId: "qb", assetId: "min-qb-jj-mccarthy", teamId: "min" }],
    };
    const ids = legalTeamsForPlayer(league, berny, []).map((t) => t.id);
    expect(ids).not.toContain("min");
    expect(ids).toContain("lar");
  });

  it("hides globally taken assets but still allows the franchise for someone else", () => {
    const andres: DreamTeam = { playerId: "p1", name: "Andres", picks: [] };
    const menu = legalMenu(league, andres, ["min-wr-justin-jefferson"], "min");
    expect(menu.map((a) => a.id)).not.toContain("min-wr-justin-jefferson");
    expect(menu.map((a) => a.id)).toContain("min-wr-jordan-addison");
  });

  it("does not list a group whose slots are already filled", () => {
    const berny: DreamTeam = {
      playerId: "p0",
      name: "Berny",
      picks: [
        { slotId: "wr1", assetId: "kc-wr-worthy", teamId: "kc" },
        { slotId: "wr2", assetId: "chi-wr-rome", teamId: "chi" },
      ],
    };
    const menu = legalMenu(league, berny, [], "min");
    expect(menu.every((a) => a.group !== "wr")).toBe(true);
  });

  it("keeps a franchise spinable when listed assets are gone, because write-in is open", () => {
    const berny: DreamTeam = {
      playerId: "p0",
      name: "Berny",
      picks: [
        { slotId: "qb", assetId: "kc-qb-mahomes", teamId: "kc" },
        { slotId: "rb", assetId: "atl-rb-bijan", teamId: "atl" },
        { slotId: "wr1", assetId: "kc-wr-worthy", teamId: "kc" },
        { slotId: "wr2", assetId: "chi-wr-rome", teamId: "chi" },
        { slotId: "te", assetId: "lar-te-higbee", teamId: "lar" },
        { slotId: "defPlayer", assetId: "lar-defplayer-aaron-donald", teamId: "lar" },
        { slotId: "def", assetId: "chi-def-unit", teamId: "chi" },
        { slotId: "oline", assetId: "kc-oline-unit", teamId: "kc" },
      ],
    };
    const taken = ["min-coach-oconnell"];
    const ids = legalTeamsForPlayer(league, berny, taken).map((t) => t.id);
    expect(ids).toContain("min");
    expect(ids).toContain("jax");
  });
});
